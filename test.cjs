const { app } = require('electron');
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const readline = require('readline');

// Database path - same as your migration script
const dbPath = path.join(os.homedir(), 'Library/Application Support/electron', 'pos.db');
console.log('📁 Database path:', dbPath);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

async function clearTaxPayments() {
    try {
        const db = new Database(dbPath);
        console.log('✅ Connected to database');
        
        // Check if tax_payments table exists
        const tableCheck = db.prepare(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='tax_payments'
        `).get();
        
        if (!tableCheck) {
            console.log('⚠️  tax_payments table does not exist. Nothing to clear.');
            db.close();
            rl.close();
            return;
        }
        
        // Get count before deletion
        const countBefore = db.prepare('SELECT COUNT(*) as count FROM tax_payments').get();
        console.log(`\n📊 Current tax payment records: ${countBefore.count}`);
        
        if (countBefore.count === 0) {
            console.log('✅ No tax payment records found. Database is already clean.');
            db.close();
            rl.close();
            return;
        }
        
        // Show recent payments for confirmation
        console.log('\n📋 Recent tax payments:');
        const recentPayments = db.prepare(`
            SELECT id, period_start, period_end, amount, challan_number, payment_date 
            FROM tax_payments 
            ORDER BY payment_date DESC 
            LIMIT 5
        `).all();
        
        if (recentPayments.length > 0) {
            console.table(recentPayments.map(p => ({
                Date: p.payment_date?.split('T')[0],
                Period: p.period_start,
                Amount: `PKR ${p.amount}`,
                Challan: p.challan_number
            })));
        }
        
        // Ask for confirmation
        const answer = await askQuestion(`\n⚠️  Are you sure you want to DELETE ALL ${countBefore.count} tax payment records? This action cannot be undone! (type "DELETE" to confirm): `);
        
        if (answer !== 'DELETE') {
            console.log('❌ Operation cancelled. Type "DELETE" to confirm.');
            db.close();
            rl.close();
            return;
        }
        
        // Second confirmation
        const secondAnswer = await askQuestion(`\n⚠️  FINAL WARNING: This will permanently delete ${countBefore.count} tax payment records. Type "CONFIRM" to proceed: `);
        
        if (secondAnswer !== 'CONFIRM') {
            console.log('❌ Operation cancelled.');
            db.close();
            rl.close();
            return;
        }
        
        console.log('\n🗑️  Deleting tax payment records...');
        
        // Delete all records
        const deleteResult = db.prepare('DELETE FROM tax_payments').run();
        console.log(`✅ Deleted ${deleteResult.changes} tax payment records`);
        
        // Verify deletion
        const countAfter = db.prepare('SELECT COUNT(*) as count FROM tax_payments').get();
        console.log(`📊 Records after deletion: ${countAfter.count}`);
        
        // Optional: Vacuum database to reclaim space
        console.log('🔄 Optimizing database...');
        db.exec('VACUUM');
        console.log('✅ Database optimized');
        
        console.log('\n🎉 Tax payment history cleared successfully!');
        
        db.close();
        rl.close();
        
        // Auto quit after 2 seconds
        setTimeout(() => {
            process.exit(0);
        }, 2000);
        
    } catch (error) {
        console.error('❌ Error clearing tax payments:', error.message);
        rl.close();
        process.exit(1);
    }
}

// Run the cleanup
clearTaxPayments();