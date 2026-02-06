/**
 * Main JavaScript File
 * Contains core functionality for navigation, animations, and interactions
 */

// ===================================
// RESPONSIVE HAMBURGER MENU
// ===================================

/**
 * Initialize hamburger menu functionality
 * Handles mobile navigation toggle
 */
function initHamburgerMenu() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');

    if (!hamburger) return;

    hamburger.addEventListener('click', function () {
        navMenu.classList.toggle('active');
        hamburger.classList.toggle('active');
    });

    // Close menu when link is clicked
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function () {
            navMenu.classList.remove('active');
            hamburger.classList.remove('active');
        });
    });
}

// ===================================
// SMOOTH SCROLLING
// ===================================

/**
 * Add smooth scroll behavior to internal links
 */
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href !== '#') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
}

// ===================================
// ACTIVE NAVIGATION LINK
// ===================================

/**
 * Update active navigation link based on current page
 */
function updateActiveNavLink() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage || (currentPage === '' && href === 'index.html')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// ===================================
// INTERSECTION OBSERVER FOR ANIMATIONS
// ===================================

/**
 * Initialize intersection observer for scroll animations
 * Triggers fade-in animations when elements enter viewport
 */
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Calculate animation delay based on element position
                const delay = entry.target.dataset.animationDelay || 0;
                entry.target.style.animationDelay = delay + 'ms';

                // Add animation class
                if (entry.target.classList.contains('fade-in')) {
                    entry.target.style.opacity = '1';
                }
                if (entry.target.classList.contains('fade-in-up')) {
                    entry.target.style.opacity = '1';
                }

                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all animated elements
    document.querySelectorAll('.fade-in, .fade-in-up').forEach(element => {
        observer.observe(element);
    });
}

// ===================================
// CARD HOVER EFFECTS
// ===================================

/**
 * Add enhanced hover effects to initiative cards
 */
function initCardHoverEffects() {
    const cards = document.querySelectorAll('.initiative-card, .challenge-card, .solution-card');

    cards.forEach(card => {
        card.addEventListener('mouseenter', function () {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });

        card.addEventListener('mouseleave', function () {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
}

// ===================================
// FORM FOCUS EFFECTS
// ===================================

/**
 * Add focus effects to form inputs
 */
function initFormEffects() {
    const inputs = document.querySelectorAll('.form-input, .form-textarea');

    inputs.forEach(input => {
        input.addEventListener('focus', function () {
            this.style.boxShadow = '0 0 0 3px rgba(46, 204, 113, 0.2)';
        });

        input.addEventListener('blur', function () {
            this.style.boxShadow = 'none';
        });
    });
}

// ===================================
// SCROLL EFFECT ON HEADER
// ===================================

/**
 * Add scroll effect to header
 * Changes header appearance when user scrolls down
 */
function initHeaderScrollEffect() {
    const header = document.getElementById('header');

    if (!header) return;

    window.addEventListener('scroll', function () {
        if (window.scrollY > 50) {
            header.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2)';
        } else {
            header.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.15)';
        }
    });
}

// ===================================
// COUNTER ANIMATION
// ===================================

/**
 * Animate numbers when they come into view
 */
function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(start);
        }
    }, 16);
}

// ===================================
// READ MORE FUNCTIONALITY
// ===================================

/**
 * Initialize read more buttons for initiative cards
 */
function initReadMoreButtons() {
    const readMoreButtons = document.querySelectorAll('.read-more-btn');
    
    readMoreButtons.forEach(button => {
        button.addEventListener('click', function() {
            const card = this.closest('.initiative-card');
            const details = card.querySelector('.card-details');
            const preview = card.querySelector('.card-preview');
            
            if (details.style.display === 'none') {
                details.style.display = 'block';
                preview.style.display = 'none';
                this.textContent = 'Read Less';
                card.style.minHeight = 'auto';
            } else {
                details.style.display = 'none';
                preview.style.display = 'block';
                this.textContent = 'Read More';
                card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    });
}

// ===================================
// INITIALIZATION
// ===================================

/**
 * Newsletter subscription handler
 * Processes email subscriptions and provides user feedback
 */
function handleNewsletterSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const emailInput = form.querySelector('.newsletter-input');
    const email = emailInput.value.trim();

    // Validate email
    if (!email || !isValidEmail(email)) {
        alert('Please enter a valid email address');
        return;
    }

    // Store subscription (in production, send to server)
    console.log('Newsletter subscription:', email);
    
    // Show success message
    alert('Thank you for subscribing! You will receive updates about our conservation initiatives.');
    
    // Reset form
    form.reset();
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Initialize all functions when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function () {
    initHamburgerMenu();
    initSmoothScrolling();
    updateActiveNavLink();
    initScrollAnimations();
    initCardHoverEffects();
    initFormEffects();
    initHeaderScrollEffect();
    initReadMoreButtons();
});

/**
 * Re-initialize scroll animations when page visibility changes
 */
document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
        initScrollAnimations();
    }
});