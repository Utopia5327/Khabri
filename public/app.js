// Global variables
let currentLocation = null;
let photoFile = null;

// DOM elements
const reportForm = document.getElementById('reportForm');
const photoInput = document.getElementById('photo');
const photoPreview = document.getElementById('photoPreview');
const locationInfo = document.getElementById('locationInfo');
const getLocationBtn = document.getElementById('getLocationBtn');
const submitBtn = document.getElementById('submitBtn');
const successModal = document.getElementById('successModal');
const errorModal = document.getElementById('errorModal');
const reportIdSpan = document.getElementById('reportId');
const errorMessage = document.getElementById('errorMessage');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Set up event listeners
    photoInput.addEventListener('change', handlePhotoSelect);
    getLocationBtn.addEventListener('click', getCurrentLocation);
    reportForm.addEventListener('submit', handleFormSubmit);
    
    // Try to get location automatically
    getCurrentLocation();
}

// Handle photo selection
function handlePhotoSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        showError('Please select an image file.');
        return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
        showError('Image size must be less than 5MB.');
        return;
    }

    photoFile = file;
    displayPhotoPreview(file);
    updateSubmitButton();
}

// Display photo preview
function displayPhotoPreview(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        photoPreview.innerHTML = `
            <img src="${e.target.result}" alt="Selected photo">
            <p>Photo selected ✓</p>
        `;
        photoPreview.classList.add('has-image');
    };
    reader.readAsDataURL(file);
}

// Get current location
function getCurrentLocation() {
    updateLocationStatus('Getting your location...', 'loading');
    
    if (!navigator.geolocation) {
        updateLocationStatus('Geolocation is not supported by this browser.', 'error');
        return;
    }

    const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
    };

    navigator.geolocation.getCurrentPosition(
        handleLocationSuccess,
        handleLocationError,
        options
    );
}

// Handle successful location retrieval
function handleLocationSuccess(position) {
    const { latitude, longitude } = position.coords;
    currentLocation = { latitude, longitude };
    
    // Store coordinates in hidden inputs
    document.getElementById('latitude').value = latitude;
    document.getElementById('longitude').value = longitude;
    
    // Get address from coordinates
    getAddressFromCoordinates(latitude, longitude);
    
    updateLocationStatus(`Location captured ✓ (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`, 'success');
    updateSubmitButton();
}

// Handle location error
function handleLocationError(error) {
    let errorMessage = 'Unable to get your location.';
    
    switch(error.code) {
        case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location services.';
            break;
        case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable.';
            break;
        case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
    }
    
    updateLocationStatus(errorMessage, 'error');
    updateSubmitButton();
}

// Get address from coordinates using reverse geocoding
async function getAddressFromCoordinates(latitude, longitude) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
        );
        
        if (response.ok) {
            const data = await response.json();
            const address = data.display_name || '';
            document.getElementById('address').value = address;
        }
    } catch (error) {
        console.log('Could not get address from coordinates:', error);
    }
}

// Update location status display
function updateLocationStatus(message, status) {
    const locationStatus = locationInfo.querySelector('.location-status');
    const icon = locationStatus.querySelector('i');
    
    locationStatus.innerHTML = `
        <i class="fas ${getStatusIcon(status)}"></i>
        <span>${message}</span>
    `;
    
    locationStatus.className = `location-status ${status}`;
}

// Get appropriate icon for status
function getStatusIcon(status) {
    switch(status) {
        case 'loading':
            return 'fa-spinner fa-spin';
        case 'success':
            return 'fa-check-circle';
        case 'error':
            return 'fa-exclamation-circle';
        default:
            return 'fa-map-marker-alt';
    }
}

// Update submit button state
function updateSubmitButton() {
    const hasPhoto = photoFile !== null;
    const hasLocation = currentLocation !== null;
    const hasDescription = document.getElementById('description').value.trim() !== '';
    
    submitBtn.disabled = !(hasPhoto && hasLocation && hasDescription);
    
    if (submitBtn.disabled) {
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i><span>Submit Report</span>';
    } else {
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i><span>Submit Report</span>';
    }
}

// Handle form submission
async function handleFormSubmit(event) {
    event.preventDefault();
    
    if (!photoFile || !currentLocation) {
        showError('Please ensure you have taken a photo and location is available.');
        return;
    }
    
    // Disable form and show loading state
    setFormLoading(true);
    
    try {
        const formData = new FormData();
        formData.append('photo', photoFile);
        formData.append('description', document.getElementById('description').value);
        formData.append('latitude', currentLocation.latitude);
        formData.append('longitude', currentLocation.longitude);
        formData.append('address', document.getElementById('address').value);
        formData.append('reporterInfo', document.getElementById('reporterInfo').value || 'Anonymous');
        
        const response = await fetch('/api/report', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showSuccess(result.report.id);
            resetForm();
        } else {
            throw new Error(result.error || 'Failed to submit report');
        }
        
    } catch (error) {
        console.error('Error submitting report:', error);
        showError(error.message || 'Failed to submit report. Please try again.');
    } finally {
        setFormLoading(false);
    }
}

// Set form loading state
function setFormLoading(loading) {
    submitBtn.disabled = loading;
    if (loading) {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Submitting...</span>';
        reportForm.classList.add('loading');
    } else {
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i><span>Submit Report</span>';
        reportForm.classList.remove('loading');
    }
}

// Reset form
function resetForm() {
    reportForm.reset();
    photoFile = null;
    currentLocation = null;
    photoPreview.innerHTML = '<i class="fas fa-camera"></i><p>Tap to take photo</p>';
    photoPreview.classList.remove('has-image');
    updateLocationStatus('Getting your location...', 'loading');
    updateSubmitButton();
    
    // Try to get location again
    setTimeout(() => {
        getCurrentLocation();
    }, 1000);
}

// Show success modal
function showSuccess(reportId) {
    reportIdSpan.textContent = reportId;
    successModal.style.display = 'block';
}

// Show error modal
function showError(message) {
    errorMessage.textContent = message;
    errorModal.style.display = 'block';
}

// Close modal
function closeModal() {
    successModal.style.display = 'none';
    errorModal.style.display = 'none';
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    if (event.target === successModal || event.target === errorModal) {
        closeModal();
    }
});

// Add real-time validation
document.getElementById('description').addEventListener('input', updateSubmitButton);

// Handle offline/online status
window.addEventListener('online', function() {
    console.log('Application is online');
});

window.addEventListener('offline', function() {
    showError('You are currently offline. Please check your internet connection.');
});

// Service Worker registration disabled to avoid chrome-extension errors
// if ('serviceWorker' in navigator) {
//     window.addEventListener('load', function() {
//         navigator.serviceWorker.register('/sw.js')
//             .then(function(registration) {
//                 console.log('ServiceWorker registration successful');
//             })
//             .catch(function(err) {
//                 console.log('ServiceWorker registration failed');
//             });
//     });
// }

// Add vibration feedback for mobile devices
function vibrate() {
    if ('vibrate' in navigator) {
        navigator.vibrate(100);
    }
}

// Add haptic feedback to buttons
document.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', vibrate);
});

// Prevent form resubmission on page refresh
if (window.history.replaceState) {
    window.history.replaceState(null, null, window.history.href);
} 