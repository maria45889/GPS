const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'gps.db');
let db;
let SQL;

async function initDb() {
  if (!SQL) SQL = await initSqlJs();
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(fileBuffer);
    } else {
      db = new SQL.Database();
      initSchema();
      saveDb();
    }
  }
  return db;
}

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

function initSchema() {
  db.run("CREATE TABLE IF NOT EXISTS devices (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL DEFAULT 'Mi dispositivo', token TEXT NOT NULL UNIQUE, created_at TEXT DEFAULT (datetime('now')))");
  db.run("CREATE TABLE IF NOT EXISTS locations (id INTEGER PRIMARY KEY AUTOINCREMENT, device_id INTEGER NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL, accuracy REAL, altitude REAL, speed REAL, bearing REAL, battery REAL, timestamp TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (device_id) REFERENCES devices(id))");
  db.run("CREATE TABLE IF NOT EXISTS geofences (id INTEGER PRIMARY KEY AUTOINCREMENT, device_id INTEGER NOT NULL, name TEXT NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL, radius REAL NOT NULL, enabled INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (device_id) REFERENCES devices(id))");
  db.run("CREATE TABLE IF NOT EXISTS geofence_events (id INTEGER PRIMARY KEY AUTOINCREMENT, geofence_id INTEGER NOT NULL, device_id INTEGER NOT NULL, event_type TEXT NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL, timestamp TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (geofence_id) REFERENCES geofences(id), FOREIGN KEY (device_id) REFERENCES devices(id))");
}

async function registerDevice(name) {
  await initDb();
  const { randomBytes } = require('crypto');
  const token = randomBytes(16).toString('hex');
  db.run('INSERT INTO devices (name, token) VALUES (?, ?)', [name, token]);
  const result = db.exec('SELECT last_insert_rowid() as id')[0];
  const id = result.values[0][0];
  saveDb();
  return { id, name, token };
}

async function getDeviceByToken(token) {
  await initDb();
  const result = db.exec('SELECT * FROM devices WHERE token = ?', [token]);
  if (result.length === 0) return null;
  const columns = result[0].columns;
  const values = result[0].values[0];
  const row = {};
  columns.forEach((col, i) => row[col] = values[i]);
  return row;
}

async function insertLocation(deviceId, data) {
  await initDb();
  if (data.accuracy && data.accuracy > 100) return null;
  db.run('INSERT INTO locations (device_id, latitude, longitude, accuracy, altitude, speed, bearing, battery) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [deviceId, data.latitude, data.longitude, data.accuracy || null, data.altitude || null, data.speed || null, data.bearing || null, data.battery || null]);
  const result = db.exec('SELECT last_insert_rowid() as id')[0];
  const id = result.values[0][0];
  saveDb();
  return id;
}

async function getLatestLocation(deviceId) {
  await initDb();
  const result = db.exec('SELECT * FROM locations WHERE device_id = ? ORDER BY timestamp DESC LIMIT 1', [deviceId]);
  if (result.length === 0) return null;
  const columns = result[0].columns;
  const values = result[0].values[0];
  const row = {};
  columns.forEach((col, i) => row[col] = values[i]);
  return row;
}

async function getLatestLocationAny() {
  await initDb();
  const result = db.exec('SELECT * FROM locations ORDER BY timestamp DESC LIMIT 1');
  if (result.length === 0) return null;
  const columns = result[0].columns;
  const values = result[0].values[0];
  const row = {};
  columns.forEach((col, i) => row[col] = values[i]);
  return row;
}

async function getLocationHistory(deviceId, limit = 500, offset = 0) {
  await initDb();
  const result = db.exec('SELECT * FROM locations WHERE device_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?', [deviceId, limit, offset]);
  if (result.length === 0) return [];
  const columns = result[0].columns;
  return result[0].values.map(values => {
    const row = {};
    columns.forEach((col, i) => row[col] = values[i]);
    return row;
  });
}

async function getAllDevices() {
  await initDb();
  const result = db.exec('SELECT * FROM devices ORDER BY created_at DESC');
  if (result.length === 0) return [];
  const columns = result[0].columns;
  return result[0].values.map(values => {
    const row = {};
    columns.forEach((col, i) => row[col] = values[i]);
    return row;
  });
}

async function getDeviceById(id) {
  await initDb();
  const result = db.exec('SELECT * FROM devices WHERE id = ?', [id]);
  if (result.length === 0) return null;
  const columns = result[0].columns;
  const values = result[0].values[0];
  const row = {};
  columns.forEach((col, i) => row[col] = values[i]);
  return row;
}

async function deleteDevice(id) {
  await initDb();
  db.run('DELETE FROM locations WHERE device_id = ?', [id]);
  db.run('DELETE FROM devices WHERE id = ?', [id]);
  saveDb();
  return true;
}

async function updateDeviceName(id, name) {
  await initDb();
  db.run('UPDATE devices SET name = ? WHERE id = ?', [name, id]);
  saveDb();
  const device = await getDeviceById(id);
  return device;
}

async function createGeofence(deviceId, data) {
  await initDb();
  db.run('INSERT INTO geofences (device_id, name, latitude, longitude, radius) VALUES (?, ?, ?, ?, ?)', [deviceId, data.name, data.latitude, data.longitude, data.radius]);
  const result = db.exec('SELECT last_insert_rowid() as id')[0];
  const id = result.values[0][0];
  saveDb();
  return { id, deviceId, name: data.name, latitude: data.latitude, longitude: data.longitude, radius: data.radius, enabled: true };
}

async function getGeofences(deviceId) {
  await initDb();
  const result = db.exec('SELECT * FROM geofences WHERE device_id = ?', [deviceId]);
  if (result.length === 0) return [];
  const columns = result[0].columns;
  return result[0].values.map(values => {
    const row = {};
    columns.forEach((col, i) => row[col] = values[i]);
    return row;
  });
}

async function deleteGeofence(id) {
  await initDb();
  db.run('DELETE FROM geofence_events WHERE geofence_id = ?', [id]);
  db.run('DELETE FROM geofences WHERE id = ?', [id]);
  saveDb();
  return true;
}

async function logGeofenceEvent(geofenceId, deviceId, eventType, latitude, longitude) {
  await initDb();
  db.run('INSERT INTO geofence_events (geofence_id, device_id, event_type, latitude, longitude) VALUES (?, ?, ?, ?, ?)', [geofenceId, deviceId, eventType, latitude, longitude]);
  saveDb();
}

async function getGeofenceEvents(geofenceId) {
  await initDb();
  const result = db.exec('SELECT * FROM geofence_events WHERE geofence_id = ? ORDER BY timestamp DESC', [geofenceId]);
  if (result.length === 0) return [];
  const columns = result[0].columns;
  return result[0].values.map(values => {
    const row = {};
    columns.forEach((col, i) => row[col] = values[i]);
    return row;
  });
}

async function getDeviceStats(deviceId) {
  await initDb();
  const totalResult = db.exec('SELECT COUNT(*) as total FROM locations WHERE device_id = ?', [deviceId]);
  const total = totalResult[0].values[0][0];
  return { totalLocations: total, avgAccuracy: 0, maxSpeed: 0, avgSpeed: 0, avgBattery: 0 };
}

module.exports = { initDb, saveDb, registerDevice, getDeviceByToken, insertLocation, getLatestLocation, getLatestLocationAny, getLocationHistory, getAllDevices, getDeviceById, deleteDevice, updateDeviceName, createGeofence, getGeofences, deleteGeofence, logGeofenceEvent, getGeofenceEvents, getDeviceStats };