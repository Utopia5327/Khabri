// Global variables
let map;
let markers = [];
let heatmapLayer = null;
let reports = [];
let userLocation = null;

// Initialize the map when the page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    loadReports();
    getUserLocation();
});

// Initialize Leaflet map
function initializeMap() {
    // Start with India center as default
    let defaultCenter = [20.5937, 78.9629]; // India center
    let defaultZoom = 5;
    
    // Store user location for later use (but don't center on it immediately)
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                console.log('User location stored for later use');
            },
            function(error) {
                console.log('Could not get user location');
            },
            { timeout: 3000 } // 3 second timeout
        );
    }
    
    map = L.map('map').setView(defaultCenter, defaultZoom);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(map);
    
    // Add custom controls
    addMapControls();
}

// Add custom map controls
function addMapControls() {
    // Zoom control
    L.control.zoom({
        position: 'bottomright'
    }).addTo(map);
    
    // Note: Fullscreen control requires additional plugin
    // For now, we'll skip it to avoid errors
    // To add fullscreen support, include: https://unpkg.com/leaflet.fullscreen@2.4.0/Control.FullScreen.js
}

// Load reports from the API
async function loadReports() {
    try {
        const response = await fetch('/api/reports');
        const data = await response.json();
        
        if (data.success) {
            reports = data.reports;
            console.log(`Loaded ${reports.length} reports from API`);
            displayReports();
            updateStatistics();
        } else {
            throw new Error(data.error || 'Failed to load reports');
        }
    } catch (error) {
        console.error('Error loading reports:', error);
        showError('Failed to load reports. Please try again.');
    }
}

// Display reports on the map and in the list
function displayReports() {
    clearMarkers();
    
    if (reports.length === 0) {
        showNoReports();
        return;
    }
    
    reports.forEach(report => {
        addMarker(report);
    });
    
    updateReportsList();
    
    // Fit map to show all markers if there are any
    if (markers.length > 0) {
        const group = new L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.1));
        console.log(`Map centered on ${markers.length} reports`);
    } else {
        // If no reports, center on India or user location if available
        if (userLocation) {
            map.setView([userLocation.lat, userLocation.lng], 10);
            console.log('Map centered on user location (no reports)');
        } else {
            map.setView([20.5937, 78.9629], 5); // India center
            console.log('Map centered on India (no reports)');
        }
    }
}

// Add a marker for a report
function addMarker(report) {
    const coordinates = report.location.coordinates;
    const lat = coordinates[1];
    const lng = coordinates[0];
    
    console.log(`Adding marker for report ${report.id} at [${lat}, ${lng}]`);
    
    // Create custom icon based on status
    const icon = createStatusIcon(report.status);
    
    const marker = L.marker([lat, lng], { icon: icon })
        .addTo(map)
        .bindPopup(createPopupContent(report));
    
    markers.push(marker);
}

// Create custom icon based on report status
function createStatusIcon(status) {
    const iconColors = {
        'pending': '#ffc107',
        'investigating': '#17a2b8',
        'resolved': '#28a745'
    };
    
    const color = iconColors[status] || '#ffc107';
    
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            background-color: ${color};
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
}

// Create popup content for a marker
function createPopupContent(report) {
    const date = new Date(report.timestamp).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const statusClass = `status-${report.status}`;
    
    return `
        <div class="popup-content" style="min-width: 250px;">
            <div class="popup-header">
                <h4 style="margin: 0 0 10px 0; color: #333;">Report #${report.id.slice(-6)}</h4>
                <span class="report-status ${statusClass}" style="font-size: 0.7rem; padding: 2px 6px;">
                    ${report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                </span>
            </div>
            <p style="margin: 10px 0; color: #666; font-size: 0.9rem;">
                ${report.description}
            </p>
            ${report.imageUrl ? `
                <img src="${report.imageUrl}" alt="Report photo" 
                     style="width: 100%; max-width: 200px; height: 120px; object-fit: cover; border-radius: 5px; margin: 10px 0;">
            ` : ''}
            <div style="font-size: 0.8rem; color: #999; margin-top: 10px;">
                <div>📅 ${date}</div>
                ${report.address ? `<div>📍 ${report.address}</div>` : ''}
                ${report.reporterInfo && report.reporterInfo !== 'Anonymous' ? 
                    `<div>👤 ${report.reporterInfo}</div>` : ''}
            </div>
        </div>
    `;
}

// Update the reports list
function updateReportsList() {
    const reportsList = document.getElementById('reportsList');
    
    if (reports.length === 0) {
        reportsList.innerHTML = `
            <div class="no-reports">
                <i class="fas fa-inbox"></i>
                <p>No reports found</p>
            </div>
        `;
        return;
    }
    
    // Sort reports by date (newest first)
    const sortedReports = [...reports].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    // Show only the 10 most recent reports
    const recentReports = sortedReports.slice(0, 10);
    
    reportsList.innerHTML = recentReports.map(report => createReportListItem(report)).join('');
}

// Create a report list item
function createReportListItem(report) {
    const date = new Date(report.timestamp).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const statusClass = `status-${report.status}`;
    
    return `
        <div class="report-item" onclick="focusOnReport('${report.id}')">
            <div class="report-header">
                <span class="report-date">${date}</span>
                <span class="report-status ${statusClass}">
                    ${report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                </span>
            </div>
            <div class="report-description">
                ${report.description.length > 100 ? 
                    report.description.substring(0, 100) + '...' : 
                    report.description}
            </div>
            ${report.imageUrl ? `
                <img src="${report.imageUrl}" alt="Report photo" class="report-image">
            ` : ''}
            ${report.address ? `
                <div class="report-location">
                    <i class="fas fa-map-marker-alt"></i> ${report.address}
                </div>
            ` : ''}
        </div>
    `;
}

// Focus on a specific report
function focusOnReport(reportId) {
    const report = reports.find(r => r.id === reportId);
    if (report) {
        const coordinates = report.location.coordinates;
        const lat = coordinates[1];
        const lng = coordinates[0];
        
        map.setView([lat, lng], 16);
        
        // Find and open the marker popup
        const marker = markers.find(m => {
            const markerLatLng = m.getLatLng();
            return markerLatLng.lat === lat && markerLatLng.lng === lng;
        });
        
        if (marker) {
            marker.openPopup();
        }
    }
}

// Update statistics
function updateStatistics() {
    const total = reports.length;
    const pending = reports.filter(r => r.status === 'pending').length;
    const investigating = reports.filter(r => r.status === 'investigating').length;
    const resolved = reports.filter(r => r.status === 'resolved').length;
    
    document.getElementById('totalReports').textContent = total;
    document.getElementById('pendingReports').textContent = pending;
    document.getElementById('investigatingReports').textContent = investigating;
    document.getElementById('resolvedReports').textContent = resolved;
}

// Clear all markers
function clearMarkers() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
}

// Show no reports message
function showNoReports() {
    document.getElementById('reportsList').innerHTML = `
        <div class="no-reports">
            <i class="fas fa-inbox"></i>
            <p>No reports found</p>
            <p style="font-size: 0.9rem; margin-top: 10px;">
                Be the first to report drug abuse in your area!
            </p>
        </div>
    `;
}

// Get user's current location
function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                // Add user location marker
                const userIcon = L.divIcon({
                    className: 'user-marker',
                    html: `<div style="
                        background-color: #138808;
                        width: 15px;
                        height: 15px;
                        border-radius: 50%;
                        border: 3px solid white;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                    "></div>`,
                    iconSize: [15, 15],
                    iconAnchor: [7.5, 7.5]
                });
                
                L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
                    .addTo(map)
                    .bindPopup('Your current location')
                    .openPopup();
            },
            function(error) {
                console.log('Could not get user location:', error);
            }
        );
    }
}

// Center map on user location
function centerOnUser() {
    if (userLocation) {
        map.setView([userLocation.lat, userLocation.lng], 14);
    } else {
        getUserLocation();
    }
}

// Toggle heatmap view
function toggleHeatmap() {
    if (heatmapLayer) {
        map.removeLayer(heatmapLayer);
        heatmapLayer = null;
    } else {
        // Create heatmap data
        const heatmapData = reports.map(report => {
            const coords = report.location.coordinates;
            return [coords[1], coords[0], 1]; // [lat, lng, intensity]
        });
        
        // Simple heatmap implementation using circle markers
        heatmapLayer = L.layerGroup();
        
        heatmapData.forEach(point => {
            const circle = L.circle([point[0], point[1]], {
                color: 'red',
                fillColor: '#f03',
                fillOpacity: 0.3,
                radius: 100
            }).addTo(heatmapLayer);
        });
        
        heatmapLayer.addTo(map);
    }
}

// Refresh data
function refreshData() {
    loadReports();
}

// Show error message
function showError(message) {
    document.getElementById('reportsList').innerHTML = `
        <div class="no-reports">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${message}</p>
            <button class="btn-secondary" onclick="refreshData()" style="margin-top: 15px;">
                <i class="fas fa-sync-alt"></i> Try Again
            </button>
        </div>
    `;
}

// Auto-refresh every 30 seconds
setInterval(refreshData, 30000);

// Handle window resize
window.addEventListener('resize', function() {
    setTimeout(() => {
        map.invalidateSize();
    }, 100);
});

// Add keyboard shortcuts
document.addEventListener('keydown', function(event) {
    switch(event.key) {
        case 'r':
        case 'R':
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                refreshData();
            }
            break;
        case 'h':
        case 'H':
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                toggleHeatmap();
            }
            break;
        case 'l':
        case 'L':
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                centerOnUser();
            }
            break;
    }
});

// Add touch gestures for mobile
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', function(event) {
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
});

document.addEventListener('touchend', function(event) {
    if (!touchStartX || !touchStartY) return;
    
    const touchEndX = event.changedTouches[0].clientX;
    const touchEndY = event.changedTouches[0].clientY;
    
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;
    
    // Swipe down to refresh
    if (Math.abs(diffY) > Math.abs(diffX) && diffY > 50) {
        refreshData();
    }
    
    touchStartX = 0;
    touchStartY = 0;
}); 