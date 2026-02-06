const adminKeyInput = document.getElementById('adminKey');
const loadDataBtn = document.getElementById('loadDataBtn');
const adminError = document.getElementById('adminError');
const adminDashboard = document.getElementById('adminDashboard');

const statContacts = document.getElementById('statContacts');
const statDonations = document.getElementById('statDonations');
const statSponsors = document.getElementById('statSponsors');

const contactsTable = document.getElementById('contactsTable');
const donationsTable = document.getElementById('donationsTable');
const sponsorsTable = document.getElementById('sponsorsTable');

const tabButtons = document.querySelectorAll('.admin-tabs .tab-btn');
const tabContents = document.querySelectorAll('.admin-tab-content');

function setError(message) {
    adminError.textContent = message;
    adminError.style.display = message ? 'block' : 'none';
}

function setActiveTab(tabName) {
    tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    tabContents.forEach(tab => {
        tab.classList.toggle('active', tab.id === `tab-${tabName}`);
    });
}

function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

function renderContacts(rows) {
    contactsTable.innerHTML = '';
    rows.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDate(row.createdAt)}</td>
            <td>${row.fullName || ''}</td>
            <td>${row.email || ''}</td>
            <td>${row.phone || ''}</td>
            <td>${row.subject || ''}</td>
            <td>${row.message || ''}</td>
        `;
        contactsTable.appendChild(tr);
    });
}

function renderDonations(rows) {
    donationsTable.innerHTML = '';
    rows.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDate(row.createdAt)}</td>
            <td>$${Number(row.amount).toFixed(2)}</td>
            <td>${row.donationType || ''}</td>
            <td>${row.ip || ''}</td>
        `;
        donationsTable.appendChild(tr);
    });
}

function renderSponsors(rows) {
    sponsorsTable.innerHTML = '';
    rows.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDate(row.createdAt)}</td>
            <td>${row.sponsorType || ''}</td>
            <td>$${Number(row.amount).toFixed(2)}</td>
            <td>${row.ip || ''}</td>
        `;
        sponsorsTable.appendChild(tr);
    });
}

async function fetchAdminData(apiKey) {
    const headers = {
        'x-admin-key': apiKey
    };

    const [statsRes, contactsRes, donationsRes, sponsorsRes] = await Promise.all([
        fetch('/api/admin/stats', { headers }),
        fetch('/api/admin/contacts', { headers }),
        fetch('/api/admin/donations', { headers }),
        fetch('/api/admin/sponsors', { headers })
    ]);

    if (!statsRes.ok) {
        throw new Error('Invalid admin key or server error');
    }

    const stats = await statsRes.json();
    const contacts = await contactsRes.json();
    const donations = await donationsRes.json();
    const sponsors = await sponsorsRes.json();

    statContacts.textContent = stats.contacts || 0;
    statDonations.textContent = stats.donations || 0;
    statSponsors.textContent = stats.sponsors || 0;

    renderContacts(contacts.rows || []);
    renderDonations(donations.rows || []);
    renderSponsors(sponsors.rows || []);

    adminDashboard.classList.remove('hidden');
}

loadDataBtn.addEventListener('click', async () => {
    const apiKey = adminKeyInput.value.trim();

    if (!apiKey) {
        setError('Please enter the admin key.');
        return;
    }

    setError('');
    loadDataBtn.disabled = true;
    loadDataBtn.textContent = 'Loading...';

    try {
        await fetchAdminData(apiKey);
    } catch (error) {
        setError(error.message || 'Unable to load data');
    } finally {
        loadDataBtn.disabled = false;
        loadDataBtn.textContent = 'Load Dashboard';
    }
});

adminKeyInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        loadDataBtn.click();
    }
});

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        setActiveTab(button.dataset.tab);
    });
});

setActiveTab('contacts');
