let capturedLatitude = null;
let capturedLongitude = null;
let locationSource = 'manual';

function showReportStatus(message, isSuccess) {
    const statusEl = document.getElementById('reportStatus');
    if (!statusEl) return;

    statusEl.textContent = message;
    statusEl.className = `report-status ${isSuccess ? 'success' : 'error'}`;
}

function updateLocationPreview(latitude, longitude) {
    const previewEl = document.getElementById('locationPreview');
    const mapsLinkEl = document.getElementById('mapsLink');

    if (previewEl) {
        previewEl.textContent = `GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
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

async function submitIncidentReport(event) {
    event.preventDefault();

    const reporterName = document.getElementById('reporterName').value.trim();
    const reporterEmail = document.getElementById('reporterEmail').value.trim();
    const reporterPhone = document.getElementById('reporterPhone').value.trim();
    const reportType = document.getElementById('reportType').value;
    const severity = document.getElementById('severity').value;
    const locationLabel = document.getElementById('locationLabel').value.trim();
    const description = document.getElementById('description').value.trim();

    if (!reporterName || !reporterEmail || !reportType || !description) {
        showReportStatus('Please fill all required fields.', false);
        return;
    }

    if (!reporterEmail.includes('@')) {
        showReportStatus('Please enter a valid email address.', false);
        return;
    }

    if (description.length < 20) {
        showReportStatus('Description should be at least 20 characters.', false);
        return;
    }

    const payload = {
        reporterName,
        reporterEmail,
        reporterPhone,
        reportType,
        severity,
        description,
        locationLabel,
        latitude: capturedLatitude,
        longitude: capturedLongitude,
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

        const previewEl = document.getElementById('locationPreview');
        const mapsLinkEl = document.getElementById('mapsLink');
        if (previewEl) previewEl.textContent = 'No GPS captured yet';
        if (mapsLinkEl) mapsLinkEl.style.display = 'none';
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
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReportPage);
} else {
    initReportPage();
}
