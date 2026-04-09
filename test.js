const { getDb } = require('./database.js');
const db = getDb();

try {
    db.exec(`ALTER TABLE sales ADD COLUMN return_status TEXT DEFAULT 'none'`);
    console.log("✅ Added return_status column");
} catch(e) { 
    console.log("⚠️ return_status column already exists:", e.message); 
}

try {
    db.exec(`ALTER TABLE sales ADD COLUMN total_returned_amount DECIMAL(10,2) DEFAULT 0`);
    console.log("✅ Added total_returned_amount column");
} catch(e) { 
    console.log("⚠️ total_returned_amount column already exists:", e.message); 
}

const tableInfo = db.prepare("PRAGMA table_info(sales)").all();
console.log("Sales table columns:", tableInfo.map(col => col.name));
console.log("✅ Migration completed");