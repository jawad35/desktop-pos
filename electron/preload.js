const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // ========== PRODUCTS ==========
    getProducts: async (filters) => {
        console.log('Preload - getProducts called with filters:', filters);
        const result = await ipcRenderer.invoke('db:getProducts', filters);
        console.log('Preload - getProducts result count:', result.data?.length);
        return result.success ? result.data : [];
    },
    getProductById: async (id) => {
        const result = await ipcRenderer.invoke('db:getProductById', id);
        return result.success ? result.data : null;
    },
    getProductBySku: async (sku) => {
        const result = await ipcRenderer.invoke('db:getProductBySku', sku);
        return result.success ? result.data : null;
    },
    getProductByBarcode: async (barcode) => {
        const result = await ipcRenderer.invoke('db:getProductByBarcode', barcode);
        return result.success ? result.data : null;
    },
    createProduct: async (product) => {
        const result = await ipcRenderer.invoke('db:createProduct', product);
        return result.success ? result.data : null;
    },
    updateProduct: async (id, product) => {
        const result = await ipcRenderer.invoke('db:updateProduct', id, product);
        return result.success ? result.data : null;
    },
    deleteProduct: async (id) => {
        const result = await ipcRenderer.invoke('db:deleteProduct', id);
        return result.success;
    },
    restoreProduct: async (id) => {
        const result = await ipcRenderer.invoke('db:restoreProduct', id);
        return result.success;
    },

    // Product Images
    getProductImages: async (productId) => {
        const result = await ipcRenderer.invoke('db:getProductImages', productId);
        return result.success ? result.data : [];
    },
    createProductImage: async (imageData) => {
        const result = await ipcRenderer.invoke('db:createProductImage', imageData);
        return result.success ? result.data : null;
    },
    deleteProductImage: async (id) => {
        const result = await ipcRenderer.invoke('db:deleteProductImage', id);
        return result.success;
    },

    // Product Variants
    getProductVariants: async (productId) => {
        const result = await ipcRenderer.invoke('db:getProductVariants', productId);
        return result.success ? result.data : [];
    },
    createProductVariant: async (variantData) => {
        const result = await ipcRenderer.invoke('db:createProductVariant', variantData);
        return result.success ? result.data : null;
    },
    updateProductVariant: async (id, variantData) => {
        const result = await ipcRenderer.invoke('db:updateProductVariant', id, variantData);
        return result.success ? result.data : null;
    },

    // ========== CATEGORIES ==========
    getCategories: async () => {
        const result = await ipcRenderer.invoke('db:getCategories');
        console.log('IPC getCategories result:', result);
        return result.success ? result.data : [];
    },
    createCategory: async (category) => {
        const result = await ipcRenderer.invoke('db:createCategory', category);
        console.log('IPC createCategory result:', result);
        return result.success ? result.data : null;
    },
    updateCategory: async (id, category) => {
        const result = await ipcRenderer.invoke('db:updateCategory', id, category);
        return result.success ? result.data : null;
    },
    deleteCategory: async (id) => {
        const result = await ipcRenderer.invoke('db:deleteCategory', id);
        return result.success;
    },

    // ========== BRANDS ==========
    getBrands: async () => {
        const result = await ipcRenderer.invoke('db:getBrands');
        return result.success ? result.data : [];
    },
    createBrand: async (brand) => {
        const result = await ipcRenderer.invoke('db:createBrand', brand);
        return result.success ? result.data : null;
    },
    updateBrand: async (id, brand) => {
        const result = await ipcRenderer.invoke('db:updateBrand', id, brand);
        return result.success ? result.data : null;
    },
    deleteBrand: async (id) => {
        const result = await ipcRenderer.invoke('db:deleteBrand', id);
        return result.success;
    },

    // ========== SUPPLIERS ==========
    getSuppliers: async () => {
        const result = await ipcRenderer.invoke('db:getSuppliers');
        return result.success ? result.data : [];
    },
    createSupplier: async (supplier) => {
        const result = await ipcRenderer.invoke('db:createSupplier', supplier);
        return result.success ? result.data : null;
    },
    updateSupplier: async (id, supplier) => {
        const result = await ipcRenderer.invoke('db:updateSupplier', id, supplier);
        return result.success ? result.data : null;
    },
    deleteSupplier: async (id) => {
        const result = await ipcRenderer.invoke('db:deleteSupplier', id);
        return result.success;
    },

    // ========== SALES ==========
    getSales: async (filters) => {
        const result = await ipcRenderer.invoke('db:getSales', filters);
        return result.success ? result.data : [];
    },
    getSaleById: async (id) => {
        console.log(id)
        const result = await ipcRenderer.invoke('db:getSaleById', id);
        console.log(result)
        return result.success ? result.data : null;
    },
    getSaleByReceiptNumber: async (receiptNumber) => {
        const result = await ipcRenderer.invoke('db:getSaleByReceiptNumber', receiptNumber);
        return result.success ? result.data : null;
    },
    getSaleItems: async (saleId) => {
        const result = await ipcRenderer.invoke('db:getSaleItems', saleId);
        return result.success ? result.data : [];
    },
    createSale: async (saleData, items) => {
        console.log('Preload - createSale called with saleData:', saleData);
        console.log('Preload - createSale called with items:', items);
        // Make sure both parameters are passed correctly
        const result = await ipcRenderer.invoke('db:createSale', saleData, items);
        console.log('Preload - createSale result:', result);
        return result;
    },
    updateSale: async (id, saleData) => {
        console.log(id, saleData, 'aho aho')
        const result = await ipcRenderer.invoke('db:updateSale', id, saleData);
        return result;
    },

    // ========== RETURNS ==========
    getReturns: async (filters) => {
        const result = await ipcRenderer.invoke('db:getReturns', filters);
        return result.success ? result.data : [];
    },
    createReturn: async (returnData, items) => {
        const result = await ipcRenderer.invoke('db:createReturn', returnData, items);
        return result.success ? result.data : null;
    },

    // ========== PURCHASES ==========
    getPurchases: async (filters) => {
        const result = await ipcRenderer.invoke('db:getPurchases', filters);
        return result.success ? result.data : [];
    },
    getPurchaseById: async (id) => {
        const result = await ipcRenderer.invoke('db:getPurchaseById', id);
        return result.success ? result.data : null;
    },
    createPurchase: async (purchaseData) => {
        const result = await ipcRenderer.invoke('db:createPurchase', purchaseData);
        return result.success ? result.data : null;
    },
    updatePurchase: async (id, purchaseData) => {
        const result = await ipcRenderer.invoke('db:updatePurchase', id, purchaseData);
        return result.success;
    },
    deletePurchase: async (id) => {
        const result = await ipcRenderer.invoke('db:deletePurchase', id);
        return result.success;
    },

    // ========== EXPENSES ==========
    getExpenses: async (filters) => {
        const result = await ipcRenderer.invoke('db:getExpenses', filters);
        return result.success ? result.data : [];
    },
    createExpense: async (expense) => {
        console.log('Preload - createExpense called with:', expense);
        const result = await ipcRenderer.invoke('db:createExpense', expense);
        console.log('Preload - createExpense result:', result);
        // Return the full result object, not just the data
        return result;  // Return { success: true/false, data: {...}, error: ... }
    },
    updateExpense: async (id, expense) => {
        console.log(expense)
        const result = await ipcRenderer.invoke('db:updateExpense', id, expense);
        return result;
    },
    deleteExpense: async (id) => {
        console.log('Preload - deleteExpense called with:', id);
        const result = await ipcRenderer.invoke('db:deleteExpense', id);
        return result;
    },

    // ========== EMPLOYEES ==========
    getEmployees: async (filters) => {
        console.log('Preload - getEmployees called with:', filters);
        const result = await ipcRenderer.invoke('db:getEmployees', filters);
        console.log('Preload - getEmployees result:', result);
        return result.success ? result.data : [];
    },
    getEmployeeById: async (id) => {
        const result = await ipcRenderer.invoke('db:getEmployeeById', id);
        return result.success ? result.data : null;
    },
    createEmployee: async (employee) => {
        const result = await ipcRenderer.invoke('db:createEmployee', employee);
        return result.success ? result.data : null;
    },
    updateEmployee: async (id, employee) => {
        const result = await ipcRenderer.invoke('db:updateEmployee', id, employee);
        return result.success;
    },
    deleteEmployee: async (id) => {
        const result = await ipcRenderer.invoke('db:deleteEmployee', id);
        return result.success;
    },

    // ========== ATTENDANCE ==========
    getAttendance: async (employeeId, month, year) => {
        const result = await ipcRenderer.invoke('db:getAttendance', employeeId, month, year);
        return result.success ? result.data : [];
    },
    markAttendance: async (attendanceData) => {
        const result = await ipcRenderer.invoke('db:markAttendance', attendanceData);
        console.log(result, 'jey899')
        return result.success ? result.data : null;
    },

    // ========== SALARIES ==========
    getSalaries: async (employeeId, month, year) => {
        const result = await ipcRenderer.invoke('db:getSalaries', employeeId, month, year);
        return result.success ? result.data : [];
    },
    createSalary: async (salaryData) => {
        const result = await ipcRenderer.invoke('db:createSalary', salaryData);
        return result.success ? result.data : null;
    },
    updateSalaryStatus: async (id, status) => {
        const result = await ipcRenderer.invoke('db:updateSalaryStatus', id, status);
        return result.success;
    },

    // ========== DASHBOARD ==========
    getDashboardStats: async (userId, shopId) => {
        const result = await ipcRenderer.invoke('db:getDashboardStats', userId, shopId);
        return result.success ? result.data : null;
    },

    // ========== SETTINGS ==========
    getSettings: async () => {
        const result = await ipcRenderer.invoke('db:getSettings');
        return result.success ? result.data : null;
    },
    updateSettings: async (settings) => {
        const result = await ipcRenderer.invoke('db:updateSettings', settings);
        return result.success;
    },
    getTransactionLogs: async () => {
        console.log('calling213')
        const result = await ipcRenderer.invoke('db:getTransactionLogs');
        console.log(result)
        return result.success ? result.data : [];
    },

    // ========== DATA MANAGEMENT ==========
    getDataLocation: () => ipcRenderer.invoke('data:getLocation'),
    backupData: () => ipcRenderer.invoke('data:backup'),
    openDataFolder: () => ipcRenderer.invoke('data:openFolder'),

    // Auth (if needed)
    login: (email, password) => ipcRenderer.invoke('auth:login', { email, password }),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getCurrentUser: () => ipcRenderer.invoke('auth:getCurrentUser'),

    // License methods
    activateLicense: async (licenseKey) => {
        return await ipcRenderer.invoke('license:activate', licenseKey);
    },
    checkLicense: async () => {
        return await ipcRenderer.invoke('license:check');
    },
    verifyLicenseOnline: async () => {
        return await ipcRenderer.invoke('license:verifyOnline');
    },
    // In preload.js
    clearLicense: async () => {
        return await ipcRenderer.invoke('license:clear');
    },

    // Utility
    onDatabaseUpdate: (callback) => {
        ipcRenderer.on('db:updated', (event, data) => callback(data));
    }

});