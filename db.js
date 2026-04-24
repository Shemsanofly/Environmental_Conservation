const path = require('path');
const fs = require('fs');
const os = require('os');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

function resolveConfiguredDbPath() {
    const configured = String(process.env.DB_PATH || '').trim();
    if (!configured) {
        if (String(process.env.RENDER || '').trim().toLowerCase() === 'true') {
            return path.join(os.tmpdir(), 'geci.db');
        }

        return path.join(__dirname, 'data', 'geci.db');
    }

    return path.isAbsolute(configured)
        ? configured
        : path.join(__dirname, configured);
}

function ensureDbDirectory(filePath) {
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

let dbPath = resolveConfiguredDbPath();

try {
    ensureDbDirectory(dbPath);
} catch (error) {
    dbPath = path.join(os.tmpdir(), 'geci.db');
    ensureDbDirectory(dbPath);
}

const dbCandidates = [
    dbPath,
    path.join(os.tmpdir(), 'geci.db')
];

async function openDatabase() {
    let lastError = null;

    for (const candidatePath of dbCandidates) {
        try {
            ensureDbDirectory(candidatePath);
            return await open({
                filename: candidatePath,
                driver: sqlite3.Database
            });
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error('Unable to open SQLite database');
}

const dbPromise = openDatabase();

async function initDb() {
    const db = await dbPromise;

    await db.exec(`
        CREATE TABLE IF NOT EXISTS contact_submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            subject TEXT NOT NULL,
            message TEXT NOT NULL,
            ip TEXT,
            user_agent TEXT,
            created_at TEXT NOT NULL
        );
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS donation_intents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            amount REAL NOT NULL,
            donation_type TEXT NOT NULL,
            ip TEXT,
            user_agent TEXT,
            created_at TEXT NOT NULL
        );
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS sponsor_intents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sponsor_type TEXT NOT NULL,
            amount REAL NOT NULL,
            ip TEXT,
            user_agent TEXT,
            created_at TEXT NOT NULL
        );
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS incident_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reporter_name TEXT NOT NULL,
            reporter_email TEXT NOT NULL,
            reporter_phone TEXT,
            report_type TEXT NOT NULL,
            title TEXT,
            severity TEXT NOT NULL,
            description TEXT NOT NULL,
            location_label TEXT,
            latitude REAL,
            longitude REAL,
            location_source TEXT,
            image_name TEXT,
            image_mime_type TEXT,
            image_data_url TEXT,
            status TEXT NOT NULL,
            ip TEXT,
            user_agent TEXT,
            created_at TEXT NOT NULL
        );
    `);

    await ensureIncidentReportsColumns(db);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS payment_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tx_ref TEXT NOT NULL,
            donor_name TEXT,
            donor_email TEXT NOT NULL,
            donor_phone TEXT,
            amount REAL NOT NULL,
            currency TEXT NOT NULL,
            payment_method TEXT NOT NULL,
            donation_type TEXT NOT NULL,
            is_recurring INTEGER NOT NULL,
            provider TEXT NOT NULL,
            status TEXT NOT NULL,
            ip TEXT,
            user_agent TEXT,
            created_at TEXT NOT NULL
        );
    `);
}

async function ensureIncidentReportsColumns(db) {
    const columns = await db.all('PRAGMA table_info(incident_reports)');
    const columnNames = new Set((columns || []).map((column) => String(column.name || '').toLowerCase()));

    if (!columnNames.has('title')) {
        await db.exec('ALTER TABLE incident_reports ADD COLUMN title TEXT');
    }

    if (!columnNames.has('image_name')) {
        await db.exec('ALTER TABLE incident_reports ADD COLUMN image_name TEXT');
    }

    if (!columnNames.has('image_mime_type')) {
        await db.exec('ALTER TABLE incident_reports ADD COLUMN image_mime_type TEXT');
    }

    if (!columnNames.has('image_data_url')) {
        await db.exec('ALTER TABLE incident_reports ADD COLUMN image_data_url TEXT');
    }
}

async function addContactSubmission({ fullName, email, phone, subject, message, ip, userAgent }) {
    const db = await dbPromise;
    const createdAt = new Date().toISOString();

    await db.run(
        `INSERT INTO contact_submissions (full_name, email, phone, subject, message, ip, user_agent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        , [fullName, email, phone, subject, message, ip, userAgent, createdAt]
    );
}

async function addDonationIntent({ amount, donationType, ip, userAgent }) {
    const db = await dbPromise;
    const createdAt = new Date().toISOString();

    await db.run(
        `INSERT INTO donation_intents (amount, donation_type, ip, user_agent, created_at)
         VALUES (?, ?, ?, ?, ?)`
        , [amount, donationType, ip, userAgent, createdAt]
    );
}

async function addSponsorIntent({ sponsorType, amount, ip, userAgent }) {
    const db = await dbPromise;
    const createdAt = new Date().toISOString();

    await db.run(
        `INSERT INTO sponsor_intents (sponsor_type, amount, ip, user_agent, created_at)
         VALUES (?, ?, ?, ?, ?)`
        , [sponsorType, amount, ip, userAgent, createdAt]
    );
}

async function addIncidentReport({
    reporterName,
    reporterEmail,
    reporterPhone,
    reportType,
    title,
    severity,
    description,
    locationLabel,
    latitude,
    longitude,
    locationSource,
    imageName,
    imageMimeType,
    imageDataUrl,
    status,
    ip,
    userAgent
}) {
    const db = await dbPromise;
    const createdAt = new Date().toISOString();

    await db.run(
        `INSERT INTO incident_reports (
            reporter_name,
            reporter_email,
            reporter_phone,
            report_type,
            title,
            severity,
            description,
            location_label,
            latitude,
            longitude,
            location_source,
            image_name,
            image_mime_type,
            image_data_url,
            status,
            ip,
            user_agent,
            created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        , [
            reporterName,
            reporterEmail,
            reporterPhone,
            reportType,
            title,
            severity,
            description,
            locationLabel,
            latitude,
            longitude,
            locationSource,
            imageName,
            imageMimeType,
            imageDataUrl,
            status,
            ip,
            userAgent,
            createdAt
        ]
    );
}

async function addPaymentTransaction({
    txRef,
    donorName,
    donorEmail,
    donorPhone,
    amount,
    currency,
    paymentMethod,
    donationType,
    isRecurring,
    provider,
    status,
    ip,
    userAgent
}) {
    const db = await dbPromise;
    const createdAt = new Date().toISOString();

    await db.run(
        `INSERT INTO payment_transactions (
            tx_ref,
            donor_name,
            donor_email,
            donor_phone,
            amount,
            currency,
            payment_method,
            donation_type,
            is_recurring,
            provider,
            status,
            ip,
            user_agent,
            created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        , [
            txRef,
            donorName,
            donorEmail,
            donorPhone,
            amount,
            currency,
            paymentMethod,
            donationType,
            isRecurring ? 1 : 0,
            provider,
            status,
            ip,
            userAgent,
            createdAt
        ]
    );
}

async function listContacts({ limit, offset }) {
    const db = await dbPromise;

    return db.all(
        `SELECT id, full_name as fullName, email, phone, subject, message, ip, user_agent as userAgent, created_at as createdAt
         FROM contact_submissions
         ORDER BY id DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
    );
}

async function listDonations({ limit, offset }) {
    const db = await dbPromise;

    return db.all(
        `SELECT id, amount, donation_type as donationType, ip, user_agent as userAgent, created_at as createdAt
         FROM donation_intents
         ORDER BY id DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
    );
}

async function listSponsors({ limit, offset }) {
    const db = await dbPromise;

    return db.all(
        `SELECT id, sponsor_type as sponsorType, amount, ip, user_agent as userAgent, created_at as createdAt
         FROM sponsor_intents
         ORDER BY id DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
    );
}

async function listIncidentReports({ limit, offset }) {
    const db = await dbPromise;

    return db.all(
        `SELECT
            id,
            reporter_name as reporterName,
            reporter_email as reporterEmail,
            reporter_phone as reporterPhone,
            report_type as reportType,
            title,
            severity,
            description,
            location_label as locationLabel,
            latitude,
            longitude,
            location_source as locationSource,
            image_name as imageName,
            image_mime_type as imageMimeType,
            image_data_url as imageDataUrl,
            status,
            ip,
            user_agent as userAgent,
            created_at as createdAt
         FROM incident_reports
         ORDER BY id DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
    );
}

async function listPaymentTransactions({ limit, offset }) {
    const db = await dbPromise;

    return db.all(
        `SELECT
            id,
            tx_ref as txRef,
            donor_name as donorName,
            donor_email as donorEmail,
            donor_phone as donorPhone,
            amount,
            currency,
            payment_method as paymentMethod,
            donation_type as donationType,
            is_recurring as isRecurring,
            provider,
            status,
            ip,
            user_agent as userAgent,
            created_at as createdAt
         FROM payment_transactions
         ORDER BY id DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
    );
}

async function getStats() {
    const db = await dbPromise;

    const contactCount = await db.get('SELECT COUNT(*) as count FROM contact_submissions');
    const donationCount = await db.get('SELECT COUNT(*) as count FROM donation_intents');
    const sponsorCount = await db.get('SELECT COUNT(*) as count FROM sponsor_intents');
    const reportCount = await db.get('SELECT COUNT(*) as count FROM incident_reports');
    const recurringCount = await db.get('SELECT COUNT(*) as count FROM payment_transactions WHERE is_recurring = 1');
    const revenueSum = await db.get("SELECT COALESCE(SUM(amount), 0) as total FROM payment_transactions WHERE status IN ('completed', 'demo_success')");

    return {
        contacts: contactCount.count,
        donations: donationCount.count,
        sponsors: sponsorCount.count,
        reports: reportCount.count,
        recurring: recurringCount.count,
        revenue: revenueSum.total
    };
}

module.exports = {
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
};
