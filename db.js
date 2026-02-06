const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'geci.db');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPromise = open({
    filename: dbPath,
    driver: sqlite3.Database
});

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

async function getStats() {
    const db = await dbPromise;

    const contactCount = await db.get('SELECT COUNT(*) as count FROM contact_submissions');
    const donationCount = await db.get('SELECT COUNT(*) as count FROM donation_intents');
    const sponsorCount = await db.get('SELECT COUNT(*) as count FROM sponsor_intents');

    return {
        contacts: contactCount.count,
        donations: donationCount.count,
        sponsors: sponsorCount.count
    };
}

module.exports = {
    initDb,
    addContactSubmission,
    addDonationIntent,
    addSponsorIntent,
    listContacts,
    listDonations,
    listSponsors,
    getStats
};
