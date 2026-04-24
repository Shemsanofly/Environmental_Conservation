require('dotenv').config();

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const https = require('https');
const crypto = require('crypto');
const tls = require('tls');
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
const OPENAI_API_KEY = String(process.env.OPENAI_API_KEY || '').trim();
const GIPHY_API_KEY = String(process.env.GIPHY_API_KEY || 'dc6zaTOxFJmzC').trim();
const CONTACT_RECIPIENT_EMAIL = String(process.env.CONTACT_RECIPIENT_EMAIL || 'aminshemsa@gmail.com').trim();
const SMTP_HOST = String(process.env.SMTP_HOST || 'smtp.gmail.com').trim();
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_SECURE = String(process.env.SMTP_SECURE || 'true').toLowerCase() !== 'false';
const SMTP_USER = String(process.env.SMTP_USER || '').trim();
const SMTP_PASS = String(process.env.SMTP_PASS || '').trim();
const SMTP_FROM_EMAIL = String(process.env.SMTP_FROM_EMAIL || SMTP_USER || CONTACT_RECIPIENT_EMAIL).trim();

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

function parseDataUrl(dataUrl) {
    if (typeof dataUrl !== 'string') {
        return null;
    }

    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
        return null;
    }

    return {
        mimeType: String(match[1] || '').toLowerCase(),
        buffer: Buffer.from(match[2], 'base64')
    };
}

function extensionFromMimeType(mimeType) {
    const type = String(mimeType || '').toLowerCase();
    if (type.includes('webm')) return 'webm';
    if (type.includes('mpeg')) return 'mp3';
    if (type.includes('mp3')) return 'mp3';
    if (type.includes('wav')) return 'wav';
    if (type.includes('ogg')) return 'ogg';
    if (type.includes('m4a')) return 'm4a';
    return 'webm';
}

async function transcribeAudioAttachment(audioItem) {
    if (!audioItem || typeof audioItem.dataUrl !== 'string' || !audioItem.dataUrl.startsWith('data:audio/')) {
        return '';
    }

    const parsed = parseDataUrl(audioItem.dataUrl);
    if (!parsed || !parsed.buffer || parsed.buffer.length === 0) {
        return '';
    }

    if (typeof fetch !== 'function' || typeof FormData === 'undefined' || typeof Blob === 'undefined') {
        throw new Error('Audio transcription is not supported in this Node runtime');
    }

    const form = new FormData();
    form.append('model', 'gpt-4o-mini-transcribe');
    form.append('response_format', 'json');
    form.append('file', new Blob([parsed.buffer], { type: parsed.mimeType }), `voice.${extensionFromMimeType(parsed.mimeType)}`);

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`
        },
        body: form
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
        const errorMessage = body && body.error && body.error.message
            ? body.error.message
            : 'Failed to transcribe audio';
        throw new Error(errorMessage);
    }

    return String(body && body.text ? body.text : '').trim();
}

function createTxRef() {
    if (crypto.randomUUID) {
        return `geci-${crypto.randomUUID()}`;
    }
    return `geci-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

function sanitizeHeaderValue(value) {
    return String(value || '').replace(/[\r\n]+/g, ' ').trim();
}

function dotStuffBody(value) {
    return String(value || '').replace(/^\./gm, '..');
}

function readSmtpResponse(socket) {
    return new Promise((resolve, reject) => {
        let buffer = '';

        const onData = (chunk) => {
            buffer += chunk.toString('utf8');
            const lines = buffer.split(/\r?\n/).filter((line) => line.length > 0);

            if (!lines.length) {
                return;
            }

            const lastLine = lines[lines.length - 1];
            const match = lastLine.match(/^(\d{3})([ -])(.*)$/);

            if (!match || match[2] === '-') {
                return;
            }

            socket.off('data', onData);
            socket.off('error', onError);
            resolve({
                code: Number(match[1]),
                message: lines.join('\n')
            });
        };

        const onError = (error) => {
            socket.off('data', onData);
            socket.off('error', onError);
            reject(error);
        };

        socket.on('data', onData);
        socket.on('error', onError);
    });
}

async function sendSmtpCommand(socket, command, expectedCodes) {
    socket.write(`${command}\r\n`);
    const response = await readSmtpResponse(socket);

    if (!expectedCodes.includes(response.code)) {
        throw new Error(`SMTP command failed (${response.code}): ${response.message}`);
    }

    return response;
}

async function sendContactNotificationEmail({ fullName, email, phone, subject, message }) {
    if (!SMTP_USER || !SMTP_PASS) {
        throw new Error('SMTP email settings are not configured');
    }

    const socket = tls.connect({
        host: SMTP_HOST,
        port: SMTP_PORT,
        servername: SMTP_HOST,
        rejectUnauthorized: SMTP_SECURE
    });

    try {
        const greeting = await readSmtpResponse(socket);
        if (greeting.code !== 220) {
            throw new Error(`SMTP server rejected connection (${greeting.code}): ${greeting.message}`);
        }

        await sendSmtpCommand(socket, `EHLO ${SMTP_HOST}`, [250]);
        await sendSmtpCommand(socket, 'AUTH LOGIN', [334]);
        await sendSmtpCommand(socket, Buffer.from(SMTP_USER, 'utf8').toString('base64'), [334]);
        await sendSmtpCommand(socket, Buffer.from(SMTP_PASS, 'utf8').toString('base64'), [235]);
        await sendSmtpCommand(socket, `MAIL FROM:<${SMTP_FROM_EMAIL}>`, [250]);
        await sendSmtpCommand(socket, `RCPT TO:<${CONTACT_RECIPIENT_EMAIL}>`, [250, 251]);
        await sendSmtpCommand(socket, 'DATA', [354]);

        const emailLines = [
            `From: GECI Contact Form <${sanitizeHeaderValue(SMTP_FROM_EMAIL)}>`,
            `To: ${sanitizeHeaderValue(CONTACT_RECIPIENT_EMAIL)}`,
            `Subject: ${sanitizeHeaderValue(`New contact message: ${subject}`)}`,
            `Reply-To: ${sanitizeHeaderValue(fullName)} <${sanitizeHeaderValue(email)}>`,
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            '',
            'A new contact message was submitted through the GECI website.',
            '',
            `Name: ${fullName}`,
            `Email: ${email}`,
            `Phone: ${phone || 'Not provided'}`,
            `Subject: ${subject}`,
            '',
            'Message:',
            message,
            '',
            `Submitted at: ${new Date().toISOString()}`
        ];

        const emailMessage = `${dotStuffBody(emailLines.join('\r\n'))}\r\n.\r\n`;
        socket.write(emailMessage);

        const sent = await readSmtpResponse(socket);
        if (sent.code !== 250) {
            throw new Error(`SMTP message rejected (${sent.code}): ${sent.message}`);
        }

        await sendSmtpCommand(socket, 'QUIT', [221]);
    } finally {
        socket.end();
    }
}

app.use(helmet({
    contentSecurityPolicy: false
}));

app.use(express.json({ limit: '8mb' }));
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

app.get('/api/gifs/search', async (req, res) => {
    const query = String(req.query.q || '').trim();
    const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 24);
    const encodedQuery = encodeURIComponent(query || 'environment nature');
    const endpoint = `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(GIPHY_API_KEY)}&q=${encodedQuery}&limit=${limit}&rating=g&lang=en`;

    const fallback = [
        { id: 'fallback-1', title: 'Nature', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdTZqMnR5eWdxOGQ0a2lyM2VtY2N4NW95OHZtMHBxMXB2b3I1a2Q5eiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/KxseCTOPVykYvG2V4R/giphy.gif' },
        { id: 'fallback-2', title: 'Earth', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExY3doaWpwM2xwa2M3bTFtY3h4OHlyM3VxYmx6dnhlMm12dG1rZXU2diZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l4FGuhL4U2WyjdkaY/giphy.gif' },
        { id: 'fallback-3', title: 'Recycle', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdXJ4NXZxZmR4N2Q5NHNscW1zZmRjN3N2bzA2eHQxMjQxN2VnZ2Z6NyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3o6Zt481isNVuQI1l6/giphy.gif' },
        { id: 'fallback-4', title: 'Green', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExN2NteXhoaWo0azk1MmsxZ2N2MmZpZDlnN3VjNDAwY2Rlb2F2N2Y1aiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l0HlQ7LRalQqdWfao/giphy.gif' }
    ];

    try {
        const response = await getJson(endpoint);
        const data = Array.isArray(response && response.data) ? response.data : [];
        const items = data
            .map((gif) => {
                const img = gif && gif.images && gif.images.fixed_width;
                const url = img && img.url ? img.url : null;
                return url
                    ? { id: String(gif.id || ''), title: String(gif.title || 'GIF'), url }
                    : null;
            })
            .filter(Boolean)
            .slice(0, limit);

        return res.json({ items: items.length ? items : fallback.slice(0, limit) });
    } catch (error) {
        return res.json({ items: fallback.slice(0, limit) });
    }
});

// Chatbot API Endpoint
app.post('/api/chat', async (req, res) => {
    const { message, attachments } = req.body || {};

    const userMessage = String(message || '').trim();
    const attachmentList = Array.isArray(attachments) ? attachments.slice(0, 5) : [];
    const audioAttachments = attachmentList.filter((item) => String(item && item.kind ? item.kind : '').toLowerCase() === 'audio');

    if (!userMessage && attachmentList.length === 0) {
        return res.status(400).json({ error: 'Message or attachment is required' });
    }

    // Demo mode responses (when no valid API key)
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
        const demoResponses = {
            'climate': 'Climate change is one of the most pressing environmental challenges of our time. Rising global temperatures are causing extreme weather events, sea level rise, and ecosystem disruption. To combat climate change, we need to reduce greenhouse gas emissions through renewable energy adoption, sustainable transportation, and responsible consumption. Every individual action counts—from carpooling to supporting environmental organizations like GECI.',
            'trees': 'Trees are essential for our planet! They absorb CO2, produce oxygen, prevent soil erosion, and provide habitats for wildlife. Deforestation threatens biodiversity and accelerates climate change. We can help by supporting reforestation efforts, planting trees in our communities, and protecting existing forests. GECI works with communities to restore degraded lands.',
            'plastic': 'Plastic pollution is a major environmental crisis. Millions of tons of plastic end up in our oceans yearly, harming marine life and polluting ecosystems. Reduce plastic use by choosing reusable products, avoiding single-use plastics, and supporting plastic-reduction initiatives. Recycling and proper waste management are also crucial steps.',
            'renewable': 'Renewable energy sources like solar, wind, and hydroelectric power are sustainable alternatives to fossil fuels. They reduce greenhouse gas emissions and help combat climate change. Many countries are transitioning to renewable energy, creating green jobs and reducing energy costs. Supporting renewable energy adoption is critical for a sustainable future.',
            'conservation': 'Environmental conservation aims to protect and restore natural ecosystems. It involves protecting wildlife habitats, preserving biodiversity, and managing natural resources sustainably. Conservation efforts include creating protected areas, restoring degraded habitats, and supporting endangered species recovery programs.',
            'sustainable': 'Sustainability means meeting our current needs without compromising future generations\' ability to meet theirs. It involves responsible resource management, reducing waste, protecting ecosystems, and promoting social equity. Sustainable practices include circular economy principles, ethical consumption, and environmental stewardship.',
            'pollution': 'Pollution—air, water, and soil—harms ecosystems and human health. Sources include industrial emissions, vehicle exhaust, agricultural runoff, and improper waste disposal. Solutions include stricter environmental regulations, sustainable industry practices, renewable energy adoption, and individual actions like reducing emissions and proper waste disposal.',
            'biodiversity': 'Biodiversity—the variety of life on Earth—is crucial for ecosystem health and human survival. Threats include habitat loss, climate change, and pollution. We can protect biodiversity by supporting conservation efforts, protecting natural habitats, reducing our ecological footprint, and supporting organizations like GECI.'
        };

        // Find matching response
        const lowerMessage = userMessage.toLowerCase();
        let reply = null;

        for (const [key, value] of Object.entries(demoResponses)) {
            if (lowerMessage.includes(key)) {
                reply = value;
                break;
            }
        }

        // Default response if no keyword match
        if (!reply) {
            reply = 'That\'s a great environmental question! While I\'m running in demo mode, I can help with topics like climate change, trees, plastic pollution, renewable energy, conservation, sustainability, biodiversity, and pollution. Feel free to ask me about any of these topics, or add your real OpenAI API key to .env for more detailed AI responses.';
        }

        if (!reply && attachmentList.length > 0) {
            reply = 'I can see you attached files. In demo mode I can still help by discussing the content if you also include a short text description of what you want me to analyze.';
        }

        if (audioAttachments.length > 0) {
            reply = `I heard you sent a voice message. Demo mode cannot transcribe audio yet. Please add a short typed message, and I will still help with your environmental question.\n\n${reply}`;
        }

        return res.json({ reply });
    }

    // Real OpenAI mode
    try {
        const userContent = [];
        const documentNotes = [];
        let audioTranscript = '';

        if (audioAttachments.length > 0) {
            try {
                audioTranscript = await transcribeAudioAttachment(audioAttachments[0]);
            } catch (error) {
                audioTranscript = '';
            }
        }

        if (userMessage) {
            userContent.push({ type: 'text', text: userMessage });
        }

        if (audioTranscript) {
            userContent.push({ type: 'text', text: `User voice transcript: ${audioTranscript}` });
        }

        attachmentList.forEach((item, index) => {
            const kind = String(item && item.kind ? item.kind : '').toLowerCase();
            const name = String(item && item.name ? item.name : `attachment-${index + 1}`);
            const mimeType = String(item && item.mimeType ? item.mimeType : '').toLowerCase();

            if ((kind === 'image' || kind === 'gif') && typeof item.dataUrl === 'string' && item.dataUrl.startsWith('data:image/')) {
                userContent.push({
                    type: 'image_url',
                    image_url: {
                        url: item.dataUrl
                    }
                });
                return;
            }

            if (kind === 'gif_remote' && typeof item.url === 'string' && item.url.startsWith('http')) {
                userContent.push({
                    type: 'image_url',
                    image_url: {
                        url: item.url
                    }
                });
                return;
            }

            if (kind === 'document') {
                if (typeof item.textContent === 'string' && item.textContent.trim()) {
                    documentNotes.push(`Document: ${name}\n${item.textContent.trim().slice(0, 12000)}`);
                } else {
                    documentNotes.push(`Document: ${name} (${mimeType || 'unknown type'}) was attached but no readable text was provided.`);
                }
            }
        });

        if (documentNotes.length > 0) {
            userContent.push({
                type: 'text',
                text: `Attached document content:\n\n${documentNotes.join('\n\n---\n\n')}`
            });
        }

        if (userContent.length === 0) {
            userContent.push({ type: 'text', text: 'Please analyze the attached file(s).' });
        }

        const payload = {
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are a knowledgeable and friendly environmental conservation assistant. Your role is to provide accurate, helpful information about environmental issues, climate change, sustainability, conservation efforts, and green practices. Always provide factual information and encourage positive environmental actions. Keep responses concise (2-3 paragraphs max) and engaging.'
                },
                {
                    role: 'user',
                    content: userContent
                }
            ],
            temperature: 0.7,
            max_tokens: 500
        };

        const response = await postJson('https://api.openai.com/v1/chat/completions', payload, {
            'Authorization': `Bearer ${OPENAI_API_KEY}`
        });

        const aiReply = response.choices?.[0]?.message?.content || 'I could not generate a response. Please try again.';
        const reply = audioTranscript
            ? `I heard you say: "${audioTranscript}"\n\n${aiReply}`
            : aiReply;
        return res.json({ reply });
    } catch (error) {
        console.error('Chat endpoint error:', error.message);
        return res.json({
            reply: 'I am temporarily unable to reach the AI service right now. Here is a quick environmental tip: focus on reducing single-use plastics, conserving electricity, and supporting local tree-planting efforts. You can ask me again in a moment.'
        });
    }
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

        await sendContactNotificationEmail(trimmed);

        return res.json({ ok: true, emailedTo: CONTACT_RECIPIENT_EMAIL });
    } catch (error) {
        console.error('Contact submission error:', error.message);
        return res.status(500).json({ error: 'Failed to save submission and send email' });
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
        title,
        imageDataUrl,
        imageName,
        imageMimeType,
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

    const normalizedTitle = String(title || '').trim();
    const normalizedImageDataUrl = String(imageDataUrl || '').trim();
    const normalizedImageName = String(imageName || '').trim();
    const normalizedImageMimeType = String(imageMimeType || '').trim().toLowerCase();
    const normalizedName = String(reporterName || '').trim();
    const normalizedEmail = String(reporterEmail || '').trim();
    const normalizedType = String(reportType || '').trim();
    const normalizedSeverity = String(severity || '').trim().toLowerCase();
    const normalizedDescription = String(description || '').trim();
    const hasLegacyFields = Boolean(normalizedName || normalizedEmail || normalizedType);

    if (!normalizedDescription) {
        return res.status(400).json({ error: 'Missing required report fields' });
    }

    if (!hasLegacyFields) {
        if (!normalizedTitle || normalizedTitle.length < 5) {
            return res.status(400).json({ error: 'Title must be at least 5 characters' });
        }

        if (!normalizedImageDataUrl.startsWith('data:image/')) {
            return res.status(400).json({ error: 'A valid image upload is required' });
        }

        const approximateImageBytes = Math.ceil((normalizedImageDataUrl.length * 3) / 4);
        if (approximateImageBytes > 5 * 1024 * 1024) {
            return res.status(400).json({ error: 'Image is too large. Maximum size is 5MB' });
        }
    }

    if (hasLegacyFields && !normalizedEmail.includes('@')) {
        return res.status(400).json({ error: 'Valid email is required for legacy report format' });
    }

    if (hasLegacyFields && !normalizedName) {
        return res.status(400).json({ error: 'Reporter name is required for legacy report format' });
    }

    const resolvedSeverity = normalizedSeverity || 'medium';
    if (!['low', 'medium', 'high', 'critical'].includes(resolvedSeverity)) {
        return res.status(400).json({ error: 'Invalid severity level' });
    }

    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);
    const hasLatitude = Number.isFinite(parsedLatitude);
    const hasLongitude = Number.isFinite(parsedLongitude);

    if (!hasLatitude || parsedLatitude < -90 || parsedLatitude > 90) {
        return res.status(400).json({ error: 'Latitude must be a valid number between -90 and 90' });
    }

    if (!hasLongitude || parsedLongitude < -180 || parsedLongitude > 180) {
        return res.status(400).json({ error: 'Longitude must be a valid number between -180 and 180' });
    }

    try {
        await addIncidentReport({
            reporterName: normalizedName || 'Anonymous Reporter',
            reporterEmail: normalizedEmail || 'anonymous@local.invalid',
            reporterPhone: reporterPhone ? String(reporterPhone).trim() : '',
            reportType: normalizedType || 'General Incident',
            title: normalizedTitle,
            severity: resolvedSeverity,
            description: normalizedDescription,
            locationLabel: locationLabel ? String(locationLabel).trim() : '',
            latitude: parsedLatitude,
            longitude: parsedLongitude,
            locationSource: locationSource ? String(locationSource).trim() : 'manual',
            imageName: normalizedImageName,
            imageMimeType: normalizedImageMimeType,
            imageDataUrl: normalizedImageDataUrl,
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
