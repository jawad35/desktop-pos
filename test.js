// fix-database.js
import Database from 'better-sqlite3';

const dbPath = '/Users/macbookpro/Library/Application Support/electron/pos.db';
const db = new Database(dbPath);

console.log('Running migration on:', dbPath);

// Create sale_payments table
db.exec(`
    CREATE TABLE IF NOT EXISTS sale_payments (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        sale_id TEXT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_method TEXT NOT NULL,
        payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        remaining_due DECIMAL(10,2),
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
    )
`);
console.log('✅ Created sale_payments table');

// Create indexes
db.exec(`CREATE INDEX IF NOT EXISTS idx_sale_payments_sale_id ON sale_payments(sale_id)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_sale_payments_date ON sale_payments(payment_date)`);
console.log('✅ Created indexes');

// Add columns if missing
try { db.exec(`ALTER TABLE sales ADD COLUMN paid_amount DECIMAL(10,2) DEFAULT 0`); console.log('✅ Added paid_amount'); } catch(e) {}
try { db.exec(`ALTER TABLE sales ADD COLUMN due_amount DECIMAL(10,2) DEFAULT 0`); console.log('✅ Added due_amount'); } catch(e) {}
try { db.exec(`ALTER TABLE sales ADD COLUMN due_date DATE`); console.log('✅ Added due_date'); } catch(e) {}
try { db.exec(`ALTER TABLE sales ADD COLUMN due_reason TEXT`); console.log('✅ Added due_reason'); } catch(e) {}

console.log('✅ Migration completed!');