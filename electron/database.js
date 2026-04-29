import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let dbInstance = null;

export function initDatabase(dbPath) {
    // Create directory if it doesn't exist
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    const db = new Database(dbPath);

    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    // Create all tables
    createAllTables(db);

    console.log('✅ All database tables created successfully');

    dbInstance = db;
    return db;
}

export function getDb() {
    if (!dbInstance) {
        throw new Error('Database not initialized. Call initDatabase first.');
    }
    return dbInstance;
}

function createAllTables(db) {
    // 1. Sessions table
    db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
            sid TEXT PRIMARY KEY,
            sess TEXT NOT NULL,
            expire INTEGER NOT NULL
        )
    `);

    db.exec(`CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions(expire)`);

    // 2. Categories table
    db.exec(`
        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            name TEXT NOT NULL,
            description TEXT,
            parent_id TEXT,
            user_id TEXT NOT NULL,
            shop_id TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 3. Brands table
    db.exec(`
        CREATE TABLE IF NOT EXISTS brands (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            name TEXT NOT NULL,
            description TEXT,
            user_id TEXT NOT NULL,
            shop_id TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 4. Suppliers table
    db.exec(`
        CREATE TABLE IF NOT EXISTS suppliers (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            name TEXT NOT NULL,
            selling TEXT,
            phone TEXT,
            email TEXT,
            address TEXT,
            city TEXT,
            vehicle_info TEXT,
            user_id TEXT NOT NULL,
            shop_id TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 5. Products table
    db.exec(`
        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            name TEXT NOT NULL,
            sku TEXT UNIQUE NOT NULL,
            barcode TEXT,
            description TEXT,
            category_id TEXT,
            brand_id TEXT,
            supplier_id TEXT,
            user_id TEXT NOT NULL,
            shop_id TEXT NOT NULL,
            cost_price DECIMAL(10,2) NOT NULL,
            selling_price DECIMAL(10,2) NOT NULL,
            tax_rate DECIMAL(5,2) DEFAULT 0,
            discount DECIMAL(5,2) DEFAULT 0,
            stock INTEGER DEFAULT 0,
            min_stock INTEGER DEFAULT 0,
            unit_of_measure TEXT DEFAULT 'piece',
            weight DECIMAL(8,3) DEFAULT 0,
            colors TEXT,
            sizes TEXT,
            material TEXT,
            tags TEXT,
            product_type TEXT DEFAULT 'physical',
            warranty INTEGER DEFAULT 0,
            expiry_date DATETIME,
            manufacturer TEXT,
            country_of_origin TEXT,
            is_active INTEGER DEFAULT 1,
            image_url TEXT,
            image_public_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories(id),
            FOREIGN KEY (brand_id) REFERENCES brands(id),
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        )
    `);

    // 6. Product Images table
    db.exec(`
        CREATE TABLE IF NOT EXISTS product_images (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            product_id TEXT NOT NULL,
            image_url TEXT NOT NULL,
            image_public_id TEXT NOT NULL,
            is_primary INTEGER DEFAULT 0,
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )
    `);

    // 7. Product Variants table
    db.exec(`
        CREATE TABLE IF NOT EXISTS product_variants (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            product_id TEXT NOT NULL,
            sku TEXT NOT NULL,
            barcode TEXT,
            attributes TEXT,
            cost_price DECIMAL(10,2),
            selling_price DECIMAL(10,2),
            stock INTEGER DEFAULT 0,
            image_url TEXT,
            image_public_id TEXT,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )
    `);

    // 8. Sales table - add returned_items column
    db.exec(`
    CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        receipt_number TEXT UNIQUE NOT NULL,
        customer_name TEXT,
        customer_phone TEXT,
        subtotal DECIMAL(10,2) NOT NULL,
        tax DECIMAL(10,2) DEFAULT 0,
        discount DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2) NOT NULL,
        payment_method TEXT DEFAULT 'cash',
        account_number TEXT,
        payment_status TEXT DEFAULT 'completed',
        employee_id TEXT,
        user_id TEXT NOT NULL,
        shop_id TEXT NOT NULL,
        return_status TEXT DEFAULT 'none',
        total_returned_amount DECIMAL(10,2) DEFAULT 0,
        returned_items TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
`);



    db.exec(`CREATE INDEX IF NOT EXISTS idx_sales_receipt ON sales(receipt_number)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at)`);

    // 9. Sale Items table
    db.exec(`
    CREATE TABLE IF NOT EXISTS sale_items (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        sale_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        profit DECIMAL(10,2) DEFAULT 0,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
    )
`);

    // 10. Returns table
    db.exec(`
        CREATE TABLE IF NOT EXISTS returns (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            receipt_number TEXT NOT NULL,
            original_sale_id TEXT NOT NULL,
            customer_name TEXT,
            customer_phone TEXT,
            subtotal DECIMAL(10,2) NOT NULL,
            tax DECIMAL(10,2) DEFAULT 0,
            discount DECIMAL(10,2) DEFAULT 0,
            return_fee DECIMAL(10,2) DEFAULT 0,
            total DECIMAL(10,2) NOT NULL,
            return_reason TEXT,
            payment_method TEXT DEFAULT 'cash',
            payment_status TEXT DEFAULT 'completed',
            account_number TEXT,
            user_id TEXT NOT NULL,
            shop_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 11. Return Items table
    db.exec(`
    CREATE TABLE IF NOT EXISTS return_items (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        return_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        profit_loss DECIMAL(10,2) DEFAULT 0,
        FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
    )
`);

    // 12. Purchases table
    db.exec(`
        CREATE TABLE IF NOT EXISTS purchases (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            po_number TEXT UNIQUE NOT NULL,
            supplier_id TEXT NOT NULL,
            subtotal DECIMAL(10,2) NOT NULL,
            tax DECIMAL(10,2) DEFAULT 0,
            total DECIMAL(10,2) NOT NULL,
            status TEXT DEFAULT 'pending',
            account_number TEXT,
            payment_status TEXT DEFAULT 'pending',
            payment_method TEXT DEFAULT 'cash',
            items_description TEXT,
            user_id TEXT NOT NULL,
            shop_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        )
    `);

    // 13. Purchase Items table
    db.exec(`
        CREATE TABLE IF NOT EXISTS purchase_items (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            purchase_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            unit_price DECIMAL(10,2) NOT NULL,
            total DECIMAL(10,2) NOT NULL,
            FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products(id)
        )
    `);

    // 14. Expenses table
    db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        title TEXT NOT NULL,
        description TEXT,
        amount DECIMAL(10,2) NOT NULL,
        category TEXT NOT NULL,
        account_number TEXT,
        payment_method TEXT DEFAULT 'cash',
        receipt_number TEXT,
        frequency TEXT DEFAULT 'one-time',
        is_recurring INTEGER DEFAULT 0,
        user_id TEXT NOT NULL,
        shop_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

    // 15. Transaction Logs table
    db.exec(`
        CREATE TABLE IF NOT EXISTS transaction_logs (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            transaction_id TEXT NOT NULL,
            type TEXT NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            description TEXT,
            payment_method TEXT DEFAULT 'cash',
            account_number TEXT,
            cash_flow TEXT,
            user_id TEXT NOT NULL,
            shop_id TEXT NOT NULL,
            related_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 16. Settings table
    db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            tax DECIMAL(5,2) NOT NULL DEFAULT 0,
            discount DECIMAL(5,2) NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Insert default settings if not exists
    db.exec(`
        INSERT OR IGNORE INTO settings (id, tax, discount) 
        VALUES ('default', 0, 0)
    `);

    // 17. Employees table
    db.exec(`
        CREATE TABLE IF NOT EXISTS employees (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            salary DECIMAL(10,2) NOT NULL,
            salary_type TEXT NOT NULL DEFAULT 'monthly',
            payment_method TEXT NOT NULL DEFAULT 'cash',
            shift TEXT NOT NULL DEFAULT 'day',
            employee_type TEXT NOT NULL DEFAULT 'labor',
            join_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            leave_date DATETIME,
            is_active INTEGER NOT NULL DEFAULT 1,
            user_id TEXT NOT NULL,
            shop_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.exec(`CREATE INDEX IF NOT EXISTS idx_employee_phone ON employees(phone)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_employee_user ON employees(user_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_employee_active ON employees(is_active)`);

    // 18. Attendance table
    db.exec(`
        CREATE TABLE IF NOT EXISTS attendance (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            employee_id TEXT NOT NULL,
            date DATETIME NOT NULL,
            status TEXT NOT NULL DEFAULT 'present',
            check_in TEXT,
            check_out TEXT,
            notes TEXT,
            user_id TEXT NOT NULL,
            shop_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
        )
    `);

    db.exec(`CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date)`);

    // 19. Salaries table
    db.exec(`
        CREATE TABLE IF NOT EXISTS salaries (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            employee_id TEXT NOT NULL,
            month TEXT NOT NULL,
            year INTEGER NOT NULL,
            basic_salary DECIMAL(10,2) NOT NULL,
            deductions DECIMAL(10,2) NOT NULL DEFAULT 0,
            bonuses DECIMAL(10,2) NOT NULL DEFAULT 0,
            net_salary DECIMAL(10,2) NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            payment_date DATETIME,
            payment_method TEXT DEFAULT 'cash',
            notes TEXT,
            user_id TEXT NOT NULL,
            shop_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
        )
    `);

    db.exec(`CREATE INDEX IF NOT EXISTS idx_salary_employee_month ON salaries(employee_id, month)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_salary_status ON salaries(status)`);
    // Add this to your createAllTables function in database.js

    // 20. Damaged Stock table
    db.exec(`
    CREATE TABLE IF NOT EXISTS damaged_stock (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        sku TEXT NOT NULL,
        original_sale_id TEXT,
        return_id TEXT,
        quantity INTEGER NOT NULL,
        original_cost_price DECIMAL(10,2) NOT NULL,
        selling_price DECIMAL(10,2) NOT NULL,
        total_loss DECIMAL(10,2) NOT NULL,
        status TEXT DEFAULT 'pending',
        damage_reason TEXT,
        notes TEXT,
        recovery_date DATETIME,
        recovery_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (original_sale_id) REFERENCES sales(id),
        FOREIGN KEY (return_id) REFERENCES returns(id)
    )
`);

    db.exec(`CREATE INDEX IF NOT EXISTS idx_damaged_status ON damaged_stock(status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_damaged_product ON damaged_stock(product_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_damaged_created ON damaged_stock(created_at)`);

    console.log('✅ All 20 tables created successfully');
}