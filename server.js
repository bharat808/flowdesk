// FlowDesk — MongoDB Backend API + Google Sheets Sync
// Run: node server.js
// Requires: npm install express mongoose cors dotenv google-spreadsheet google-auth-library

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const https = require('https');
const http = require('http');

// ── Schemas & Models ──
const entrySchema = new mongoose.Schema({
  Email: { type: String, default: '' },
  SubmittedBy: { type: String, default: '' },
  AccountId: { type: String, default: '' },
  X: { type: String, default: '' },
  Insta: { type: String, default: '' },
  RajasApproval: { type: String, default: '' },
  RajasBy: { type: String, default: '' },
  RajasTime: { type: String, default: '' },
  RajasRejectReason: { type: String, default: '' },
  RajasRemark: { type: String, default: '' },
  OpsApproval: { type: String, default: '' },
  OpsBy: { type: String, default: '' },
  OpsTime: { type: String, default: '' },
  OpsRemark: { type: String, default: '' },
  NainaApproval: { type: String, default: '' },
  NainaBy: { type: String, default: '' },
  NainaTime: { type: String, default: '' },
  NainaRejectReason: { type: String, default: '' },
  NainaRemark: { type: String, default: '' },
  DiscountCode: { type: String, default: '' },
  DiscountUsed: { type: String, default: '' },
  BonusPct: { type: String, default: '' },
  BonusStatus: { type: String, default: '' },
  OpsRejectedBack: { type: Boolean, default: false },
}, { timestamps: true });

const roleSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  role: { type: String, required: true, lowercase: true, trim: true },
  name: { type: String, default: '' },
});
roleSchema.index({ email: 1, role: 1 }, { unique: true });

const submitterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, trim: true, unique: true },
  enabled: { type: Boolean, default: true },
});

// Config model — stores webhook URL and other admin settings
const configSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String, default: '' },
});

const Entry = mongoose.model('Entry', entrySchema);
const Role = mongoose.model('Role', roleSchema);
const Submitter = mongoose.model('Submitter', submitterSchema);
const Config = mongoose.model('Config', configSchema);

// ── Google Chat Notifications ──
async function getWebhookUrl() {
  try {
    const cfg = await Config.findOne({ key: 'gchat_webhook' }).lean();
    return cfg?.value || '';
  } catch { return ''; }
}

async function sendGChatNotification(text) {
  const webhookUrl = await getWebhookUrl();
  if (!webhookUrl) return;
  try {
    const body = JSON.stringify({ text });
    const url = new URL(webhookUrl);
    const lib = url.protocol === 'https:' ? https : http;
    await new Promise((resolve, reject) => {
      const req = lib.request({
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      }, res => { res.resume(); resolve(); });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
    console.log('📣 GChat notification sent');
  } catch (e) { console.error('GChat notification failed:', e.message); }
}

function fmtEntry(entry) {
  const parts = [`*Email:* ${entry.Email || '—'}`];
  if (entry.AccountId) parts.push(`*Account:* ${entry.AccountId}`);
  if (entry.DiscountCode) parts.push(`*Code:* ${entry.DiscountCode}`);
  return parts.join('  |  ');
}

async function notifySubmitted(entry) {
  await sendGChatNotification(`📝 *New submission*\n${fmtEntry(entry)}\nSubmitted by: ${entry.SubmittedBy || entry.Email}`);
}
async function notifyRajas(entry, decision, reason) {
  const icon = decision === 'Approved' ? '✅' : '❌';
  let msg = `${icon} *Rajas ${decision}*\n${fmtEntry(entry)}`;
  if (reason) msg += `\nReason: ${reason}`;
  await sendGChatNotification(msg);
}
async function notifyOps(entry, decision, remark, rejectedBack) {
  const icon = decision === 'Approved' ? '✅' : rejectedBack ? '🔄' : '❌';
  let msg = `${icon} *Ops ${rejectedBack ? 'Returned to Rajas' : decision}*\n${fmtEntry(entry)}`;
  if (remark) msg += `\nRemark: ${remark}`;
  await sendGChatNotification(msg);
}
async function notifyNaina(entry, decision, reason) {
  const icon = decision === 'Approved' ? '✅' : '❌';
  let msg = `${icon} *Naina ${decision}*\n${fmtEntry(entry)}`;
  if (reason) msg += `\nReason: ${reason}`;
  await sendGChatNotification(msg);
}

// ── Google Sheets ──
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const PAYOUT_SHEET_ID = process.env.GOOGLE_PAYOUT_SHEET_ID;
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const GOOGLE_PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

// Single payout doc
let payoutDoc = null;
let payoutReady = false;

// Tab names
const PAYOUT_TABS = { ENTRIES: 'Payouts', SUBMITTERS: 'Submitters', ROLES: 'Roles' };

// Column headers
const PAYOUT_HEADERS = [
  'MongoID', 'SubmittedBy', 'Email', 'AccountId',
  'X', 'Insta',
  'RajasApproval', 'RajasRemark', 'RajasRejectReason', 'RajasBy', 'RajasTime',
  'OpsApproval', 'OpsRemark', 'OpsBy', 'OpsTime', 'OpsRejectedBack',
  'NainaApproval', 'NainaRemark', 'NainaRejectReason', 'NainaBy', 'NainaTime',
  'DiscountCode', 'DiscountUsed',
  'SubmittedAt', 'UpdatedAt'
];
const SUBMITTER_HEADERS = ['MongoID', 'Name', 'Email', 'Enabled'];
const ROLE_HEADERS = ['MongoID', 'Name', 'Email', 'Role'];

function makeAuth() {
  return new JWT({
    email: GOOGLE_CLIENT_EMAIL,
    key: GOOGLE_PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function initGoogleSheets() {
  if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    console.warn('⚠️  GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY missing — sheet sync disabled');
    return;
  }
  if (PAYOUT_SHEET_ID) {
    try {
      payoutDoc = new GoogleSpreadsheet(PAYOUT_SHEET_ID, makeAuth());
      await payoutDoc.loadInfo();
      console.log(`✅ Payout sheet connected: "${payoutDoc.title}"`);

      // Create tabs if they don't exist yet
      for (const [tabKey, headers] of [
        [PAYOUT_TABS.ENTRIES, PAYOUT_HEADERS],
        [PAYOUT_TABS.SUBMITTERS, SUBMITTER_HEADERS],
        [PAYOUT_TABS.ROLES, ROLE_HEADERS],
      ]) {
        if (!payoutDoc.sheetsByTitle[tabKey]) {
          await payoutDoc.addSheet({ title: tabKey, headerValues: headers });
          console.log(`📋 Created tab "${tabKey}"`);
          await sleep(500);
          await payoutDoc.loadInfo();
        }
      }

      payoutReady = true;
    } catch (e) { console.error('❌ Payout sheet init failed:', e.message); }
  } else {
    console.warn('⚠️  GOOGLE_PAYOUT_SHEET_ID missing — sheet sync disabled');
  }
}

// ── Build entry data object (fields matching sheet headers exactly) ──
function buildEntryData(entry) {
  const base = {
    MongoID: String(entry._id || ''),
    SubmittedBy: entry.SubmittedBy || '',
    Email: entry.Email || '',
    AccountId: entry.AccountId || '',
    X: entry.X || '',
    Insta: entry.Insta || '',
    RajasApproval: entry.RajasApproval || '',
    RajasRemark: entry.RajasRemark || '',
    RajasRejectReason: entry.RajasRejectReason || '',
    RajasBy: entry.RajasBy || '',
    RajasTime: entry.RajasTime || '',
    OpsApproval: entry.OpsApproval || '',
    OpsRemark: entry.OpsRemark || '',
    OpsBy: entry.OpsBy || '',
    OpsTime: entry.OpsTime || '',
    OpsRejectedBack: entry.OpsRejectedBack ? 'TRUE' : '',
    NainaApproval: entry.NainaApproval || '',
    NainaRemark: entry.NainaRemark || '',
    NainaRejectReason: entry.NainaRejectReason || '',
    NainaBy: entry.NainaBy || '',
    NainaTime: entry.NainaTime || '',
    DiscountCode: entry.DiscountCode || '',
    DiscountUsed: entry.DiscountUsed || '',
    SubmittedAt: entry.createdAt ? new Date(entry.createdAt).toISOString() : '',
    UpdatedAt: entry.updatedAt ? new Date(entry.updatedAt).toISOString() : new Date().toISOString(),
  };
  const out = {};
  for (const h of PAYOUT_HEADERS) { out[h] = base[h] !== undefined ? base[h] : ''; }
  return out;
}

// Convert a data object to an ordered array matching headers exactly
function dataToRow(data, headers) {
  return headers.map(h => data[h] !== undefined ? String(data[h]) : '');
}
async function findEntryRowByMongoId(sheet, mongoId) {
  await sheet.loadHeaderRow();
  const rows = await sheet.getRows();
  return rows.find(r => r.get('MongoID') === String(mongoId));
}

// Row lookup for submitters/roles by MongoID
async function findRowByMongoId(sheet, id) {
  await sheet.loadHeaderRow();
  const rows = await sheet.getRows();
  return rows.find(r => r.get('MongoID') === String(id));
}

async function syncEntryToSheet(entry) {
  if (!payoutReady || !payoutDoc) return;

  try {
    await payoutDoc.loadInfo();
    const sheet = payoutDoc.sheetsByTitle[PAYOUT_TABS.ENTRIES];
    if (!sheet) return;

    await sheet.loadHeaderRow();

    const data = buildEntryData(entry);
    const mongoId = String(entry._id || '');
    const existingRow = await findEntryRowByMongoId(sheet, mongoId);

    if (existingRow) {
      await updateRawRow(existingRow, PAYOUT_HEADERS, data);
    } else {
      await appendRawRow(sheet, PAYOUT_HEADERS, data);
    }
    console.log(`📊 Synced entry: ${entry.Email}`);
  } catch (e) { console.error('Sheet sync error (entry):', e.message); }
}

async function syncToAllDocs(tabKey, headers, data, id, deleted = false) {
  if (!payoutReady || !payoutDoc) return;
  try {
    await payoutDoc.loadInfo();
    const sheet = payoutDoc.sheetsByTitle[PAYOUT_TABS[tabKey]];
    if (!sheet) return;
    await sheet.loadHeaderRow();
    const row = await findRowByMongoId(sheet, id);
    if (deleted) { if (row) await row.delete(); return; }
    if (row) {
      await updateRawRow(row, headers, data);
    } else {
      await appendRawRow(sheet, headers, data);
    }
  } catch (e) { console.error(`Sheet sync error (${tabKey}):`, e.message); }
}

async function syncSubmitterToSheet(submitter, deleted = false) {
  const id = String(submitter._id);
  const data = { MongoID: id, Name: submitter.name || '', Email: submitter.email || '', Enabled: submitter.enabled ? 'TRUE' : 'FALSE' };
  await syncToAllDocs('SUBMITTERS', SUBMITTER_HEADERS, data, id, deleted);
}

async function syncRoleToSheet(role, deleted = false) {
  const id = String(role._id);
  const data = { MongoID: id, Name: role.name || '', Email: role.email || '', Role: role.role || '' };
  await syncToAllDocs('ROLES', ROLE_HEADERS, data, id, deleted);
}

// Append a row using positional values array — bypasses header-cache bugs in the library
async function appendRawRow(sheet, headers, data) {
  const values = headers.map(h => (data[h] !== undefined && data[h] !== null) ? String(data[h]) : '');
  await sheet.addRow(values);
}

// Batch append many rows in one API call — avoids 429 quota errors
async function appendRawRows(sheet, headers, dataArray) {
  if (!dataArray.length) return;
  // Load header so the library knows column mapping
  await sheet.loadHeaderRow();
  const rows = dataArray.map(data =>
    headers.map(h => (data[h] !== undefined && data[h] !== null) ? String(data[h]) : '')
  );
  await sheet.addRows(rows);
}

// Update existing row cells by position
async function updateRawRow(row, headers, data) {
  headers.forEach((h, i) => {
    const v = (data[h] !== undefined && data[h] !== null) ? String(data[h]) : '';
    row._rawData[i] = v;
  });
  await row.save();
}

// Clear all data rows (keeps header) — 1 API call instead of delete+recreate
async function clearSheetRows(sheet) {
  try {
    const rows = await sheet.getRows();
    if (rows.length === 0) return;
    // Use batchDelete via clearRows if available, else delete in one shot
    await sheet.clearRows({ start: 1, end: rows.length + 1 });
  } catch {
    // fallback: clear entire sheet then restore header
    await sheet.clear();
    await sheet.setHeaderRow(
      sheet.headerValues && sheet.headerValues.length
        ? sheet.headerValues
        : []
    );
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fullResync() {
  if (!payoutReady) return { ok: false, reason: 'No sheet connected' };
  try {
    const entries = await Entry.find().lean();
    const submitters = await Submitter.find().lean();
    const roles = await Role.find().lean();

    await payoutDoc.loadInfo();

    // Helper — wipe data rows only, keep/restore header
    async function wipeAndPrepare(tabName, headers) {
      let sheet = payoutDoc.sheetsByTitle[tabName];
      if (!sheet) {
        sheet = await payoutDoc.addSheet({ title: tabName, headerValues: headers });
        await sleep(600);
        await payoutDoc.loadInfo();
        return payoutDoc.sheetsByTitle[tabName];
      }
      // Clear everything then restore header row in one write
      await sheet.clear();
      await sleep(600);
      await sheet.setHeaderRow(headers);
      await sleep(600);
      return sheet;
    }

    // ── Entries ──
    const entrySheet = await wipeAndPrepare(PAYOUT_TABS.ENTRIES, PAYOUT_HEADERS);
    await sleep(800);
    if (entries.length) {
      await appendRawRows(entrySheet, PAYOUT_HEADERS, entries.map(e => buildEntryData(e)));
    }
    await sleep(800);

    // ── Submitters ──
    const subSheet = await wipeAndPrepare(PAYOUT_TABS.SUBMITTERS, SUBMITTER_HEADERS);
    await sleep(800);
    if (submitters.length) {
      await appendRawRows(subSheet, SUBMITTER_HEADERS, submitters.map(s => ({
        MongoID: String(s._id), Name: s.name || '', Email: s.email || '', Enabled: s.enabled ? 'TRUE' : 'FALSE'
      })));
    }
    await sleep(800);

    // ── Roles ──
    const roleSheet = await wipeAndPrepare(PAYOUT_TABS.ROLES, ROLE_HEADERS);
    await sleep(800);
    if (roles.length) {
      await appendRawRows(roleSheet, ROLE_HEADERS, roles.map(r => ({
        MongoID: String(r._id), Name: r.name || '', Email: r.email || '', Role: r.role || ''
      })));
    }

    console.log(`✅ Resync complete — ${entries.length} entries, ${submitters.length} submitters, ${roles.length} roles`);
    return { ok: true, counts: { entries: entries.length, submitters: submitters.length, roles: roles.length } };
  } catch (e) { return { ok: false, reason: e.message }; }
}

// ── Express app ──
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ── MongoDB Connection ──
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/flowdesk';
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected:', MONGO_URI);
    initGoogleSheets();
  })
  .catch(err => { console.error('❌ MongoDB error:', err.message); process.exit(1); });

function ok(res, data) { res.json({ success: true, ...data }); }
function err(res, msg, code = 400) { res.status(code).json({ success: false, error: msg }); }

// ═══════════════════════════════════════════
// ENTRIES
// ═══════════════════════════════════════════

app.get('/api/entries', async (req, res) => {
  try {
    const docs = await Entry.find().sort({ createdAt: -1 }).lean();
    const entries = docs.map((e, i) => ({ ...e, _id: e._id.toString(), _row: i }));
    ok(res, { entries });
  } catch (e) { err(res, e.message, 500); }
});

// ── History Sheet Check ──
async function isEmailInHistorySheet(email) {
  if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) return false;
  const historySheetId = process.env.GOOGLE_HISTORY_SHEET_ID;
  if (!historySheetId) return false;
  try {
    const doc = new GoogleSpreadsheet(historySheetId, makeAuth());
    await doc.loadInfo();
    // Check all sheets/tabs for the email
    for (const sheet of Object.values(doc.sheetsByIndex)) {
      try {
        await sheet.loadHeaderRow();
        const rows = await sheet.getRows();
        for (const row of rows) {
          // Try common email column names
          const cellEmail = (row.get('Email') || row.get('email') || row.get('EMAIL') || '').toString().trim().toLowerCase();
          if (cellEmail === email.toLowerCase().trim()) return true;
        }
      } catch { continue; }
    }
    return false;
  } catch (e) { console.error('History sheet check failed:', e.message); return false; }
}

app.post('/api/entries', async (req, res) => {
  try {
    const body = { ...req.body };
    const email = (body.Email || '').toLowerCase().trim();

    // ── Check history sheet first ──
    if (email) {
      const inHistory = await isEmailInHistorySheet(email);
      if (inHistory) {
        const now = new Date().toISOString();
        body.NainaApproval = 'Rejected';
        body.NainaRejectReason = 'Auto-rejected: email found in historical payout records.';
        body.NainaBy = 'System';
        body.NainaTime = now;
        ['RajasApproval', 'RajasBy', 'RajasTime', 'RajasRejectReason',
          'OpsApproval', 'OpsBy', 'OpsTime'].forEach(k => { body[k] = ''; });
        const doc = await Entry.create(body);
        syncEntryToSheet(doc).catch(e => console.error('Sheet sync:', e.message));
        return ok(res, { entry: doc, autoRejected: true, reason: 'history' });
      }
    }

    // ── Check if email already has a bonus ──
    if (email) {
      const hasBonusAlready = await Entry.findOne({
        Email: { $regex: new RegExp(`^${email}$`, 'i') },
        BonusPct: { $exists: true, $ne: '' },
      }).lean();
      if (hasBonusAlready) {
        body.BonusStatus = 'Bonus Get';
        ['RajasApproval', 'RajasBy', 'RajasTime', 'RajasRejectReason',
          'NainaApproval', 'NainaBy', 'NainaTime', 'NainaRejectReason'].forEach(k => { body[k] = ''; });
      }
    }

    // ── Check if email already has a Naina final-approved entry ──
    if (email) {
      const hasNainaApproved = await Entry.findOne({
        Email: { $regex: new RegExp(`^${email}$`, 'i') },
        NainaApproval: 'Approved',
      }).lean();
      if (hasNainaApproved) {
        const now = new Date().toISOString();
        body.NainaApproval = 'Rejected';
        body.NainaRejectReason = 'Auto-rejected: this email already has a final Naina approval.';
        body.NainaBy = 'System';
        body.NainaTime = now;
        ['RajasApproval', 'RajasBy', 'RajasTime', 'RajasRejectReason',
          'OpsApproval', 'OpsBy', 'OpsTime'].forEach(k => { body[k] = ''; });
      }
    }

    const doc = await Entry.create(body);
    syncEntryToSheet(doc).catch(e => console.error('Sheet sync:', e.message));
    notifySubmitted(doc).catch(() => { });
    ok(res, { entry: doc });
  } catch (e) { err(res, e.message, 500); }
});

app.patch('/api/entries/:id', async (req, res) => {
  try {
    const prev = await Entry.findById(req.params.id).lean();
    const doc = await Entry.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!doc) return err(res, 'Entry not found', 404);
    syncEntryToSheet(doc).catch(e => console.error('Sheet sync:', e.message));

    // Fire notification based on what changed
    const b = req.body;
    if (b.RajasApproval && b.RajasApproval !== prev?.RajasApproval) {
      notifyRajas(doc, b.RajasApproval, b.RajasRejectReason || '').catch(() => { });
    } else if (b.OpsApproval && b.OpsApproval !== prev?.OpsApproval) {
      notifyOps(doc, b.OpsApproval, b.OpsRemark || '', !!b.OpsRejectedBack).catch(() => { });
    } else if (b.OpsRejectedBack && !prev?.OpsRejectedBack) {
      notifyOps(doc, '', b.OpsRemark || '', true).catch(() => { });
    } else if (b.NainaApproval && b.NainaApproval !== prev?.NainaApproval) {
      notifyNaina(doc, b.NainaApproval, b.NainaRejectReason || '').catch(() => { });
    }

    ok(res, { entry: doc });
  } catch (e) { err(res, e.message, 500); }
});

app.delete('/api/entries/:id', async (req, res) => {
  try {
    const doc = await Entry.findById(req.params.id).lean();
    if (!doc) return err(res, 'Entry not found', 404);
    await Entry.findByIdAndDelete(req.params.id);
    // Remove from sheet
    if (payoutReady && payoutDoc) {
      try {
        await payoutDoc.loadInfo();
        const sheet = payoutDoc.sheetsByTitle[PAYOUT_TABS.ENTRIES];
        if (sheet) {
          await sheet.loadHeaderRow();
          const row = await findEntryRowByMongoId(sheet, String(doc._id));
          if (row) await row.delete();
        }
      } catch (e) { console.error('Sheet delete error:', e.message); }
    }
    ok(res, {});
  } catch (e) { err(res, e.message, 500); }
});

// ═══════════════════════════════════════════
// ROLES
// ═══════════════════════════════════════════

app.post('/api/roles/verify', async (req, res) => {
  try {
    const email = (req.body.email || '').toLowerCase().trim();
    const role = (req.body.role || '').toLowerCase().trim();
    if (!email || !role) return err(res, 'Email and role required');
    const match = await Role.findOne({ email, role }).lean();
    if (!match) return res.json({ success: false, allowed: false });
    res.json({ success: true, allowed: true, name: match.name || email });
  } catch (e) { err(res, e.message, 500); }
});

app.get('/api/roles', async (req, res) => {
  try {
    const roles = await Role.find().lean();
    ok(res, { roles });
  } catch (e) { err(res, e.message, 500); }
});

app.post('/api/roles', async (req, res) => {
  try {
    const { email, role, name } = req.body;
    if (!email || !role) return err(res, 'Email and role required');
    const doc = await Role.findOneAndUpdate(
      { email: email.toLowerCase(), role: role.toLowerCase() },
      { name: name || '' },
      { upsert: true, new: true }
    );
    syncRoleToSheet(doc).catch(e => console.error('Sheet sync:', e.message));
    ok(res, { role: doc });
  } catch (e) { err(res, e.message, 500); }
});

app.delete('/api/roles/:id', async (req, res) => {
  try {
    const doc = await Role.findById(req.params.id).lean();
    await Role.findByIdAndDelete(req.params.id);
    if (doc) syncRoleToSheet(doc, true).catch(e => console.error('Sheet sync:', e.message));
    ok(res, {});
  } catch (e) { err(res, e.message, 500); }
});

// ═══════════════════════════════════════════
// SUBMITTERS
// ═══════════════════════════════════════════

app.get('/api/submitters', async (req, res) => {
  try {
    const submitters = await Submitter.find().lean();
    ok(res, { submitters });
  } catch (e) { err(res, e.message, 500); }
});

app.post('/api/submitters', async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) return err(res, 'Name and email required');
    const existing = await Submitter.findOne({ email: email.toLowerCase() });
    if (existing) return err(res, 'Email already in list');
    const doc = await Submitter.create({ name, email, enabled: true });
    syncSubmitterToSheet(doc).catch(e => console.error('Sheet sync:', e.message));
    ok(res, { submitter: doc });
  } catch (e) { err(res, e.message, 500); }
});

app.patch('/api/submitters/:id', async (req, res) => {
  try {
    const doc = await Submitter.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!doc) return err(res, 'Submitter not found', 404);
    syncSubmitterToSheet(doc).catch(e => console.error('Sheet sync:', e.message));
    ok(res, { submitter: doc });
  } catch (e) { err(res, e.message, 500); }
});

app.delete('/api/submitters/:id', async (req, res) => {
  try {
    const doc = await Submitter.findById(req.params.id).lean();
    await Submitter.findByIdAndDelete(req.params.id);
    if (doc) syncSubmitterToSheet(doc, true).catch(e => console.error('Sheet sync:', e.message));
    ok(res, {});
  } catch (e) { err(res, e.message, 500); }
});

// ═══════════════════════════════════════════
// GOOGLE SHEETS — Status & Admin Resync
// ═══════════════════════════════════════════

app.get('/api/sheets/status', (req, res) => {
  res.json({
    success: true,
    payout: {
      connected: payoutReady,
      sheetTitle: payoutDoc?.title || null,
      sheetId: PAYOUT_SHEET_ID || null,
    },
  });
});

app.post('/api/sheets/resync', async (req, res) => {
  try {
    const result = await fullResync();
    if (!result.ok) return err(res, result.reason);
    ok(res, { counts: result.counts });
  } catch (e) { err(res, e.message, 500); }
});

// ═══════════════════════════════════════════
// CONFIG (webhook etc.)
// ═══════════════════════════════════════════

app.get('/api/config', async (req, res) => {
  try {
    const configs = await Config.find().lean();
    const result = {};
    configs.forEach(c => { result[c.key] = c.value; });
    ok(res, { config: result });
  } catch (e) { err(res, e.message, 500); }
});

app.post('/api/config', async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) return err(res, 'Key required');
    await Config.findOneAndUpdate({ key }, { value: value || '' }, { upsert: true, new: true });
    ok(res, {});
  } catch (e) { err(res, e.message, 500); }
});

app.post('/api/config/test-webhook', async (req, res) => {
  try {
    await sendGChatNotification('🔔 *FlowDesk* — Test ping! Notifications are working correctly.');
    ok(res, {});
  } catch (e) { err(res, e.message, 500); }
});

// ── Serve HTML ──
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'FlowDesk.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 FlowDesk running at http://localhost:${PORT}`));