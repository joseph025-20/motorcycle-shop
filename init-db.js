// init-db.js - minimal SQLite init (creates DB file and a products table)
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data.sqlite');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    sku TEXT,
    price INTEGER,
    stock INTEGER,
    category TEXT,
    image TEXT,
    description TEXT,
    createdAt TEXT
  )`);
});

db.close(() => {
  console.log('init-db: done');
});
