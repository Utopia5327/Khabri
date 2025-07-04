const CACHE_NAME = 'drugfree-india-v1';
const urlsToCache = [
  '/',
  '/map',
  '/styles.css',
  '/app.js',
  '/map.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        
        // Clone the request because it's a stream
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(response => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response because it's a stream
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
  );
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
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Report',
        icon: '/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icon-192x192.png'
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