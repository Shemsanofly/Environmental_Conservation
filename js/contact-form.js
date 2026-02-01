/**
 * Contact Form Validation & Submission
 * Handles form validation, error checking, and submission
 */

// ===================================
// FORM VALIDATION
// ===================================

/**
 * Validate full name field
 * @param {string} name - The full name to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateName(name) {
    const trimmed = name.trim();
    if (trimmed.length < 3) {
        return false;
    }
    // Allow letters, spaces, and hyphens
    const nameRegex = /^[a-zA-Z\s\-']+$/;
    return nameRegex.test(trimmed);
}

/**
 * Validate email address
 * @param {string} email - The email to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

/**
 * Validate phone number
 * @param {string} phone - The phone number to validate
 * @returns {boolean} - True if valid or empty, false otherwise
 */
function validatePhone(phone) {
    if (!phone) return true; // Phone is optional
    const phoneRegex = /^[+]?[0-9\s\-()]{10,}$/;
    return phoneRegex.test(phone.trim());
}

/**
 * Validate subject field
 * @param {string} subject - The subject to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateSubject(subject) {
    const trimmed = subject.trim();
    return trimmed.length >= 5 && trimmed.length <= 100;
}

/**
 * Validate message field
 * @param {string} message - The message to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateMessage(message) {
    const trimmed = message.trim();
    return trimmed.length >= 10 && trimmed.length <= 2000;
}

/**
 * Display error message for a field
 * @param {string} fieldId - The ID of the error element
 * @param {string} message - The error message to display
 */
function showError(fieldId, message) {
    const errorElement = document.getElementById(fieldId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

/**
 * Clear error message for a field
 * @param {string} fieldId - The ID of the error element
 */
function clearError(fieldId) {
    const errorElement = document.getElementById(fieldId);
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
}

/**
 * Show success message
 * @param {string} message - The success message
 */
function showSuccess(message) {
    const successElement = document.getElementById('successMessage');
    if (successElement) {
        successElement.textContent = message;
        successElement.style.display = 'block';
        setTimeout(() => {
            successElement.style.display = 'none';
        }, 5000);
    }
}

// ===================================
// FORM FIELD LISTENERS
// ===================================

/**
 * Initialize real-time validation for form fields
 */
function initFormValidation() {
    // Full Name validation
    const nameInput = document.getElementById('fullName');
    if (nameInput) {
        nameInput.addEventListener('blur', function () {
            if (this.value && !validateName(this.value)) {
                showError('nameError', 'Please enter a valid name (minimum 3 characters, letters only)');
            } else {
                clearError('nameError');
            }
        });

        nameInput.addEventListener('input', function () {
            if (this.value) {
                clearError('nameError');
            }
        });
    }

    // Email validation
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('blur', function () {
            if (this.value && !validateEmail(this.value)) {
                showError('emailError', 'Please enter a valid email address');
            } else {
                clearError('emailError');
            }
        });

        emailInput.addEventListener('input', function () {
            if (this.value) {
                clearError('emailError');
            }
        });
    }

    // Phone validation
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('blur', function () {
            if (this.value && !validatePhone(this.value)) {
                showError('phoneError', 'Please enter a valid phone number (minimum 10 digits)');
            } else {
                clearError('phoneError');
            }
        });

        phoneInput.addEventListener('input', function () {
            if (this.value) {
                clearError('phoneError');
            }
        });
    }

    // Subject validation
    const subjectInput = document.getElementById('subject');
    if (subjectInput) {
        subjectInput.addEventListener('blur', function () {
            if (this.value && !validateSubject(this.value)) {
                showError('subjectError', 'Subject must be between 5 and 100 characters');
            } else {
                clearError('subjectError');
            }
        });

        subjectInput.addEventListener('input', function () {
            if (this.value) {
                clearError('subjectError');
            }
        });
    }

    // Message validation and character count
    const messageInput = document.getElementById('message');
    if (messageInput) {
        messageInput.addEventListener('input', function () {
            const charCount = document.getElementById('charCount');
            if (charCount) {
                charCount.textContent = this.value.length;
            }
            if (this.value) {
                clearError('messageError');
            }
        });

        messageInput.addEventListener('blur', function () {
            if (this.value && !validateMessage(this.value)) {
                showError('messageError', 'Message must be between 10 and 2000 characters');
            } else {
                clearError('messageError');
            }
        });
    }

    // Agreement checkbox validation
    const agreeCheckbox = document.getElementById('agree');
    if (agreeCheckbox) {
        agreeCheckbox.addEventListener('change', function () {
            if (this.checked) {
                clearError('agreeError');
            }
        });
    }
}

// ===================================
// FORM SUBMISSION
// ===================================

/**
 * Handle form submission with validation
 * @param {Event} event - The form submit event
 */
function handleFormSubmit(event) {
    event.preventDefault();

    // Get form values
    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const subject = document.getElementById('subject').value;
    const message = document.getElementById('message').value;
    const agree = document.getElementById('agree').checked;

    // Clear all errors
    clearError('nameError');
    clearError('emailError');
    clearError('phoneError');
    clearError('subjectError');
    clearError('messageError');
    clearError('agreeError');

    // Validation flags
    let isValid = true;

    // Validate each field
    if (!validateName(fullName)) {
        showError('nameError', 'Please enter a valid name');
        isValid = false;
    }

    if (!validateEmail(email)) {
        showError('emailError', 'Please enter a valid email address');
        isValid = false;
    }

    if (phone && !validatePhone(phone)) {
        showError('phoneError', 'Please enter a valid phone number');
        isValid = false;
    }

    if (!validateSubject(subject)) {
        showError('subjectError', 'Subject must be between 5 and 100 characters');
        isValid = false;
    }

    if (!validateMessage(message)) {
        showError('messageError', 'Message must be between 10 and 2000 characters');
        isValid = false;
    }

    if (!agree) {
        showError('agreeError', 'Please agree to be contacted about your inquiry');
        isValid = false;
    }

    // If validation passed
    if (isValid) {
        // Create form data object
        const formData = {
            fullName: fullName.trim(),
            email: email.trim(),
            phone: phone.trim(),
            subject: subject.trim(),
            message: message.trim(),
            timestamp: new Date().toISOString()
        };

        // Simulate form submission (in a real app, this would send to a server)
        submitFormData(formData);
    }
}

/**
 * Process form submission
 * @param {Object} formData - The form data to submit
 */
function submitFormData(formData) {
    // Disable submit button
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    // Simulate network request
    setTimeout(() => {
        // Log form data
        console.log('Form Data Submitted:', formData);

        // Store in localStorage for demonstration
        let submissions = JSON.parse(localStorage.getItem('contactFormSubmissions') || '[]');
        submissions.push(formData);
        localStorage.setItem('contactFormSubmissions', JSON.stringify(submissions));

        // Show success message
        showSuccess('Thank you for your message! We will contact you soon at ' + formData.email);

        // Reset form
        document.getElementById('contactForm').reset();
        document.getElementById('charCount').textContent = '0';

        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;

    }, 1500); // Simulate network delay
}

// ===================================
// INITIALIZATION
// ===================================

/**
 * Initialize form validation when DOM is ready
 */
document.addEventListener('DOMContentLoaded', function () {
    initFormValidation();
});