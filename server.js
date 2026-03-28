require('dotenv').config();

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const https = require('https');
const crypto = require('crypto');
const {
    initDb,
    addContactSubmission,
    addDonationIntent,
    addSponsorIntent,
    addIncidentReport,
    addPaymentTransaction,
    listContacts,
    listDonations,
    listSponsors,
    listIncidentReports,
    listPaymentTransactions,
    getStats
} = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'change-me';
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY || '';
const FLW_BASE_URL = process.env.FLW_BASE_URL || 'https://api.flutterwave.com/v3';
const PAYMENT_MODE = String(process.env.PAYMENT_MODE || 'live').trim().toLowerCase();
const IS_DEMO_MODE = PAYMENT_MODE === 'demo';

function postJson(url, payload, headers = {}) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(payload);
        const request = https.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
                ...headers
            }
        }, (response) => {
            let body = '';
            response.on('data', (chunk) => {
                body += chunk;
            });
            response.on('end', () => {
                let parsed;
                try {
                    parsed = JSON.parse(body);
                } catch (error) {
                    return reject(new Error('Invalid response from payment provider'));
                }

                if (response.statusCode < 200 || response.statusCode >= 300) {
                    const message = parsed && parsed.message
                        ? parsed.message
                        : 'Payment provider error';
                    const err = new Error(message);
                    err.statusCode = response.statusCode;
                    return reject(err);
                }

                return resolve(parsed);
            });
        });

        request.on('error', reject);
        request.write(data);
        request.end();
    });
}

function getJson(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const request = https.request(url, {
            method: 'GET',
            headers: {
                ...headers
            }
        }, (response) => {
            let body = '';
            response.on('data', (chunk) => {
                body += chunk;
            });
            response.on('end', () => {
                let parsed;
                try {
                    parsed = JSON.parse(body);
                } catch (error) {
                    return reject(new Error('Invalid response from payment provider'));
                }

                if (response.statusCode < 200 || response.statusCode >= 300) {
                    const message = parsed && parsed.message
                        ? parsed.message
                        : 'Payment provider error';
                    const err = new Error(message);
                    err.statusCode = response.statusCode;
                    return reject(err);
                }

                return resolve(parsed);
            });
        });

        request.on('error', reject);
        request.end();
    });
}

function createTxRef() {
    if (crypto.randomUUID) {
        return `geci-${crypto.randomUUID()}`;
    }
    return `geci-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

app.use(helmet({
    contentSecurityPolicy: false
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200
}));

// Allow local dev origins to call the API (Live Server, file-based testing)
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Key');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }

    return next();
});

// Static assets
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/images', express.static(path.join(__dirname, 'images')));

const sendHtml = (res, fileName) => {
    res.sendFile(path.join(__dirname, fileName));
};

// Pages
app.get('/', (req, res) => sendHtml(res, 'index.html'));
app.get('/index', (req, res) => sendHtml(res, 'index.html'));
app.get('/about', (req, res) => sendHtml(res, 'about.html'));
app.get('/contact', (req, res) => sendHtml(res, 'contact.html'));
app.get('/donation', (req, res) => sendHtml(res, 'donation.html'));
app.get('/report', (req, res) => sendHtml(res, 'report.html'));
app.get('/initiatives', (req, res) => sendHtml(res, 'initiatives.html'));
app.get('/privacy-policy', (req, res) => sendHtml(res, 'privacy-policy.html'));
app.get('/terms-of-service', (req, res) => sendHtml(res, 'terms-of-service.html'));
app.get('/404', (req, res) => sendHtml(res, '404.html'));
app.get('/admin', (req, res) => sendHtml(res, 'admin.html'));

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
app.get('/api/health', (req, res) => {
    return res.json({
        ok: true,
        paymentsConfigured: Boolean(FLW_SECRET_KEY),
        paymentMode: PAYMENT_MODE,
        canProcessRealPayments: Boolean(FLW_SECRET_KEY) && !IS_DEMO_MODE
    });
});

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

app.post('/api/reports', async (req, res) => {
    const {
        reporterName,
        reporterEmail,
        reporterPhone,
        reportType,
        severity,
        description,
        locationLabel,
        latitude,
        longitude,
        locationSource
    } = req.body || {};

    const normalizedName = String(reporterName || '').trim();
    const normalizedEmail = String(reporterEmail || '').trim();
    const normalizedType = String(reportType || '').trim();
    const normalizedSeverity = String(severity || '').trim().toLowerCase();
    const normalizedDescription = String(description || '').trim();

    if (!normalizedName || !normalizedEmail || !normalizedType || !normalizedDescription) {
        return res.status(400).json({ error: 'Missing required report fields' });
    }

    if (!normalizedEmail.includes('@')) {
        return res.status(400).json({ error: 'Valid email is required' });
    }

    if (!['low', 'medium', 'high', 'critical'].includes(normalizedSeverity)) {
        return res.status(400).json({ error: 'Invalid severity level' });
    }

    try {
        await addIncidentReport({
            reporterName: normalizedName,
            reporterEmail: normalizedEmail,
            reporterPhone: reporterPhone ? String(reporterPhone).trim() : '',
            reportType: normalizedType,
            severity: normalizedSeverity,
            description: normalizedDescription,
            locationLabel: locationLabel ? String(locationLabel).trim() : '',
            latitude: Number.isFinite(Number(latitude)) ? Number(latitude) : null,
            longitude: Number.isFinite(Number(longitude)) ? Number(longitude) : null,
            locationSource: locationSource ? String(locationSource).trim() : 'manual',
            status: 'new',
            ip: req.ip,
            userAgent: req.get('user-agent') || ''
        });

        return res.json({ ok: true, message: 'Report submitted successfully' });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to submit report' });
    }
});

// New unified payment processing endpoint
app.post('/api/payments/process', async (req, res) => {
    const {
        amount,
        currency,
        paymentMethod,
        donorName,
        donorEmail,
        donorPhone,
        sponsorType,
        isRecurring
    } = req.body || {};

    // Validation
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
    }

    const email = String(donorEmail || '').trim();
    if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid email is required' });
    }

    try {
        // Store donation/sponsor intent
        if (sponsorType) {
            await addSponsorIntent({
                sponsorType: String(sponsorType).trim(),
                amount: parsedAmount,
                ip: req.ip,
                userAgent: req.get('user-agent') || ''
            });
        } else {
            await addDonationIntent({
                amount: parsedAmount,
                donationType: paymentMethod ? String(paymentMethod).trim() : 'standard',
                ip: req.ip,
                userAgent: req.get('user-agent') || ''
            });
        }

        const txRef = createTxRef();
        const normalizedCurrency = String(currency || 'USD').trim().toUpperCase();
        const normalizedMethod = paymentMethod ? String(paymentMethod).trim() : 'banktransfer';
        const recurringFlag = Boolean(isRecurring);
        const allowedMethods = ['mobilemoneytanzania', 'banktransfer'];

        if (!allowedMethods.includes(normalizedMethod)) {
            return res.status(400).json({ error: 'Unsupported payment method for Flutterwave.' });
        }

        if (!FLW_SECRET_KEY && !IS_DEMO_MODE) {
            return res.status(503).json({
                error: 'Real payments are enabled but Flutterwave is not configured. Add FLW_SECRET_KEY in .env.'
            });
        }

        // Real payment flow (Flutterwave)
        if (FLW_SECRET_KEY) {
            const redirectUrl = `${req.protocol}://${req.get('host')}/donation.html?status=complete`;

            const payload = {
                tx_ref: txRef,
                amount: parsedAmount,
                currency: normalizedCurrency,
                payment_options: normalizedMethod,
                redirect_url: redirectUrl,
                customer: {
                    email,
                    name: donorName ? String(donorName).trim() : 'Donor',
                    phonenumber: donorPhone ? String(donorPhone).trim() : ''
                },
                customizations: {
                    title: 'GECI Donation',
                    description: sponsorType ? `${sponsorType} Sponsorship` : 'Environmental conservation donation',
                    logo: `${req.protocol}://${req.get('host')}/images/logo.jpg`
                }
            };

            try {
                const response = await postJson(`${FLW_BASE_URL}/payments`, payload, {
                    Authorization: `Bearer ${FLW_SECRET_KEY}`
                });

                const link = response && response.data && response.data.link;
                if (link) {
                    await addPaymentTransaction({
                        txRef,
                        donorName: donorName ? String(donorName).trim() : 'Donor',
                        donorEmail: email,
                        donorPhone: donorPhone ? String(donorPhone).trim() : '',
                        amount: parsedAmount,
                        currency: normalizedCurrency,
                        paymentMethod: normalizedMethod,
                        donationType: sponsorType ? String(sponsorType).trim() : 'donation',
                        isRecurring: recurringFlag,
                        provider: 'flutterwave',
                        status: 'initiated',
                        ip: req.ip,
                        userAgent: req.get('user-agent') || ''
                    });

                    return res.json({ link, txRef, ok: true });
                }

                await addPaymentTransaction({
                    txRef,
                    donorName: donorName ? String(donorName).trim() : 'Donor',
                    donorEmail: email,
                    donorPhone: donorPhone ? String(donorPhone).trim() : '',
                    amount: parsedAmount,
                    currency: normalizedCurrency,
                    paymentMethod: normalizedMethod,
                    donationType: sponsorType ? String(sponsorType).trim() : 'donation',
                    isRecurring: recurringFlag,
                    provider: 'flutterwave',
                    status: 'failed',
                    ip: req.ip,
                    userAgent: req.get('user-agent') || ''
                });

                return res.status(502).json({ error: 'Payment link not returned by Flutterwave.' });
            } catch (error) {
                console.error('Flutterwave error:', error.message);

                await addPaymentTransaction({
                    txRef,
                    donorName: donorName ? String(donorName).trim() : 'Donor',
                    donorEmail: email,
                    donorPhone: donorPhone ? String(donorPhone).trim() : '',
                    amount: parsedAmount,
                    currency: normalizedCurrency,
                    paymentMethod: normalizedMethod,
                    donationType: sponsorType ? String(sponsorType).trim() : 'donation',
                    isRecurring: recurringFlag,
                    provider: 'flutterwave',
                    status: 'failed',
                    ip: req.ip,
                    userAgent: req.get('user-agent') || ''
                });

                return res.status(502).json({ error: error.message || 'Unable to start real payment.' });
            }
        }

        // Demo mode fallback (only when PAYMENT_MODE=demo)
        const mockLink = `${req.protocol}://${req.get('host')}/donation.html?tx_ref=${txRef}&status=success&amount=${parsedAmount}&email=${encodeURIComponent(email)}`;

        await addPaymentTransaction({
            txRef,
            donorName: donorName ? String(donorName).trim() : 'Donor',
            donorEmail: email,
            donorPhone: donorPhone ? String(donorPhone).trim() : '',
            amount: parsedAmount,
            currency: normalizedCurrency,
            paymentMethod: normalizedMethod,
            donationType: sponsorType ? String(sponsorType).trim() : 'donation',
            isRecurring: recurringFlag,
            provider: 'mock',
            status: 'demo_success',
            ip: req.ip,
            userAgent: req.get('user-agent') || ''
        });

        return res.json({
            ok: true,
            link: mockLink,
            txRef,
            message: `Demo mode: Payment of $${parsedAmount} recorded. Email: ${email}`,
            paymentType: 'mock',
            recurring: recurringFlag,
            redirecting: true
        });

    } catch (error) {
        console.error('Payment processing error:', error);
        return res.status(500).json({ error: error.message || 'Payment processing failed' });
    }
});

// Payment verification endpoint (for receiving webhooks or verification)
app.get('/api/payments/verify/:txRef', async (req, res) => {
    const { txRef } = req.params;

    if (!txRef) {
        return res.status(400).json({ error: 'Transaction reference required' });
    }

    if (!FLW_SECRET_KEY) {
        return res.status(503).json({ error: 'Payment verification is not configured.' });
    }

    try {
        const verifyUrl = `${FLW_BASE_URL}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`;
        const providerResponse = await getJson(verifyUrl, {
            Authorization: `Bearer ${FLW_SECRET_KEY}`
        });

        const providerStatus = providerResponse && providerResponse.data && providerResponse.data.status
            ? String(providerResponse.data.status).toLowerCase()
            : 'unknown';

        const isSuccessful = providerStatus === 'successful' || providerStatus === 'completed';

        return res.json({
            status: isSuccessful ? 'success' : 'failed',
            providerStatus,
            message: isSuccessful
                ? 'Payment verified successfully'
                : 'Payment not completed',
            txRef,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        return res.status(502).json({ error: error.message || 'Verification failed' });
    }
});

app.post('/api/payments/flutterwave', async (req, res) => {
    if (!FLW_SECRET_KEY) {
        return res.status(501).json({ error: 'Payment service is not configured.' });
    }

    const {
        amount,
        currency,
        paymentMethod,
        donorName,
        donorEmail,
        donorPhone
    } = req.body || {};

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: 'Invalid amount.' });
    }

    const normalizedCurrency = String(currency || 'TZS').trim().toUpperCase();
    if (!['TZS', 'USD'].includes(normalizedCurrency)) {
        return res.status(400).json({ error: 'Unsupported currency.' });
    }

    const method = String(paymentMethod || '').trim();
    const allowedMethods = ['mobilemoneytanzania', 'banktransfer'];
    if (!allowedMethods.includes(method)) {
        return res.status(400).json({ error: 'Unsupported payment method.' });
    }

    const email = String(donorEmail || '').trim();
    if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid email is required.' });
    }

    const txRef = createTxRef();
    const redirectUrl = `${req.protocol}://${req.get('host')}/donation.html?payment=flutterwave`;

    const payload = {
        tx_ref: txRef,
        amount: parsedAmount,
        currency: normalizedCurrency,
        payment_options: method,
        redirect_url: redirectUrl,
        customer: {
            email,
            name: donorName ? String(donorName).trim() : 'Anonymous',
            phonenumber: donorPhone ? String(donorPhone).trim() : ''
        },
        customizations: {
            title: 'GECI Donation',
            description: 'Environmental conservation donation',
            logo: `${req.protocol}://${req.get('host')}/images/logo.jpg`
        }
    };

    try {
        const response = await postJson(`${FLW_BASE_URL}/payments`, payload, {
            Authorization: `Bearer ${FLW_SECRET_KEY}`
        });

        const link = response && response.data && response.data.link;
        if (!link) {
            return res.status(502).json({ error: 'Payment link not available.' });
        }

        try {
            await addDonationIntent({
                amount: parsedAmount,
                donationType: method,
                ip: req.ip,
                userAgent: req.get('user-agent') || ''
            });
        } catch (error) {
            // Intent storage failure should not block the payment flow.
        }

        return res.json({ link, txRef });
    } catch (error) {
        return res.status(502).json({ error: error.message || 'Unable to start payment.' });
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

app.get('/api/admin/reports', requireAdminKey, async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const offset = Number(req.query.offset) || 0;

    try {
        const rows = await listIncidentReports({ limit, offset });
        return res.json({ rows, limit, offset });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to load reports' });
    }
});

app.get('/api/admin/payments', requireAdminKey, async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const offset = Number(req.query.offset) || 0;

    try {
        const rows = await listPaymentTransactions({ limit, offset });
        return res.json({ rows, limit, offset });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to load payments' });
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
