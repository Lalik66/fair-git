const Database = require('better-sqlite3');
const db = new Database('./backend/prisma/dev.db');
const users = db.prepare('SELECT email, role FROM User WHERE role = ?').all('admin');
console.log(JSON.stringify(users, null, 2));
db.close();
