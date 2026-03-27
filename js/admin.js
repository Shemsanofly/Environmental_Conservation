/**
 * Admin Dashboard
 * Manages admin authentication, data viewing, and system statistics
 */

// Admin API Key (should be set from HTML or environment)
let adminApiKey = null;

// ===================================
// AUTHENTICATION
// ===================================

function getAdminKey() {
    return localStorage.getItem('adminApiKey') || null;
}

function setAdminKey(key) {
    if (key) {
        localStorage.setItem('adminApiKey', key);
        adminApiKey = key;
        return true;
    }
    return false;
}

function clearAdminKey() {
    localStorage.removeItem('adminApiKey');
    adminApiKey = null;
}

function showLoginForm() {
    const loginContainer = document.getElementById('loginContainer');
    const dashboardContainer = document.getElementById('dashboardContainer');
    const adminDashboard = document.getElementById('adminDashboard');
    
    if (loginContainer) loginContainer.style.display = 'block';
    if (dashboardContainer) dashboardContainer.style.display = 'none';
    if (adminDashboard) adminDashboard.classList.add('hidden');
}

function showDashboard() {
    const loginContainer = document.getElementById('loginContainer');
    const dashboardContainer = document.getElementById('dashboardContainer');
    const adminDashboard = document.getElementById('adminDashboard');
    
    if (loginContainer) loginContainer.style.display = 'none';
    if (dashboardContainer) dashboardContainer.style.display = 'block';
    if (adminDashboard) adminDashboard.classList.remove('hidden');
    
    loadDashboardData();
}

/**
 * Handle admin login
 */
async function handleAdminLogin(event) {
    if (event) {
        event.preventDefault();
    }

    const keyInput = document.getElementById('adminKeyInput') || document.getElementById('adminKey');
    if (!keyInput) return;

    const key = keyInput.value.trim();
    if (!key) {
        showError('Please enter an admin key');
        return;
    }

    try {
        showMessage('Verifying credentials...');
        
        const response = await fetch('/api/health', {
            headers: {
                'x-admin-key': key
            }
        });

        if (!response.ok) {
            showError('Invalid admin key');
            return;
        }

        setAdminKey(key);
        showMessage('Authentication successful!');
        keyInput.value = '';
        
        setTimeout(() => {
            showDashboard();
        }, 1000);
    } catch (error) {
        showError(`Error: ${error.message}`);
    }
}

/**
 * Handle admin logout
 */
function handleAdminLogout() {
    clearAdminKey();
    showMessage('Logged out successfully');
    setTimeout(() => {
        showLoginForm();
    }, 800);
}

// ===================================
// DATA LOADING
// ===================================

async function fetchAdminData(endpoint) {
    const key = getAdminKey();
    if (!key) {
        showError('Not authenticated');
        return null;
    }

    try {
        const response = await fetch(endpoint, {
            headers: {
                'x-admin-key': key
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                clearAdminKey();
                showLoginForm();
            }
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        showError(`Failed to load data: ${error.message}`);
        return null;
    }
}

/**
 * Load all dashboard data
 */
async function loadDashboardData() {
    try {
        showMessage('Loading dashboard...');
        
        const stats = await fetchAdminData('/api/admin/stats');
        const contacts = await fetchAdminData('/api/admin/contacts?limit=50&offset=0');
        const donations = await fetchAdminData('/api/admin/donations?limit=50&offset=0');
        const sponsors = await fetchAdminData('/api/admin/sponsors?limit=50&offset=0');
        const reports = await fetchAdminData('/api/admin/reports?limit=50&offset=0');
        const payments = await fetchAdminData('/api/admin/payments?limit=50&offset=0');

        if (stats) {
            displayStats(stats);
        }
        if (contacts && contacts.rows) {
            displayContacts(contacts.rows);
        }
        if (donations && donations.rows) {
            displayDonations(donations.rows);
        }
        if (sponsors && sponsors.rows) {
            displaySponsors(sponsors.rows);
        }
        if (reports && reports.rows) {
            displayReports(reports.rows);
        }
        if (payments && payments.rows) {
            displayPayments(payments.rows);
        }

        showMessage('Dashboard loaded successfully');
    } catch (error) {
        showError(`Error loading dashboard: ${error.message}`);
    }
}

// ===================================
// DATA DISPLAY
// ===================================

/**
 * Display statistics
 */
function displayStats(stats) {
    const statsContainer = document.getElementById('statsContainer');
    const statContacts = document.getElementById('statContacts');
    const statDonations = document.getElementById('statDonations');
    const statSponsors = document.getElementById('statSponsors');
    const statReports = document.getElementById('statReports');
    const statRevenue = document.getElementById('statRevenue');
    const statRecurring = document.getElementById('statRecurring');

    if (statContacts) statContacts.textContent = String(stats.contacts || 0);
    if (statDonations) statDonations.textContent = String(stats.donations || 0);
    if (statSponsors) statSponsors.textContent = String(stats.sponsors || 0);
    if (statReports) statReports.textContent = String(stats.reports || 0);
    if (statRevenue) statRevenue.textContent = `$${Number(stats.revenue || 0).toFixed(2)}`;
    if (statRecurring) statRecurring.textContent = String(stats.recurring || 0);
    if (!statsContainer) return;

    statsContainer.innerHTML = `
        <div class="stat-card">
            <h3>Total Contacts</h3>
            <p class="stat-number">${stats.contacts || 0}</p>
        </div>
        <div class="stat-card">
            <h3>Donation Intents</h3>
            <p class="stat-number">${stats.donations || 0}</p>
        </div>
        <div class="stat-card">
            <h3>Sponsorship Intents</h3>
            <p class="stat-number">${stats.sponsors || 0}</p>
        </div>
    `;
}

function displayReports(reports) {
    const container = document.getElementById('reportsTable');
    if (!container) return;

    container.innerHTML = '';
    if (!reports || reports.length === 0) {
        return;
    }

    reports.forEach(report => {
        const tr = document.createElement('tr');
        const coordinates = Number.isFinite(Number(report.latitude)) && Number.isFinite(Number(report.longitude))
            ? `${Number(report.latitude).toFixed(5)}, ${Number(report.longitude).toFixed(5)}`
            : '';
        const locationText = report.locationLabel || coordinates || '-';
        tr.innerHTML = `
            <td>${formatDate(report.createdAt)}</td>
            <td>${escapeHtml(report.reportType || '')}</td>
            <td>${escapeHtml((report.severity || '').toUpperCase())}</td>
            <td>${escapeHtml(report.reporterName || '')}</td>
            <td>${escapeHtml(locationText)}</td>
            <td>${escapeHtml(report.status || 'new')}</td>
        `;
        container.appendChild(tr);
    });
}

function displayPayments(payments) {
    const container = document.getElementById('paymentsTable');
    if (!container) return;

    container.innerHTML = '';
    if (!payments || payments.length === 0) {
        return;
    }

    payments.forEach(payment => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDate(payment.createdAt)}</td>
            <td>${escapeHtml(payment.txRef || '')}</td>
            <td>${escapeHtml(payment.donorEmail || '')}</td>
            <td>${escapeHtml(payment.currency || 'USD')} ${Number(payment.amount || 0).toFixed(2)}</td>
            <td>${Number(payment.isRecurring) === 1 ? 'Yes' : 'No'}</td>
            <td>${escapeHtml(payment.provider || '')}</td>
            <td>${escapeHtml(payment.status || '')}</td>
        `;
        container.appendChild(tr);
    });
}

/**
 * Display contacts table
 */
function displayContacts(contacts) {
    const container = document.getElementById('contactsTable') || document.getElementById('contactsContainer');
    if (!container) return;

    if (!contacts || contacts.length === 0) {
        container.innerHTML = '';
        return;
    }

    if (container.tagName === 'TBODY') {
        container.innerHTML = '';
        contacts.forEach(contact => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatDate(contact.createdAt)}</td>
                <td>${escapeHtml(contact.fullName || '')}</td>
                <td>${escapeHtml(contact.email || '')}</td>
                <td>${escapeHtml(contact.phone || '')}</td>
                <td>${escapeHtml(contact.subject || '')}</td>
                <td>${escapeHtml(contact.message || '')}</td>
            `;
            container.appendChild(tr);
        });
        return;
    }

    let html = '<table class="admin-table"><thead><tr>';
    html += '<th>Name</th><th>Email</th><th>Phone</th><th>Subject</th><th>Message</th><th>Date</th>';
    html += '</tr></thead><tbody>';

    contacts.forEach(contact => {
        html += '<tr>';
        html += `<td>${escapeHtml(contact.fullName)}</td>`;
        html += `<td>${escapeHtml(contact.email)}</td>`;
        html += `<td>${escapeHtml(contact.phone || '-')}</td>`;
        html += `<td>${escapeHtml(contact.subject)}</td>`;
        html += `<td title="${escapeHtml(contact.message)}">${truncateText(contact.message, 50)}</td>`;
        html += `<td>${formatDate(contact.createdAt)}</td>`;
        html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

/**
 * Display donations table
 */
function displayDonations(donations) {
    const container = document.getElementById('donationsTable') || document.getElementById('donationsContainer');
    if (!container) return;

    if (!donations || donations.length === 0) {
        container.innerHTML = '';
        return;
    }

    if (container.tagName === 'TBODY') {
        container.innerHTML = '';
        donations.forEach(donation => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatDate(donation.createdAt)}</td>
                <td>$${Number(donation.amount).toFixed(2)}</td>
                <td>${escapeHtml(donation.donationType || '')}</td>
                <td>${escapeHtml(donation.ip || '')}</td>
            `;
            container.appendChild(tr);
        });
        return;
    }

    let html = '<table class="admin-table"><thead><tr>';
    html += '<th>Amount</th><th>Type</th><th>IP</th><th>Date</th>';
    html += '</tr></thead><tbody>';

    donations.forEach(donation => {
        html += '<tr>';
        html += `<td>$${Number(donation.amount).toFixed(2)}</td>`;
        html += `<td>${escapeHtml(donation.donationType)}</td>`;
        html += `<td>${escapeHtml(donation.ip || '-')}</td>`;
        html += `<td>${formatDate(donation.createdAt)}</td>`;
        html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

/**
 * Display sponsors table
 */
function displaySponsors(sponsors) {
    const container = document.getElementById('sponsorsTable') || document.getElementById('sponsorsContainer');
    if (!container) return;

    if (!sponsors || sponsors.length === 0) {
        container.innerHTML = '';
        return;
    }

    if (container.tagName === 'TBODY') {
        container.innerHTML = '';
        sponsors.forEach(sponsor => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatDate(sponsor.createdAt)}</td>
                <td>${escapeHtml(sponsor.sponsorType || '')}</td>
                <td>$${Number(sponsor.amount).toFixed(2)}</td>
                <td>${escapeHtml(sponsor.ip || '')}</td>
            `;
            container.appendChild(tr);
        });
        return;
    }

    let html = '<table class="admin-table"><thead><tr>';
    html += '<th>Type</th><th>Amount</th><th>IP</th><th>Date</th>';
    html += '</tr></thead><tbody>';

    sponsors.forEach(sponsor => {
        html += '<tr>';
        html += `<td>${escapeHtml(sponsor.sponsorType)}</td>`;
        html += `<td>$${Number(sponsor.amount).toFixed(2)}</td>`;
        html += `<td>${escapeHtml(sponsor.ip || '-')}</td>`;
        html += `<td>${formatDate(sponsor.createdAt)}</td>`;
        html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// ===================================
// UTILITY FUNCTIONS
// ===================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

function truncateText(text, length) {
    return text && text.length > length ? text.substring(0, length) + '...' : text;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function showMessage(message) {
    void message;
    clearError();
}

function clearError() {
    const messageDiv = document.getElementById('adminMessage') || document.getElementById('adminError');
    if (messageDiv) {
        messageDiv.textContent = '';
        messageDiv.style.display = 'none';
    }
}

function showError(error) {
    const messageDiv = document.getElementById('adminMessage') || document.getElementById('adminError');
    if (messageDiv) {
        messageDiv.textContent = error;
        messageDiv.className = messageDiv.id === 'adminError' ? '' : 'admin-message error';
        messageDiv.style.display = 'block';
    }
}

// ===================================
// INITIALIZATION
// ===================================

function initAdminPanel() {
    clearError();

    // Check if user is already logged in
    adminApiKey = getAdminKey();
    
    if (adminApiKey) {
        showDashboard();
    } else {
        showLoginForm();
    }

    // Add event listeners
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleAdminLogin);
    }

    const keyInput = document.getElementById('adminKeyInput') || document.getElementById('adminKey');
    if (keyInput) {
        keyInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                handleAdminLogin(event);
            }
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleAdminLogout);
    }

    const refreshBtn = document.getElementById('refreshBtn') || document.getElementById('loadDataBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', (event) => {
            const keyInput = document.getElementById('adminKeyInput') || document.getElementById('adminKey');
            if (keyInput && keyInput.value.trim()) {
                setAdminKey(keyInput.value.trim());
                keyInput.value = '';
                showDashboard();
                return;
            }

            if (!getAdminKey()) {
                showError('Please enter your admin key first.');
                return;
            }

            if (event && typeof event.preventDefault === 'function') {
                event.preventDefault();
            }
            loadDashboardData();
        });
    }

    const tabButtons = document.querySelectorAll('.admin-tabs .tab-btn');
    if (tabButtons.length > 0) {
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                tabButtons.forEach(b => b.classList.remove('active'));
                button.classList.add('active');
                
                document.querySelectorAll('.admin-tab-content').forEach(tab => {
                    tab.classList.remove('active');
                    if (tab.id === `tab-${tabName}`) {
                        tab.classList.add('active');
                    }
                });
            });
        });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminPanel);
} else {
    initAdminPanel();
}
