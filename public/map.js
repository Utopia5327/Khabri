// Global variables
let map;
let heatmapLayer = null;
let heatmapData = [];
let userLocation = null;
let mapMode = 'heat'; // 'heat' or 'marker'
let markerLayer = null;
let mapboxToken = 'pk.eyJ1IjoibWI1MzI3IiwiYSI6ImNsejY0NnQ1cjBmcW8ya29waDlwaTIxa3MifQ.L9_SqJiqej3tbr_P-YOCIQ';
let baseLayer = null;

// Initialize the map when the page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    loadHeatmapData();
    getUserLocation();
});

// Initialize Leaflet map
function initializeMap() {
    let defaultCenter = [22.9734, 78.6569]; // Center of India
    let defaultZoom = 5;
    map = L.map('map').setView(defaultCenter, defaultZoom);
    setBaseLayer();
    addMapControls();
}

// Add custom map controls
function addMapControls() {
    // Zoom control
    L.control.zoom({
        position: 'bottomright'
    }).addTo(map);
}

// Load heat map data from the API
async function loadHeatmapData() {
    try {
        const response = await fetch('/api/heatmap');
        const data = await response.json();
        
        if (data.success) {
            heatmapData = data.data;
            console.log(`Loaded ${heatmapData.length} heat map points`);
            updateMapDisplay();
            updateStatistics();
        } else {
            throw new Error(data.error || 'Failed to load heat map data');
        }
    } catch (error) {
        console.error('Error loading heat map data:', error);
        showError('Failed to load heat map data. Please try again.');
    }
}

// Load statistics from the API
async function loadStatistics() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        
        if (data.success) {
            return data.stats;
        } else {
            throw new Error(data.error || 'Failed to load statistics');
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
        return null;
    }
}

// Display heat map on the map
function displayHeatmap() {
    if (heatmapLayer) {
        map.removeLayer(heatmapLayer);
    }
    if (heatmapData.length === 0) {
        addDummyData();
        if (heatmapData.length === 0) {
            showNoData();
            return;
        }
    }
    // Brighter, more visible heatmap for dark background
    const heatData = heatmapData.map(point => [
        point.lat,
        point.lng,
        Math.max(0.5, point.intensity / 10) // boost minimum intensity
    ]);
    heatmapLayer = L.heatLayer(heatData, {
        radius: 40,
        blur: 30,
        maxZoom: 10,
        minOpacity: 0.5, // makes low values more visible
        gradient: {
            0.0: '#00eaff',   // bright cyan for low
            0.3: '#00bfff',   // lighter blue
            0.5: '#00ff99',   // greenish
            0.7: '#ffff00',   // yellow
            1.0: '#ff0000'    // red
        }
    }).addTo(map);
    // Only fit bounds if all points are in India (roughly between lat 6-37, lng 68-97)
    const allInIndia = heatmapData.every(point =>
        point.lat >= 6 && point.lat <= 37 && point.lng >= 68 && point.lng <= 97
    );
    if (allInIndia && heatmapData.length > 0) {
        const bounds = L.latLngBounds(heatmapData.map(point => [point.lat, point.lng]));
        map.fitBounds(bounds.pad(0.1));
    } else {
        map.setView([22.9734, 78.6569], 5);
    }
}

// Get color based on intensity (blue to red gradient)
function getHeatmapColor(intensity) {
    // Normalize intensity to 0-1 range (assuming max intensity is 10)
    const normalized = Math.min(intensity / 10, 1);
    
    // Create gradient from blue to red
    if (normalized <= 0.2) {
        // Blue to cyan
        const factor = normalized / 0.2;
        return `rgb(0, ${Math.round(102 + factor * 153)}, ${Math.round(255 - factor * 51)})`;
    } else if (normalized <= 0.4) {
        // Cyan to yellow
        const factor = (normalized - 0.2) / 0.2;
        return `rgb(${Math.round(factor * 255)}, 255, ${Math.round(204 - factor * 204)})`;
    } else if (normalized <= 0.6) {
        // Yellow to orange
        const factor = (normalized - 0.4) / 0.2;
        return `rgb(255, ${Math.round(255 - factor * 153)}, 0)`;
    } else if (normalized <= 0.8) {
        // Orange to red-orange
        const factor = (normalized - 0.6) / 0.2;
        return `rgb(255, ${Math.round(102 - factor * 102)}, 0)`;
    } else {
        // Red-orange to red
        const factor = (normalized - 0.8) / 0.2;
        return `rgb(255, ${Math.round(factor * 51)}, 0)`;
    }
}

// Get radius based on intensity
function getHeatmapRadius(intensity) {
    // Base radius of 200 meters, scale with intensity for better visibility at country level
    return Math.max(200, Math.min(2000, intensity * 200));
}

// Create popup content for heat map points
function createHeatmapPopup(point) {
    const totalReports = point.count;
    const recentReports = point.recent;
    
    return `
        <div class="popup-content" style="min-width: 200px;">
            <h4 style="margin: 0 0 10px 0; color: #333;">Area Activity</h4>
            <div style="margin: 10px 0;">
                <div><strong>Total Reports:</strong> ${totalReports}</div>
                <div><strong>Recent (30 days):</strong> ${recentReports}</div>
                <div><strong>Intensity Level:</strong> ${Math.round(point.intensity * 10) / 10}/10</div>
            </div>
            <div style="font-size: 0.8rem; color: #666; margin-top: 10px;">
                <div>📍 ${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}</div>
            </div>
        </div>
    `;
}

// Update statistics display
async function updateStatistics() {
    // --- DUMMY DATA LOGIC: REMOVE BEFORE PRODUCTION ---
    const dummyCities = [
        { lat: 28.6139, lng: 77.2090 }, // Delhi
        { lat: 19.0760, lng: 72.8777 }, // Mumbai
        { lat: 26.9124, lng: 75.7873 }, // Jaipur
        { lat: 15.2993, lng: 74.1240 }  // Goa
    ];
    const isDummy =
        heatmapData.length === 4 &&
        heatmapData.every((pt, i) =>
            Math.abs(pt.lat - dummyCities[i].lat) < 0.01 &&
            Math.abs(pt.lng - dummyCities[i].lng) < 0.01
        );
    if (isDummy) {
        // Use the already-set dummy stats
        document.getElementById('totalLocations').textContent = heatmapData.length;
        // totalReports and recentReports are already set by addDummyData
        return;
    }
    // --- END DUMMY DATA LOGIC ---
    const stats = await loadStatistics();
    if (stats) {
        document.getElementById('totalReports').textContent = stats.total;
        document.getElementById('recentReports').textContent = stats.recent;
        document.getElementById('totalLocations').textContent = heatmapData.length;
    } else {
        // Fallback to heat map data only
        document.getElementById('totalReports').textContent = '-';
        document.getElementById('recentReports').textContent = '-';
        document.getElementById('totalLocations').textContent = heatmapData.length;
    }
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
                console.log('User location stored');
                if (userLocation && !isLocationInIndia(userLocation.lat, userLocation.lng)) {
                    showLocationRestrictionModal();
                }
            },
            function(error) {
                console.log('Could not get user location:', error);
            },
            { timeout: 3000 }
        );
    }
}

// Center map on user location
function centerOnUser() {
    if (userLocation) {
        map.setView([userLocation.lat, userLocation.lng], 14);
        
        // Add user location marker if not already present
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
    } else {
        getUserLocation();
    }
}

// Refresh data
function refreshData() {
    loadHeatmapData();
    // Reset to India view after refresh
    map.setView([20.5937, 78.9629], 5);
}

// Show no data message
function showNoData() {
    // Create a simple message on the map
    const noDataDiv = L.divIcon({
        className: 'no-data-message',
        html: `<div style="
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            text-align: center;
            font-size: 1.1rem;
            color: #666;
        ">
            <i class="fas fa-inbox" style="font-size: 2rem; color: #ccc; margin-bottom: 10px;"></i>
            <div>No reports found</div>
            <div style="font-size: 0.9rem; margin-top: 5px;">Be the first to report drug abuse in your area!</div>
        </div>`,
        iconSize: [300, 100],
        iconAnchor: [150, 50]
    });
    
    L.marker([20.5937, 78.9629], { icon: noDataDiv }).addTo(map);
}

// Show error message
function showError(message) {
    const errorDiv = L.divIcon({
        className: 'error-message',
        html: `<div style="
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            text-align: center;
            font-size: 1.1rem;
            color: #d32f2f;
        ">
            <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px;"></i>
            <div>${message}</div>
            <button onclick="refreshData()" style="
                margin-top: 15px;
                padding: 8px 16px;
                background: #138808;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
            ">
                <i class="fas fa-sync-alt"></i> Try Again
            </button>
        </div>`,
        iconSize: [300, 120],
        iconAnchor: [150, 60]
    });
    
    L.marker([20.5937, 78.9629], { icon: errorDiv }).addTo(map);
}

// Auto-refresh every 60 seconds
setInterval(refreshData, 60000);

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
        case 'l':
        case 'L':
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                centerOnUser();
            }
            break;
    }
});

// --- DUMMY DATA GENERATION FOR TESTING ---
function addDummyData() {
    // Only add if no real data
    if (heatmapData.length > 0) return;
    // Major Indian cities: Delhi, Mumbai, Jaipur, Goa
    const cities = [
        { name: 'Delhi', lat: 28.6139, lng: 77.2090 },
        { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
        { name: 'Jaipur', lat: 26.9124, lng: 75.7873 },
        { name: 'Goa', lat: 15.2993, lng: 74.1240 }
    ];
    let totalReports = 0;
    let recentReports = 0;
    cities.forEach(city => {
        const count = Math.floor(Math.random() * 10) + 5; // 5-14
        const recent = Math.floor(Math.random() * 5) + 1;  // 1-5
        totalReports += count;
        recentReports += recent;
        heatmapData.push({
            lat: city.lat,
            lng: city.lng,
            count,
            recent,
            intensity: Math.random() * 5 + 5,           // 5-10
            statuses: { pending: 0, investigating: 0, resolved: 0 }
        });
    });
    // Set dummy statistics
    if (document.getElementById('totalReports')) {
        document.getElementById('totalReports').textContent = totalReports;
    }
    if (document.getElementById('recentReports')) {
        document.getElementById('recentReports').textContent = recentReports;
    }
}

function toggleHeatMapMode() {
    mapMode = mapMode === 'heat' ? 'marker' : 'heat';
    updateMapDisplay();
    // Update button label
    const btn = document.getElementById('toggleHeatBtn');
    if (mapMode === 'heat') {
        btn.innerHTML = '<i class="fas fa-fire"></i> Toggle Heat Map';
    } else {
        btn.innerHTML = '<i class="fas fa-dot-circle"></i> Toggle Heat Map';
    }
}

function setBaseLayer() {
    if (baseLayer) {
        map.removeLayer(baseLayer);
    }
    let styleId = mapMode === 'heat'
        ? 'cmcqoyky600le01qv9vxx79wt' // dark style for heatmap
        : 'clz64nvdk02ze01pa4pfih7ka'; // default style for markers
    baseLayer = L.tileLayer(
        `https://api.mapbox.com/styles/v1/mb5327/${styleId}/tiles/256/{z}/{x}/{y}@2x?access_token=${mapboxToken}`,
        {
            attribution: '© Mapbox © OpenStreetMap',
            maxZoom: 18,
            tileSize: 512,
            zoomOffset: -1
        }
    ).addTo(map);
}

function updateMapDisplay() {
    setBaseLayer();
    if (heatmapLayer) map.removeLayer(heatmapLayer);
    if (markerLayer) map.removeLayer(markerLayer);
    if (mapMode === 'heat') {
        displayHeatmap();
    } else {
        displayMarkers();
    }
}

function getHeatmapCircleColor(intensity) {
    // Use the same gradient as the heatmap
    // 0.0: #00eaff, 0.3: #00bfff, 0.5: #00ff99, 0.7: #ffff00, 1.0: #ff0000
    const stops = [
        { stop: 0.0, color: [0,234,255] },   // #00eaff
        { stop: 0.3, color: [0,191,255] },   // #00bfff
        { stop: 0.5, color: [0,255,153] },   // #00ff99
        { stop: 0.7, color: [255,255,0] },   // #ffff00
        { stop: 1.0, color: [255,0,0] }      // #ff0000
    ];
    const t = Math.max(0, Math.min(1, intensity / 10));
    for (let i = 1; i < stops.length; i++) {
        if (t <= stops[i].stop) {
            const prev = stops[i-1];
            const next = stops[i];
            const localT = (t - prev.stop) / (next.stop - prev.stop);
            const r = Math.round(prev.color[0] + (next.color[0] - prev.color[0]) * localT);
            const g = Math.round(prev.color[1] + (next.color[1] - prev.color[1]) * localT);
            const b = Math.round(prev.color[2] + (next.color[2] - prev.color[2]) * localT);
            return `rgb(${r},${g},${b})`;
        }
    }
    return 'rgb(255,0,0)';
}

function displayMarkers() {
    if (markerLayer) map.removeLayer(markerLayer);
    if (heatmapData.length === 0) {
        addDummyData();
        if (heatmapData.length === 0) {
            showNoData();
            return;
        }
    }
    markerLayer = L.layerGroup();
    heatmapData.forEach(point => {
        // Dot size grows with count (min 10, max 50)
        const size = Math.max(10, Math.min(50, point.count * 5));
        const color = getHeatmapCircleColor(point.intensity);
        const marker = L.circleMarker([point.lat, point.lng], {
            radius: size,
            color: color,
            fillColor: color,
            fillOpacity: 0.5,
            weight: 1
        }).addTo(markerLayer);
        marker.bindPopup(createHeatmapPopup(point));
    });
    markerLayer.addTo(map);
    const bounds = L.latLngBounds(heatmapData.map(point => [point.lat, point.lng]));
    map.fitBounds(bounds.pad(0.1));
}

function showLocationRestrictionModal() {
    let modal = document.getElementById('locationRestrictionModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'locationRestrictionModal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.5)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '9999';
        modal.innerHTML = `
            <div style="background: #fff; padding: 32px 24px; border-radius: 16px; max-width: 400px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.15);">
                <h2 style="color: #F97316; margin-bottom: 16px;">Location Restricted</h2>
                <p style="color: #1E293B; font-size: 1.1rem;">This feature is only available within India.<br>Your current location is outside India.</p>
                <button onclick="document.getElementById('locationRestrictionModal').remove()" style="margin-top: 18px; padding: 10px 24px; background: #F97316; color: #fff; border: none; border-radius: 8px; font-weight: 700; font-size: 1rem; cursor: pointer;">Close</button>
            </div>
        `;
        document.body.appendChild(modal);
    }
} 