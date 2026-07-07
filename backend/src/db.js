const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'gps.db');

let db;
let SQL;

async function initDb() {
  if (!SQL) {
    SQL = await initSqlJs();
  }

  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Cargar base de datos existente o crear nueva
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
  db.run(`
    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL DEFAULT 'Mi dispositivo',
      token TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      accuracy REAL,
      altitude REAL,
      speed REAL,
      bearing REAL,
      battery REAL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (device_id) REFERENCES devices(id)
    );
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_locations_device_ts ON locations(device_id, timestamp DESC)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_locations_accuracy ON locations(accuracy)`);
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

async function insertLocation(deviceId, { latitude, longitude, accuracy, altitude, speed, bearing, battery }) {
  await initDb();
  
  // Filtro: descartar lecturas con precisión > 100m (mala señal)
  if (accuracy && accuracy > 100) {
    return null;
  }

  db.run(
    `INSERT INTO locations (device_id, latitude, longitude, accuracy, altitude, speed, bearing, battery)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [deviceId, latitude, longitude, accuracy || null, altitude || null, speed || null, bearing || null, battery || null]
  );
  
  const result = db.exec('SELECT last_insert_rowid() as id')[0];
  const id = result.values[0][0];
  
  saveDb();
  return id;
}

async function getLatestLocation(deviceId) {
  await initDb();
  const result = db.exec(
    `SELECT * FROM locations WHERE device_id = ? ORDER BY timestamp DESC LIMIT 1`,
    [deviceId]
  );
  if (result.length === 0) return null;
  
  const columns = result[0].columns;
  const values = result[0].values[0];
  const row = {};
  columns.forEach((col, i) => row[col] = values[i]);
  return row;
}

async function getLocationHistory(deviceId, limit = 500, offset = 0) {
  await initDb();
  const result = db.exec(
    `SELECT * FROM locations WHERE device_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
    [deviceId, limit, offset]
  );
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

module.exports = {
  registerDevice,
  getDeviceByToken,
  insertLocation,
  getLatestLocation,
  getLocationHistory,
  getAllDevices,
  getDeviceById,
};
