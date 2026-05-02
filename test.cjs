// run-migration.cjs
const { app } = require('electron');
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), 'Library/Application Support/electron', 'pos.db');
console.log('Database path:', dbPath);

try {
    const db = new Database(dbPath);
    console.log('Connected to database');
    
    console.log('Migrating employee tables...');

    // Add new columns to employees table
    try {
        db.exec(`ALTER TABLE employees ADD COLUMN payment_type TEXT DEFAULT 'fixed'`);
        console.log('✅ Added payment_type column');
    } catch(e) { console.log('payment_type column already exists'); }

    try {
        db.exec(`ALTER TABLE employees ADD COLUMN daily_rate DECIMAL(10,2) DEFAULT 0`);
        console.log('✅ Added daily_rate column');
    } catch(e) { console.log('daily_rate column already exists'); }

    try {
        db.exec(`ALTER TABLE employees ADD COLUMN weekly_rate DECIMAL(10,2) DEFAULT 0`);
        console.log('✅ Added weekly_rate column');
    } catch(e) { console.log('weekly_rate column already exists'); }

    try {
        db.exec(`ALTER TABLE employees ADD COLUMN hourly_rate DECIMAL(10,2) DEFAULT 0`);
        console.log('✅ Added hourly_rate column');
    } catch(e) { console.log('hourly_rate column already exists'); }

    try {
        db.exec(`ALTER TABLE employees ADD COLUMN contract_amount DECIMAL(10,2) DEFAULT 0`);
        console.log('✅ Added contract_amount column');
    } catch(e) { console.log('contract_amount column already exists'); }

    try {
        db.exec(`ALTER TABLE employees ADD COLUMN contract_start_date DATE`);
        console.log('✅ Added contract_start_date column');
    } catch(e) { console.log('contract_start_date column already exists'); }

    try {
        db.exec(`ALTER TABLE employees ADD COLUMN contract_end_date DATE`);
        console.log('✅ Added contract_end_date column');
    } catch(e) { console.log('contract_end_date column already exists'); }

    // Create employee_payments table
    db.exec(`
        CREATE TABLE IF NOT EXISTS employee_payments (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            employee_id TEXT NOT NULL,
            payment_date DATETIME NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            payment_type TEXT NOT NULL,
            period_start DATE,
            period_end DATE,
            description TEXT,
            status TEXT DEFAULT 'completed',
            payment_method TEXT DEFAULT 'cash',
            reference_id TEXT,
            user_id TEXT NOT NULL,
            shop_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
        )
    `);
    console.log('✅ Created employee_payments table');

    // Create indexes for employee_payments
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_employee_payments_employee ON employee_payments(employee_id);
        CREATE INDEX IF NOT EXISTS idx_employee_payments_date ON employee_payments(payment_date);
    `);
    console.log('✅ Created indexes for employee_payments');

    // Create employee_advances table
    db.exec(`
        CREATE TABLE IF NOT EXISTS employee_advances (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            employee_id TEXT NOT NULL,
            advance_date DATETIME NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            paid_amount DECIMAL(10,2) DEFAULT 0,
            remaining_amount DECIMAL(10,2) NOT NULL,
            reason TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            expected_deduction_date DATE,
            user_id TEXT NOT NULL,
            shop_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
        )
    `);
    console.log('✅ Created employee_advances table');

    // Create indexes for employee_advances
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_employee_advances_employee ON employee_advances(employee_id);
        CREATE INDEX IF NOT EXISTS idx_employee_advances_status ON employee_advances(status);
    `);
    console.log('✅ Created indexes for employee_advances');

    console.log('Migration completed successfully!');
    db.close();
    
} catch (error) {
    console.error('Migration failed:', error.message);
}

app.quit();