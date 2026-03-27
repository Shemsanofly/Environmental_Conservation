/**
 * Donation and Sponsorship Form Handler
 * Handles donation processing, form validation, and payment integration
 */

// ===================================
// TAB SWITCHING
// ===================================

function switchTab(tabName, event) {
    if (event) {
        event.preventDefault();
    }

    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // Add active class to clicked button
    if (event && event.target) {
        event.target.classList.add('active');
    }
}

// ===================================
// PAYMENT VALIDATION
// ===================================

function validateDonorEmail() {
    const email = document.getElementById('donorEmail').value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePaymentMethod() {
    const method = document.getElementById('paymentMethod').value;
    return method && method.length > 0;
}

function showPaymentMessage(message, isSuccess = true) {
    const statusDiv = document.getElementById('paymentStatus');
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = `payment-status ${isSuccess ? 'success' : 'error'}`;
        statusDiv.style.display = 'block';
        
        if (isSuccess) {
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 5000);
        }
    }
}

function clearPaymentMessage() {
    const statusDiv = document.getElementById('paymentStatus');
    if (!statusDiv) return;
    statusDiv.textContent = '';
    statusDiv.className = 'payment-status';
    statusDiv.style.display = 'none';
}

async function handlePaymentReturnStatus() {
    const params = new URLSearchParams(window.location.search);
    const status = String(params.get('status') || '').toLowerCase();
    const txRef = params.get('tx_ref') || params.get('txRef');

    if (!status && !txRef) {
        return;
    }

    if (['cancelled', 'failed', 'error'].includes(status)) {
        showPaymentMessage('Payment was not completed. Please try again.', false);
        return;
    }

    if (txRef) {
        try {
            const response = await fetch(`/api/payments/verify/${encodeURIComponent(txRef)}`);
            if (response.ok) {
                const verification = await response.json();
                if (verification && verification.status === 'success') {
                    showPaymentMessage('🎉 Congratulations! You donated successfully. Thank you for supporting our conservation mission.', true);
                    return;
                }
            }
        } catch (error) {
            // If verification fails, still continue with status check fallback below.
        }
    }

    if (['success', 'successful', 'completed', 'complete'].includes(status)) {
        showPaymentMessage('🎉 Congratulations! Your donation was successful.', true);
    }
}

// ===================================
// DONATION PROCESSING
// ===================================

async function processDonation(amount) {
    clearPaymentMessage();

    if (!validateDonorEmail()) {
        showPaymentMessage('Please enter a valid email address', false);
        return;
    }

    if (!validatePaymentMethod()) {
        showPaymentMessage('Please select a payment method', false);
        return;
    }

    const donorName = document.getElementById('donorName').value.trim();
    const donorEmail = document.getElementById('donorEmail').value.trim();
    const donorPhone = document.getElementById('donorPhone').value.trim();
    const paymentMethod = document.getElementById('paymentMethod').value;
    const currency = document.getElementById('currencySelect').value;
    const recurringCheckbox = document.getElementById('isRecurring');
    const isRecurring = recurringCheckbox ? recurringCheckbox.checked : false;

    try {
        showPaymentMessage('Processing your donation...');
        
        const response = await fetch('/api/payments/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount,
                currency,
                paymentMethod,
                donorName: donorName || 'Anonymous',
                donorEmail,
                donorPhone,
                isRecurring
            })
        });

        const data = await response.json();

        if (!response.ok) {
            showPaymentMessage(`Error: ${data.error || 'Payment processing failed'}`, false);
            return;
        }

        if (data.link) {
            // Redirect to payment gateway
            showPaymentMessage('Redirecting to payment gateway...');
            setTimeout(() => {
                window.location.href = data.link;
            }, 1500);
        } else if (data.ok) {
            showPaymentMessage(`✓ Thank you! Donation of $${amount} recorded. A confirmation has been sent to ${donorEmail}`);
            
            // Reset form
            setTimeout(() => {
                document.getElementById('donorName').value = '';
                document.getElementById('donorEmail').value = '';
                document.getElementById('donorPhone').value = '';
                document.getElementById('paymentMethod').value = '';
            }, 2000);
        }
    } catch (error) {
        showPaymentMessage(`Error: ${error.message}`, false);
    }
}

async function processCustomDonation() {
    const customAmount = parseFloat(document.getElementById('customAmount').value);

    if (!Number.isFinite(customAmount) || customAmount < 1) {
        showPaymentMessage('Please enter a valid donation amount', false);
        return;
    }

    await processDonation(customAmount);
}

// ===================================
// SPONSOR PROCESSING
// ===================================

async function processSponsor(sponsorType, amount) {
    clearPaymentMessage();

    if (!validateDonorEmail()) {
        showPaymentMessage('Please enter a valid email address', false);
        return;
    }

    const donorName = document.getElementById('donorName').value.trim();
    const donorEmail = document.getElementById('donorEmail').value.trim();
    const donorPhone = document.getElementById('donorPhone').value.trim();
    const paymentMethod = document.getElementById('paymentMethod').value;
    const currency = document.getElementById('currencySelect').value;
    const recurringCheckbox = document.getElementById('isRecurring');
    const isRecurring = recurringCheckbox ? recurringCheckbox.checked : false;

    try {
        showPaymentMessage(`Processing ${sponsorType} Sponsor registration...`);

        const response = await fetch('/api/payments/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount,
                currency,
                paymentMethod: paymentMethod || 'banktransfer',
                donorName: donorName || sponsorType,
                donorEmail,
                donorPhone,
                sponsorType,
                isRecurring
            })
        });

        const data = await response.json();

        if (!response.ok) {
            showPaymentMessage(`Error: ${data.error || 'Sponsorship processing failed'}`, false);
            return;
        }

        if (data.link) {
            showPaymentMessage('Redirecting to payment gateway...');
            setTimeout(() => {
                window.location.href = data.link;
            }, 1500);
        } else if (data.ok) {
            showPaymentMessage(`✓ Thank you for becoming a ${sponsorType} Sponsor! We'll send details to ${donorEmail}`);
        }
    } catch (error) {
        showPaymentMessage(`Error: ${error.message}`, false);
    }
}

// ===================================
// FORM INITIALIZATION
// ===================================

function initDonationForm() {
    // Set first tab as active by default
    document.getElementById('donate').classList.add('active');
    document.querySelectorAll('.tab-btn')[0].classList.add('active');

    // Add event listeners to buttons
    document.querySelectorAll('.donation-btn').forEach(btn => {
        if (!btn.onclick) {
            btn.addEventListener('click', function() {
                // Prevent default if no onclick handler
            });
        }
    });

    // Initialize currency and payment method defaults
    const methodSelect = document.getElementById('paymentMethod');
    if (methodSelect && !methodSelect.value) {
        methodSelect.value = 'banktransfer';
    }

    handlePaymentReturnStatus();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDonationForm);
} else {
    initDonationForm();
}
