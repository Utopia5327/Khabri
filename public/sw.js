// Minimal service worker - no caching to avoid chrome-extension errors
console.log('Service worker loaded (minimal version)');

// Install event - do nothing
self.addEventListener('install', event => {
  console.log('Service worker installed');
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service worker activated');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          console.log('Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
});

// Fetch event - pass through all requests (no caching)
self.addEventListener('fetch', event => {
  // Do nothing - let the browser handle all requests normally
  return;
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Background sync for offline reports
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Handle push notifications (for future use)
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'New drug abuse report in your area',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Report'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('DrugFree India', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/map')
    );
  }
});

// Background sync function
async function doBackgroundSync() {
  try {
    // Get stored offline reports
    const offlineReports = await getOfflineReports();
    
    for (const report of offlineReports) {
      try {
        await submitReport(report);
        await removeOfflineReport(report.id);
      } catch (error) {
        console.error('Failed to sync report:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Store offline report
async function storeOfflineReport(report) {
  const db = await openDB();
  const tx = db.transaction('offlineReports', 'readwrite');
  const store = tx.objectStore('offlineReports');
  await store.add(report);
}

// Get all offline reports
async function getOfflineReports() {
  const db = await openDB();
  const tx = db.transaction('offlineReports', 'readonly');
  const store = tx.objectStore('offlineReports');
  return await store.getAll();
}

// Remove offline report after successful sync
async function removeOfflineReport(id) {
  const db = await openDB();
  const tx = db.transaction('offlineReports', 'readwrite');
  const store = tx.objectStore('offlineReports');
  await store.delete(id);
}

// Open IndexedDB
async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('DrugFreeIndiaDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      
      // Create object store for offline reports
      if (!db.objectStoreNames.contains('offlineReports')) {
        const store = db.createObjectStore('offlineReports', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// Submit report to server
async function submitReport(report) {
  const formData = new FormData();
  
  // Convert base64 image back to file
  if (report.photoData) {
    const response = await fetch(report.photoData);
    const blob = await response.blob();
    formData.append('photo', blob, 'photo.jpg');
  }
  
  formData.append('description', report.description);
  formData.append('latitude', report.latitude);
  formData.append('longitude', report.longitude);
  formData.append('address', report.address || '');
  formData.append('reporterInfo', report.reporterInfo || 'Anonymous');
  
  const response = await fetch('/api/report', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error('Failed to submit report');
  }
  
  return response.json();
}

// Message handler for communication with main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'STORE_OFFLINE_REPORT') {
    event.waitUntil(storeOfflineReport(event.data.report));
  }
}); 