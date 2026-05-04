// This replaces ALL your fetch/axios calls

type ElectronAPI = {
    // Auth
    login: (email: string, password: string) => Promise<any>;
    logout: () => Promise<void>;
    getCurrentUser: () => Promise<any>;

    // Tax Management
    getTaxPayments: () => Promise<any>;
    createTaxPayment: (paymentData: {
        period_start: string;
        period_end: string;
        amount: number;
        challan_number?: string;
        payment_method?: string;
        notes?: string;
        payment_date: string;
    }) => Promise<any>;
    updateTaxPayment: (id: string, paymentData: {
        amount: number;
        challan_number?: string;
        payment_method?: string;
        notes?: string;
    }) => Promise<any>;  // ADD THIS LINE
    getTaxSummary: (startDate?: string, endDate?: string) => Promise<any>;

    connectGoogleDrive: () => Promise<any>;
    onGoogleToken: (callback: (token: string) => void) => void;
    uploadToGoogleDrive: (data: { accessToken: string; dbPath: string }) => Promise<any>;
    getGoogleDriveStorage: () => Promise<any>;

    // Products
    getProducts: (filters?: any) => Promise<any>;
    getProduct: (id: string) => Promise<any>;
    createProduct: (data: any) => Promise<any>;
    updateProduct: (id: string, data: any) => Promise<any>;
    deleteProduct: (id: string) => Promise<any>;
    restoreProduct: (id: string) => Promise<any>;

    // Add to interface
    createDamagedStock: (damageData: any) => Promise<any>;
    getDamagedStock: (filters?: any) => Promise<any>;
    updateDamagedStock: (id: string, updateData: any) => Promise<any>;
    getDamageStats: () => Promise<any>;

    // Categories
    getCategories: (includeInactive?: boolean) => Promise<any>;  // CHANGED
    createCategory: (data: any) => Promise<any>;
    updateCategory: (id: string, data: any) => Promise<any>;
    deleteCategory: (id: string) => Promise<any>;

    // Brands
    getBrands: (includeInactive?: boolean) => Promise<any>;
    createBrand: (data: any) => Promise<any>;
    updateBrand: (id: string, data: any) => Promise<any>;
    deleteBrand: (id: string) => Promise<any>;

    // Suppliers
    getSuppliers: () => Promise<any>;
    createSupplier: (data: any) => Promise<any>;
    updateSupplier: (id: string, data: any) => Promise<any>;
    deleteSupplier: (id: string) => Promise<any>;

    // Sales
    getSales: () => Promise<any>;
    getSale: (id: string) => Promise<any>;
    createSale: (data: any) => Promise<any>;
    updateSale: (id: string, data: any) => Promise<any>;  // Add this line
    getSaleByReceiptNumber: (receiptNumber: string) => Promise<any>;
    getSalePayments: (saleId: string) => Promise<any[]>;
    createSalePayment: (paymentData: {
        saleId: string;
        amount: number;
        paymentMethod: string;
        notes: string;
        remainingDue: number;
    }) => Promise<any>;

    // Purchases
    getPurchases: () => Promise<any>;
    getPurchaseById: (id: string) => Promise<any>;  // ADD THIS LINE
    createPurchase: (data: any) => Promise<any>;
    updatePurchase: (id: string, data: any) => Promise<any>;
    deletePurchase: (id: string) => Promise<any>;

    // Expenses
    getExpenses: () => Promise<any>;
    createExpense: (data: any) => Promise<any>;
    updateExpense: (id: string, data: any) => Promise<any>;
    deleteExpense: (id: string) => Promise<any>;

    // Employees
    getEmployees: (filters?: any) => Promise<any>;
    getEmployee: (id: string) => Promise<any>;
    createEmployee: (data: any) => Promise<any>;
    updateEmployee: (id: string, data: any) => Promise<any>;
    deleteEmployee: (id: string) => Promise<any>;

    // Employee Payments & Advances (Add these)
    getEmployeePayments: (employeeId: string) => Promise<any>;
    createEmployeePayment: (paymentData: any) => Promise<any>;
    getEmployeeAdvances: (employeeId: string) => Promise<any>;
    createEmployeeAdvance: (advanceData: any) => Promise<any>;
    updateEmployeeAdvance: (id: string, data: any) => Promise<any>;

    // Attendance
    getAttendance: (employeeId: string, month?: string, year?: string) => Promise<any>;
    markAttendance: (data: any) => Promise<any>;

    // Salaries
    getSalaries: (employeeId: string, month?: string, year?: string) => Promise<any>;
    createSalary: (data: any) => Promise<any>;
    updateSalaryStatus: (id: string, status: string) => Promise<any>;
    // Add to ElectronAPI interface
    createSalaryDeduction: (deductionData: any) => Promise<any>;
    getSalaryDeductions: (employeeId: string) => Promise<any>;
    updateSalaryDeduction: (id: string, data: any) => Promise<any>;
    // Add this to ElectronAPI interface
    getProfitData: (startDate: string, endDate: string) => Promise<any>;
    // Returns
    getReturns: () => Promise<any>;
    createReturn: (returnData: any, items: any) => Promise<any>;

    // Dashboard
    getDashboardStats: () => Promise<any>;
    getDueSales: () => Promise<any[]>;
    getOverdueSales: () => Promise<any[]>;
    getPaymentSummary: () => Promise<{
        totalDue: number;
        overdueCount: number;
        upcomingDueCount: number;
    }>;

    // Settings
    getSettings: () => Promise<any>;
    updateSettings: (data: any) => Promise<any>;
    getShopData: () => Promise<any>;
    updateShopData: (shopData: any) => Promise<any>;
    updateLicenseShopData: (shopData: any) => Promise<any>;
    getShopId: () => Promise<{ shopId: string }>;

    // Transaction Logs
    getTransactionLogs: () => Promise<any>;

    // Data Management
    getDataLocation: () => Promise<any>;
    backupData: () => Promise<any>;
    openDataFolder: () => Promise<void>;
    wipeDatabase: () => Promise<any>;  // Add this line
    // License methods
    activateLicense: (licenseKey: string) => Promise<any>;
    checkLicense: () => Promise<any>;
    verifyLicenseOnline: () => Promise<any>;
    activateLicenseWithPin: (licenseKey: string, adminPin: string) => Promise<any>;  // Add this line

    // Add to ElectronAPI interface
    verifyAdminPin: (pin: string) => Promise<any>;
    updateAdminPin: (oldPin: string, newPin: string) => Promise<any>;
    getLoginType: () => Promise<any>;
    setLoginType: (loginType: string) => Promise<any>;
    restartApp: () => Promise<void>;
};

// Check if running in Electron
const isElectron = () => {
    return typeof window !== 'undefined' && window.electronAPI !== undefined;
};

// API implementation for Electron
const electronAPI: ElectronAPI = {
    // Auth
    login: (email, password) => window.electronAPI.login(email, password),
    logout: () => window.electronAPI.logout(),
    getCurrentUser: () => window.electronAPI.getCurrentUser(),

    // Tax Management
    getTaxPayments: async () => {
        const result = await window.electronAPI.getTaxPayments();
        return result.success ? result.data : [];
    },
    createTaxPayment: async (paymentData) => {
        const result = await window.electronAPI.createTaxPayment(paymentData);
        return result.success ? result.data : null;
    },
      updateTaxPayment: async (id, paymentData) => {  // ADD THIS
        const result = await window.electronAPI.updateTaxPayment(id, paymentData);
        return result.success ? result.data : null;
    },
    getTaxSummary: async (startDate, endDate) => {
        const result = await window.electronAPI.getTaxSummary(startDate, endDate);
        return result.success ? result.data : null;
    },
    // License methods
    activateLicense: (licenseKey) => window.electronAPI.activateLicense(licenseKey),
    checkLicense: () => window.electronAPI.checkLicense(),
    activateLicenseWithPin: (licenseKey, adminPin) => window.electronAPI.activateLicenseWithPin(licenseKey, adminPin),  // Add this line
    verifyLicenseOnline: () => window.electronAPI.verifyLicenseOnline(),
    getGoogleDriveStorage: () => window.electronAPI.getGoogleDriveStorage(),

    connectGoogleDrive: () => window.electronAPI.connectGoogleDrive(),
    onGoogleToken: (callback) => window.electronAPI.onGoogleToken(callback),
    uploadToGoogleDrive: (data) => window.electronAPI.uploadToGoogleDrive(data),

    // Add to electronAPI object
    verifyAdminPin: (pin) => window.electronAPI.verifyAdminPin(pin),
    updateAdminPin: (oldPin, newPin) => window.electronAPI.updateAdminPin(oldPin, newPin),
    getLoginType: () => window.electronAPI.getLoginType(),
    setLoginType: (loginType) => window.electronAPI.setLoginType(loginType),


    // Products
    getProducts: (filters) => window.electronAPI.getProducts(filters),
    getProduct: (id) => window.electronAPI.getProductById(id),
    createProduct: (data) => window.electronAPI.createProduct(data),
    updateProduct: (id, data) => window.electronAPI.updateProduct(id, data),
    deleteProduct: (id) => window.electronAPI.deleteProduct(id),
    restoreProduct: (id) => window.electronAPI.restoreProduct(id),
    getSaleByReceiptNumber: (receiptNumber) => window.electronAPI.getSaleByReceiptNumber(receiptNumber),
    // Add to electronAPI object
    createDamagedStock: (damageData) => window.electronAPI.createDamagedStock(damageData),
    getDamagedStock: (filters) => window.electronAPI.getDamagedStock(filters),
    updateDamagedStock: (id, updateData) => window.electronAPI.updateDamagedStock(id, updateData),
    getDamageStats: () => window.electronAPI.getDamageStats(),
    // In the electronAPI object, add:
    // Categories
    getCategories: (includeInactive?: boolean) => window.electronAPI.getCategories(includeInactive),
    createCategory: (data) => window.electronAPI.createCategory(data),
    updateCategory: (id, data) => window.electronAPI.updateCategory(id, data),
    deleteCategory: (id) => window.electronAPI.deleteCategory(id),

    // Brands
    getBrands: (includeInactive?: boolean) => window.electronAPI.getBrands(includeInactive),
    createBrand: (data) => window.electronAPI.createBrand(data),
    updateBrand: (id, data) => window.electronAPI.updateBrand(id, data),
    deleteBrand: (id) => window.electronAPI.deleteBrand(id),

    // Suppliers
    getSuppliers: () => window.electronAPI.getSuppliers(),
    createSupplier: (data) => window.electronAPI.createSupplier(data),
    updateSupplier: (id, data) => window.electronAPI.updateSupplier(id, data),
    deleteSupplier: (id) => window.electronAPI.deleteSupplier(id),

    // Sales
    getSales: () => window.electronAPI.getSales(),
    getSale: (id) => window.electronAPI.getSaleById(id),
    createSale: (saleData, items) => window.electronAPI.createSale(saleData, items),
    updateSale: (id, data) => window.electronAPI.updateSale(id, data),  // Add this line
    getSalePayments: async (saleId) => {           // ADD THIS
        const result = await window.electronAPI.getSalePayments(saleId);
        return result.success ? result.data : [];
    },
    // Purchases
    getPurchases: () => window.electronAPI.getPurchases(),
    getPurchaseById: (id) => window.electronAPI.getPurchaseById(id),  // ADD THIS LINE
    createPurchase: (data) => window.electronAPI.createPurchase(data),
    updatePurchase: (id, data) => window.electronAPI.updatePurchase(id, data),
    deletePurchase: (id) => window.electronAPI.deletePurchase(id),
    // Add this to the ElectronAPI interface and implementation:
    searchProductsForPurchase: async (searchTerm: string) => {
        const result = await window.electronAPI.searchProductsForPurchase(searchTerm);
        return result.success ? result.data : [];
    },
    // Expenses
    getExpenses: () => window.electronAPI.getExpenses(),
    createExpense: (data) => window.electronAPI.createExpense(data),
    updateExpense: (id, data) => window.electronAPI.updateExpense(id, data),
    deleteExpense: (id) => window.electronAPI.deleteExpense(id),

    // Employees
    getEmployees: (filters) => window.electronAPI.getEmployees(filters),
    getEmployee: (id) => window.electronAPI.getEmployeeById(id),
    createEmployee: (data) => window.electronAPI.createEmployee(data),
    updateEmployee: (id, data) => window.electronAPI.updateEmployee(id, data),
    deleteEmployee: (id) => window.electronAPI.deleteEmployee(id),

    // Employee Payments & Advances (Add after deleteEmployee)
    getEmployeePayments: async (employeeId: string) => {
        const result = await window.electronAPI.getEmployeePayments(employeeId);
        return result.success ? result.data : [];
    },
    createEmployeePayment: async (paymentData: any) => {
        const result = await window.electronAPI.createEmployeePayment(paymentData);
        return result;
    },
    getEmployeeAdvances: async (employeeId: string) => {
        const result = await window.electronAPI.getEmployeeAdvances(employeeId);
        return result.success ? result.data : [];
    },
    createEmployeeAdvance: async (advanceData: any) => {
        const result = await window.electronAPI.createEmployeeAdvance(advanceData);
        return result;
    },
    updateEmployeeAdvance: async (id: string, data: any) => {
        const result = await window.electronAPI.updateEmployeeAdvance(id, data);
        return result;
    },

    // Add to electronAPI object
    createSalaryDeduction: async (deductionData: any) => {
        const result = await window.electronAPI.createSalaryDeduction(deductionData);
        return result;
    },
    getSalaryDeductions: async (employeeId: string) => {
        const result = await window.electronAPI.getSalaryDeductions(employeeId);
        return result.success ? result.data : [];
    },
    updateSalaryDeduction: async (id: string, data: any) => {
        const result = await window.electronAPI.updateSalaryDeduction(id, data);
        return result;
    },

    // Attendance
    getAttendance: (employeeId, month, year) => window.electronAPI.getAttendance(employeeId, month, year),
    markAttendance: (data) => window.electronAPI.markAttendance(data),

    // Salaries
    getSalaries: (employeeId, month, year) => window.electronAPI.getSalaries(employeeId, month, year),
    createSalary: (data) => window.electronAPI.createSalary(data),
    updateSalaryStatus: (id, status) => window.electronAPI.updateSalaryStatus(id, status),
    updateSalary: (id: string, salaryData: any) => window.electronAPI.updateSalary(id, salaryData),
    // In electronAPI object, add:
    getProfitData: (startDate, endDate) => window.electronAPI.getProfitData(startDate, endDate),

    // Returns
    getReturns: () => window.electronAPI.getReturns(),
    createReturn: (returnData, items) => window.electronAPI.createReturn(returnData, items),

    // Dashboard
    getDashboardStats: () => window.electronAPI.getDashboardStats(),

    // Settings
    getSettings: () => window.electronAPI.getSettings(),
    updateSettings: (data) => window.electronAPI.updateSettings(data),
    checkSubscriptionStatus: () => window.electronAPI.checkSubscriptionStatus(),

    // Transaction Logs
    getTransactionLogs: () => window.electronAPI.getTransactionLogs(),

    // Data Management
    getDataLocation: () => window.electronAPI.getDataLocation(),
    backupData: () => window.electronAPI.backupData(),
    openDataFolder: () => window.electronAPI.openDataFolder(),
    restartApp: () => window.electronAPI.restartApp(),
    createSalePayment: async (paymentData) => {
        const result = await window.electronAPI.createSalePayment(paymentData);
        return result.success ? result.data : null;
    },

    // Due Sales
    getDueSales: async () => {
        const result = await window.electronAPI.getDueSales();
        return result.success ? result.data : [];
    },

    getOverdueSales: async () => {
        const result = await window.electronAPI.getOverdueSales();
        return result.success ? result.data : [];
    },

    getPaymentSummary: async () => {
        const result = await window.electronAPI.getPaymentSummary();
        return result.success ? result.data : { totalDue: 0, overdueCount: 0, upcomingDueCount: 0 };
    },

    // Shop Data
    getShopData: async () => {
        const result = await window.electronAPI.getShopData();
        return result;
    },

    updateShopData: async (shopData) => {
        const result = await window.electronAPI.updateShopData(shopData);
        return result;
    },

    updateLicenseShopData: async (shopData) => {
        const result = await window.electronAPI.updateLicenseShopData(shopData);
        return result;
    },

    getShopId: async () => {
        const result = await window.electronAPI.getShopId();
        return result;
    },

    syncShopData: async (shopData) => {
        const result = await window.electronAPI.syncShopData(shopData);
        return result;
    },

};

// API implementation for Web (your existing backend)
const webAPI: ElectronAPI = {
    login: (email, password) => fetch('/api/login', { method: 'POST', body: JSON.stringify({ email, password }) }).then(r => r.json()),
    logout: () => fetch('/api/logout').then(r => r.json()),
    activateLicense: (licenseKey) => fetch('/api/license/activate', { method: 'POST', body: JSON.stringify({ license_key: licenseKey }) }).then(r => r.json()),
    activateLicenseWithPin: (licenseKey, adminPin) => fetch('/api/license/activate-with-pin', { method: 'POST', body: JSON.stringify({ license_key: licenseKey, admin_pin: adminPin }) }).then(r => r.json()),  // Add this line
    checkLicense: () => fetch('/api/license/check').then(r => r.json()),
    verifyLicenseOnline: () => fetch('/api/license/verify-online').then(r => r.json()),
    getCurrentUser: () => fetch('/api/me').then(r => r.json()),
    getProducts: () => fetch('/api/products').then(r => r.json()),
    getProduct: (id) => fetch(`/api/products/${id}`).then(r => r.json()),
    createProduct: (data) => fetch('/api/products', { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),
    updateProduct: (id, data) => fetch(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then(r => r.json()),
    deleteProduct: (id) => fetch(`/api/products/${id}`, { method: 'DELETE' }).then(r => r.json()),
    restoreProduct: (id) => fetch(`/api/products/${id}/restore`, { method: 'PUT' }).then(r => r.json()),
    getCategories: () => fetch('/api/categories').then(r => r.json()),
    createCategory: (data) => fetch('/api/categories', { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),
    updateCategory: (id, data) => fetch(`/api/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then(r => r.json()),
    deleteCategory: (id) => fetch(`/api/categories/${id}`, { method: 'DELETE' }).then(r => r.json()),
    getBrands: () => fetch('/api/brands').then(r => r.json()),
    createBrand: (data) => fetch('/api/brands', { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),
    updateBrand: (id, data) => fetch(`/api/brands/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then(r => r.json()),
    deleteBrand: (id) => fetch(`/api/brands/${id}`, { method: 'DELETE' }).then(r => r.json()),
    getSuppliers: () => fetch('/api/suppliers').then(r => r.json()),
    createSupplier: (data) => fetch('/api/suppliers', { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),
    updateSupplier: (id, data) => fetch(`/api/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then(r => r.json()),
    deleteSupplier: (id) => fetch(`/api/suppliers/${id}`, { method: 'DELETE' }).then(r => r.json()),
    getSales: () => fetch('/api/sales').then(r => r.json()),
    getSale: (id) => fetch(`/api/sales/${id}`).then(r => r.json()),
    createSale: (data) => fetch('/api/sales', { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),
    updateSale: (id, data) => fetch(`/api/sales/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then(r => r.json()),
    getPurchases: () => fetch('/api/purchases').then(r => r.json()),
    createPurchase: (data) => fetch('/api/purchases', { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),
    updatePurchase: (id, data) => fetch(`/api/purchases/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then(r => r.json()),
    deletePurchase: (id) => fetch(`/api/purchases/${id}`, { method: 'DELETE' }).then(r => r.json()),
    getExpenses: () => fetch('/api/expenses').then(r => r.json()),
    createExpense: (data) => fetch('/api/expenses', { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),
    updateExpense: (id, data) => fetch(`/api/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then(r => r.json()),
    deleteExpense: (id) => fetch(`/api/expenses/${id}`, { method: 'DELETE' }).then(r => r.json()),
    getEmployees: () => fetch('/api/employees').then(r => r.json()),
    getEmployee: (id) => fetch(`/api/employees/${id}`).then(r => r.json()),
    createEmployee: (data) => fetch('/api/employees', { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),
    updateEmployee: (id, data) => fetch(`/api/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then(r => r.json()),
    deleteEmployee: (id) => fetch(`/api/employees/${id}`, { method: 'DELETE' }).then(r => r.json()),
    // Employee Payments & Advances (Add after deleteEmployee)
    getEmployeePayments: async () => {
        const response = await fetch('/api/employee-payments');
        return response.json();
    },
    createEmployeePayment: async (paymentData) => {
        const response = await fetch('/api/employee-payments', {
            method: 'POST',
            body: JSON.stringify(paymentData),
            headers: { 'Content-Type': 'application/json' }
        });
        return response.json();
    },
    getEmployeeAdvances: async () => {
        const response = await fetch('/api/employee-advances');
        return response.json();
    },
    createEmployeeAdvance: async (advanceData) => {
        const response = await fetch('/api/employee-advances', {
            method: 'POST',
            body: JSON.stringify(advanceData),
            headers: { 'Content-Type': 'application/json' }
        });
        return response.json();
    },
    updateEmployeeAdvance: async (id, data) => {
        const response = await fetch(`/api/employee-advances/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        });
        return response.json();
    },

    getAttendance: (employeeId, month, year) => fetch(`/api/employees/${employeeId}/attendance?month=${month}&year=${year}`).then(r => r.json()),
    markAttendance: (data) => fetch(`/api/employees/${data.employeeId}/attendance`, { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),
    getSalaries: (employeeId, month, year) => fetch(`/api/employees/${employeeId}/salaries?month=${month}&year=${year}`).then(r => r.json()),
    createSalary: (data) => fetch(`/api/employees/${data.employeeId}/salaries`, { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),
    updateSalaryStatus: (id, status) => fetch(`/api/salaries/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }).then(r => r.json()),
    getReturns: () => fetch('/api/returns').then(r => r.json()),
    createReturn: (data) => fetch('/api/returns', { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),
    getDashboardStats: () => fetch('/api/dashboard/stats').then(r => r.json()),
    getSettings: () => fetch('/api/settings').then(r => r.json()),
    updateSettings: (data) => fetch('/api/settings', { method: 'PUT', body: JSON.stringify(data) }).then(r => r.json()),
    getTransactionLogs: () => fetch('/api/transaction-logs').then(r => r.json()),
    getDataLocation: () => Promise.resolve({ success: true, location: 'Web version' }),
    backupData: () => Promise.resolve({ success: true, message: 'Backup not available in web version' }),
    // In webAPI object, add:
    getProfitData: (startDate, endDate) => fetch(`/api/profit-dashboard?startDate=${startDate}&endDate=${endDate}`).then(r => r.json()),
    openDataFolder: () => Promise.resolve(),
    wipeDatabase: async () => ({ success: false, error: 'Not available in web version' }),
    getSalePayments: async () => [],
    createSalePayment: async () => null,
    getDueSales: async () => [],
    getOverdueSales: async () => [],
    getPaymentSummary: async () => ({ totalDue: 0, overdueCount: 0, upcomingDueCount: 0 }),
    getShopData: async () => ({ success: false, shop: null }),
    updateShopData: async () => ({ success: false }),
    updateLicenseShopData: async () => ({ success: false }),
    getShopId: async () => ({ shopId: null }),
    syncShopData: async () => ({ success: false }),
    // Tax Management
    getTaxPayments: async () => {
        const response = await fetch('/api/tax/payments');
        return response.json();
    },
       updateTaxPayment: async (id, paymentData) => {  // ADD THIS
        const response = await fetch(`/api/tax/payments/${id}`, {
            method: 'PUT',
            body: JSON.stringify(paymentData),
            headers: { 'Content-Type': 'application/json' }
        });
        return response.json();
    },
    createTaxPayment: async (paymentData) => {
        const response = await fetch('/api/tax/payments', {
            method: 'POST',
            body: JSON.stringify(paymentData),
            headers: { 'Content-Type': 'application/json' }
        });
        return response.json();
    },
    getTaxSummary: async (startDate, endDate) => {
        const url = startDate && endDate
            ? `/api/tax/summary?startDate=${startDate}&endDate=${endDate}`
            : '/api/tax/summary';
        const response = await fetch(url);
        return response.json();
    },
    restartApp: async () => {
        console.log('Restart not available in web version');
        window.location.reload(); // Just reload the page for web
    },
};

// Export the appropriate API
export const api = isElectron() ? electronAPI : webAPI;