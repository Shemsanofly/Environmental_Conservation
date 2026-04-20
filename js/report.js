let capturedLatitude = null;
let capturedLongitude = null;
let locationSource = 'manual';
let selectedImageDataUrl = '';
let selectedImageName = '';
let selectedImageMimeType = '';

function showReportStatus(message, isSuccess) {
    const statusEl = document.getElementById('reportStatus');
    if (!statusEl) return;

    statusEl.textContent = message;
    statusEl.className = `report-status ${isSuccess ? 'success' : 'error'}`;
}

function updateLocationPreview(latitude, longitude) {
    const previewEl = document.getElementById('locationPreview');
    const mapsLinkEl = document.getElementById('mapsLink');
    const latitudeInput = document.getElementById('latitude');
    const longitudeInput = document.getElementById('longitude');

    if (previewEl) {
        previewEl.textContent = `GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    }

    if (latitudeInput) {
        latitudeInput.value = String(latitude);
    }

    if (longitudeInput) {
        longitudeInput.value = String(longitude);
    }

    if (mapsLinkEl) {
        mapsLinkEl.href = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;
        mapsLinkEl.style.display = 'inline';
    }
}

function captureLocation() {
    if (!navigator.geolocation) {
        showReportStatus('Geolocation is not supported by this browser. You can still submit with manual location.', false);
        return;
    }

    const button = document.getElementById('captureLocationBtn');
    if (button) {
        button.disabled = true;
        button.textContent = 'Capturing...';
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            capturedLatitude = position.coords.latitude;
            capturedLongitude = position.coords.longitude;
            locationSource = 'gps';

            updateLocationPreview(capturedLatitude, capturedLongitude);
            showReportStatus('Location captured successfully.', true);

            if (button) {
                button.disabled = false;
                button.textContent = 'Use My Current Location';
            }
        },
        () => {
            showReportStatus('Unable to capture location. Please check browser permissions.', false);
            if (button) {
                button.disabled = false;
                button.textContent = 'Use My Current Location';
            }
        },
        { enableHighAccuracy: true, timeout: 12000 }
    );
}

function handleImageSelection(event) {
    const file = event && event.target && event.target.files ? event.target.files[0] : null;
    const previewText = document.getElementById('imagePreviewText');

    selectedImageDataUrl = '';
    selectedImageName = '';
    selectedImageMimeType = '';

    if (!file) {
        if (previewText) {
            previewText.textContent = 'No image selected';
        }
        return;
    }

    if (!String(file.type || '').startsWith('image/')) {
        showReportStatus('Please choose a valid image file.', false);
        event.target.value = '';
        if (previewText) {
            previewText.textContent = 'No image selected';
        }
        return;
    }

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
        showReportStatus('Image is too large. Maximum allowed size is 5MB.', false);
        event.target.value = '';
        if (previewText) {
            previewText.textContent = 'No image selected';
        }
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        selectedImageDataUrl = String(reader.result || '');
        selectedImageName = String(file.name || 'incident-image');
        selectedImageMimeType = String(file.type || 'image/jpeg');
        if (previewText) {
            const kb = Math.max(1, Math.round(file.size / 1024));
            previewText.textContent = `${selectedImageName} (${kb} KB)`;
        }
    };
    reader.onerror = () => {
        showReportStatus('Failed to read the selected image. Please try another file.', false);
        event.target.value = '';
        if (previewText) {
            previewText.textContent = 'No image selected';
        }
    };
    reader.readAsDataURL(file);
}

function parseCoordinate(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

async function submitIncidentReport(event) {
    event.preventDefault();

    const reportTitle = document.getElementById('reportTitle').value.trim();
    const latitudeValue = document.getElementById('latitude').value;
    const longitudeValue = document.getElementById('longitude').value;
    const description = document.getElementById('description').value.trim();
    const latitude = parseCoordinate(latitudeValue);
    const longitude = parseCoordinate(longitudeValue);

    if (!reportTitle || !description) {
        showReportStatus('Please fill all required fields.', false);
        return;
    }

    if (reportTitle.length < 5) {
        showReportStatus('Title should be at least 5 characters.', false);
        return;
    }

    if (description.length < 20) {
        showReportStatus('Description should be at least 20 characters.', false);
        return;
    }

    if (!selectedImageDataUrl || !selectedImageMimeType) {
        showReportStatus('Please upload an image before submitting the report.', false);
        return;
    }

    if (latitude === null || latitude < -90 || latitude > 90) {
        showReportStatus('Please enter a valid latitude between -90 and 90.', false);
        return;
    }

    if (longitude === null || longitude < -180 || longitude > 180) {
        showReportStatus('Please enter a valid longitude between -180 and 180.', false);
        return;
    }

    const payload = {
        title: reportTitle,
        description,
        imageDataUrl: selectedImageDataUrl,
        imageName: selectedImageName,
        imageMimeType: selectedImageMimeType,
        latitude,
        longitude,
        locationSource
    };

    try {
        const response = await fetch('/api/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            showReportStatus(data.error || 'Failed to submit report.', false);
            return;
        }

        showReportStatus('Report submitted. Our response team has received it.', true);
        document.getElementById('incidentReportForm').reset();
        capturedLatitude = null;
        capturedLongitude = null;
        locationSource = 'manual';
        selectedImageDataUrl = '';
        selectedImageName = '';
        selectedImageMimeType = '';

        const previewEl = document.getElementById('locationPreview');
        const mapsLinkEl = document.getElementById('mapsLink');
        const imagePreviewText = document.getElementById('imagePreviewText');
        if (previewEl) previewEl.textContent = 'No GPS captured yet';
        if (mapsLinkEl) mapsLinkEl.style.display = 'none';
        if (imagePreviewText) imagePreviewText.textContent = 'No image selected';
    } catch (error) {
        showReportStatus('Cannot reach server right now. Please try again shortly.', false);
    }
}

function initReportPage() {
    const button = document.getElementById('captureLocationBtn');
    if (button) {
        button.addEventListener('click', captureLocation);
    }

    const form = document.getElementById('incidentReportForm');
    if (form) {
        form.addEventListener('submit', submitIncidentReport);
    }

    const imageInput = document.getElementById('reportImage');
    if (imageInput) {
        imageInput.addEventListener('change', handleImageSelection);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReportPage);
} else {
    initReportPage();
}
