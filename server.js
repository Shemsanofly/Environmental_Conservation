require('dotenv').config();

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const {
    initDb,
    addContactSubmission,
    addDonationIntent,
    addSponsorIntent,
    listContacts,
    listDonations,
    listSponsors,
    getStats
} = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'change-me';

app.use(helmet({
    contentSecurityPolicy: false
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200
}));

// Static assets
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/images', express.static(path.join(__dirname, 'images')));

const sendHtml = (res, fileName) => {
    res.sendFile(path.join(__dirname, fileName));
};

// Pages
app.get('/', (req, res) => sendHtml(res, 'index.html'));
app.get('/index.html', (req, res) => sendHtml(res, 'index.html'));
app.get('/about.html', (req, res) => sendHtml(res, 'about.html'));
app.get('/contact.html', (req, res) => sendHtml(res, 'contact.html'));
app.get('/donation.html', (req, res) => sendHtml(res, 'donation.html'));
app.get('/initiatives.html', (req, res) => sendHtml(res, 'initiatives.html'));
app.get('/privacy-policy.html', (req, res) => sendHtml(res, 'privacy-policy.html'));
app.get('/terms-of-service.html', (req, res) => sendHtml(res, 'terms-of-service.html'));
app.get('/404.html', (req, res) => sendHtml(res, '404.html'));
app.get('/admin', (req, res) => sendHtml(res, 'admin.html'));
app.get('/admin.html', (req, res) => sendHtml(res, 'admin.html'));

const requireAdminKey = (req, res, next) => {
    const headerKey = req.get('x-admin-key');
    const authHeader = req.get('authorization');
    const bearerKey = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice('Bearer '.length)
        : null;

    const apiKey = headerKey || bearerKey;

    if (!apiKey || apiKey !== ADMIN_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    return next();
};

// API
app.post('/api/contact', async (req, res) => {
    const { fullName, email, phone, subject, message } = req.body || {};

    if (!fullName || !email || !subject || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const trimmed = {
        fullName: String(fullName).trim(),
        email: String(email).trim(),
        phone: phone ? String(phone).trim() : '',
        subject: String(subject).trim(),
        message: String(message).trim()
    };

    if (trimmed.fullName.length < 3 || trimmed.subject.length < 5 || trimmed.message.length < 10) {
        return res.status(400).json({ error: 'Validation failed' });
    }

    try {
        await addContactSubmission({
            ...trimmed,
            ip: req.ip,
            userAgent: req.get('user-agent') || ''
        });
        return res.json({ ok: true });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to save submission' });
    }
});

app.post('/api/donations', async (req, res) => {
    const { amount, donationType } = req.body || {};
    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
    }

    try {
        await addDonationIntent({
            amount: parsedAmount,
            donationType: donationType ? String(donationType).trim() : 'standard',
            ip: req.ip,
            userAgent: req.get('user-agent') || ''
        });
        return res.json({ ok: true });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to save donation intent' });
    }
});

app.post('/api/sponsors', async (req, res) => {
    const { sponsorType, amount } = req.body || {};
    const parsedAmount = Number(amount);

    if (!sponsorType || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: 'Invalid sponsor data' });
    }

    try {
        await addSponsorIntent({
            sponsorType: String(sponsorType).trim(),
            amount: parsedAmount,
            ip: req.ip,
            userAgent: req.get('user-agent') || ''
        });
        return res.json({ ok: true });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to save sponsor intent' });
    }
});

app.get('/api/admin/stats', requireAdminKey, async (req, res) => {
    try {
        const stats = await getStats();
        return res.json(stats);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to load stats' });
    }
});

app.get('/api/admin/contacts', requireAdminKey, async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const offset = Number(req.query.offset) || 0;

    try {
        const rows = await listContacts({ limit, offset });
        return res.json({ rows, limit, offset });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to load contacts' });
    }
});

app.get('/api/admin/donations', requireAdminKey, async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const offset = Number(req.query.offset) || 0;

    try {
        const rows = await listDonations({ limit, offset });
        return res.json({ rows, limit, offset });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to load donations' });
    }
});

app.get('/api/admin/sponsors', requireAdminKey, async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const offset = Number(req.query.offset) || 0;

    try {
        const rows = await listSponsors({ limit, offset });
        return res.json({ rows, limit, offset });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to load sponsors' });
    }
});

app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '404.html'));
});

initDb()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Failed to start server:', error);
        process.exit(1);
    });
