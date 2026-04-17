// This replaces ALL your fetch/axios calls

type ElectronAPI = {
    // Auth
    login: (email: string, password: string) => Promise<any>;
    logout: () => Promise<void>;
    getCurrentUser: () => Promise<any>;

    connectGoogleDrive: () => Promise<any>;
    onGoogleToken: (callback: (token: string) => void) => void;
    uploadToGoogleDrive: (data: { accessToken: string; dbPath: string }) => Promise<any>;


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
    getCategories: () => Promise<any>;
    createCategory: (data: any) => Promise<any>;
    updateCategory: (id: string, data: any) => Promise<any>;
    deleteCategory: (id: string) => Promise<any>;

    // Brands
    getBrands: () => Promise<any>;
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

    // Purchases
    getPurchases: () => Promise<any>;
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

    // Attendance
    getAttendance: (employeeId: string, month?: string, year?: string) => Promise<any>;
    markAttendance: (data: any) => Promise<any>;

    // Salaries
    getSalaries: (employeeId: string, month?: string, year?: string) => Promise<any>;
    createSalary: (data: any) => Promise<any>;
    updateSalaryStatus: (id: string, status: string) => Promise<any>;

    // Returns
    getReturns: () => Promise<any>;
    createReturn: (returnData: any, items: any) => Promise<any>;

    // Dashboard
    getDashboardStats: () => Promise<any>;

    // Settings
    getSettings: () => Promise<any>;
    updateSettings: (data: any) => Promise<any>;

    // Transaction Logs
    getTransactionLogs: () => Promise<any>;

    // Data Management
    getDataLocation: () => Promise<any>;
    backupData: () => Promise<any>;
    openDataFolder: () => Promise<void>;

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
    // License methods
    activateLicense: (licenseKey) => window.electronAPI.activateLicense(licenseKey),
    checkLicense: () => window.electronAPI.checkLicense(),
    activateLicenseWithPin: (licenseKey, adminPin) => window.electronAPI.activateLicenseWithPin(licenseKey, adminPin),  // Add this line
    verifyLicenseOnline: () => window.electronAPI.verifyLicenseOnline(),

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
    getCategories: () => window.electronAPI.getCategories(),
    createCategory: (data) => window.electronAPI.createCategory(data),
    updateCategory: (id, data) => window.electronAPI.updateCategory(id, data),
    deleteCategory: (id) => window.electronAPI.deleteCategory(id),

    // Brands
    getBrands: () => window.electronAPI.getBrands(),
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

    // Purchases
    getPurchases: () => window.electronAPI.getPurchases(),
    createPurchase: (data) => window.electronAPI.createPurchase(data),
    updatePurchase: (id, data) => window.electronAPI.updatePurchase(id, data),
    deletePurchase: (id) => window.electronAPI.deletePurchase(id),

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

    // Attendance
    getAttendance: (employeeId, month, year) => window.electronAPI.getAttendance(employeeId, month, year),
    markAttendance: (data) => window.electronAPI.markAttendance(data),

    // Salaries
    getSalaries: (employeeId, month, year) => window.electronAPI.getSalaries(employeeId, month, year),
    createSalary: (data) => window.electronAPI.createSalary(data),
    updateSalaryStatus: (id, status) => window.electronAPI.updateSalaryStatus(id, status),

    // Returns
    getReturns: () => window.electronAPI.getReturns(),
    createReturn: (returnData, items) => window.electronAPI.createReturn(returnData, items),

    // Dashboard
    getDashboardStats: () => window.electronAPI.getDashboardStats(),

    // Settings
    getSettings: () => window.electronAPI.getSettings(),
    updateSettings: (data) => window.electronAPI.updateSettings(data),

    // Transaction Logs
    getTransactionLogs: () => window.electronAPI.getTransactionLogs(),

    // Data Management
    getDataLocation: () => window.electronAPI.getDataLocation(),
    backupData: () => window.electronAPI.backupData(),
    openDataFolder: () => window.electronAPI.openDataFolder(),

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
    openDataFolder: () => Promise.resolve(),
};

// Export the appropriate API
export const api = isElectron() ? electronAPI : webAPI;