import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useHeader } from "@/contexts/HeaderContext";
import {
  ShoppingBag,
  Box,
  HandCoins,
  Undo2,
  ShoppingCart,
  Truck,
  Tags,
  Calculator,
  Users2,
  Banknote,
  Settings,
  UserCircle,
  Shield,
  Keyboard,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Download,
  Upload,
  Printer,
  QrCode,
  Mic,
  CreditCard,
  Smartphone,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  FileText,
  HelpCircle,
  User,
  Store,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  List,
  Share,
  Phone,
  Mail,
  MapPin,
  Car,
  Calendar,
  DollarSign,
  Percent,
  FileSpreadsheet,
  Database,
  Cloud,
  Key,
  Lock,
  LogOut
} from "lucide-react";

export default function UserGuide() {
  const { setTitle, setSubtitle } = useHeader();
  const [activeTab, setActiveTab] = useState("getting-started");

  useEffect(() => {
    setTitle("User Guide");
    setSubtitle("Complete documentation for Brainsees POS");
  }, []);

  const sections = [
    { id: "getting-started", label: "Getting Started", icon: HelpCircle },
    { id: "pos-terminal", label: "POS Terminal", icon: ShoppingBag },
    { id: "products", label: "Products", icon: Box },
    { id: "sales", label: "Sales", icon: HandCoins },
    { id: "returns", label: "Returns", icon: Undo2 },
    { id: "purchases", label: "Purchases", icon: ShoppingCart },
    { id: "suppliers", label: "Suppliers", icon: Truck },
    { id: "categories", label: "Categories", icon: Tags },
    { id: "expenses", label: "Expenses", icon: Calculator },
    { id: "employees", label: "Employees", icon: Users2 },
    { id: "net-profit", label: "Net Profit", icon: Banknote },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "keyboard-shortcuts", label: "Shortcuts", icon: Keyboard },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <main className="flex-1 overflow-auto p-6">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="bg-primary/20 p-3 rounded-xl">
              <Store className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Brainsees POS User Guide</h1>
              <p className="text-muted-foreground mt-1">
                Complete documentation for all features and functionalities
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="sticky top-0 bg-background z-10 pb-2">
            <TabsList className="flex flex-wrap h-auto gap-1 p-1">
              {sections.map((section) => (
                <TabsTrigger
                  key={section.id}
                  value={section.id}
                  className="flex items-center gap-2"
                >
                  <section.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{section.label}</span>
                  <span className="sm:hidden text-xs">{section.label.charAt(0)}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Getting Started */}
          <TabsContent value="getting-started" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  Welcome to Brainsees POS
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg">Two Modes of Operation</h3>
                    <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold">Admin Mode</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Full access to all features including adding products, managing employees, 
                        viewing profits, and system settings. Switch to Admin mode by clicking 
                        "Switch to Admin" in the sidebar and entering the admin PIN.
                      </p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-5 w-5 text-green-600" />
                        <span className="font-semibold">Operator Mode</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Limited access for cashiers. Only shows tabs approved by admin. 
                        Can process sales, view sales history, and process returns.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg">Quick Start Guide</h3>
                    <ol className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">1. <strong>Activate License:</strong> Enter your license key and admin PIN on first launch</li>
                      <li className="flex items-start gap-2">2. <strong>Add Products:</strong> Go to Products → Add Product to build your catalog</li>
                      <li className="flex items-start gap-2">3. <strong>Process Sale:</strong> Go to POS Terminal, search/add items, click Process Payment</li>
                      <li className="flex items-start gap-2">4. <strong>Manage Employees:</strong> Add employees and assign roles (Manager, Cashier, Salesman)</li>
                      <li className="flex items-start gap-2">5. <strong>Track Profit:</strong> View Net Profit dashboard to see your business performance</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Minimum Requirements:</strong></p>
                    <ul className="list-disc list-inside space-y-1 mt-2 text-muted-foreground">
                      <li>Windows 10 / macOS 11+ / Linux</li>
                      <li>4GB RAM (8GB recommended)</li>
                      <li>500MB free disk space</li>
                      <li>Internet connection for activation</li>
                    </ul>
                  </div>
                  <div>
                    <p><strong>Supported Hardware:</strong></p>
                    <ul className="list-disc list-inside space-y-1 mt-2 text-muted-foreground">
                      <li>Barcode scanners (USB/Bluetooth)</li>
                      <li>Receipt printers</li>
                      <li>Cash drawers</li>
                      <li>Touch screens</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* POS Terminal */}
          <TabsContent value="pos-terminal" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  POS Terminal - Processing Sales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">How to Process a Sale</h3>
                    <ol className="space-y-3 text-sm">
                      <li className="flex items-start gap-2">1. <strong>Add Products:</strong> Click on product cards or scan barcode using scanner or manual entry</li>
                      <li className="flex items-start gap-2">2. <strong>Adjust Quantity:</strong> Use +/- buttons or Ctrl+↑/↓ on selected item</li>
                      <li className="flex items-start gap-2">3. <strong>Apply Discount/Tax:</strong> Check the boxes and enter percentage values</li>
                      <li className="flex items-start gap-2">4. <strong>Customer Info:</strong> Enter customer name and phone for receipts</li>
                      <li className="flex items-start gap-2">5. <strong>Select Payment:</strong> Choose cash, card, EasyPaisa, JazzCash, Bank, or Check</li>
                      <li className="flex items-start gap-2">6. <strong>Complete Sale:</strong> Click "Process Payment" to finalize</li>
                    </ol>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3">Order Mode vs Return Mode</h3>
                    <div className="space-y-3">
                      <div className="bg-yellow-50 dark:bg-yellow-950/30 p-3 rounded-lg">
                        <p className="font-medium">Order Mode</p>
                        <p className="text-xs text-muted-foreground">Assign sales to specific salesmen. Select salesman and payment status before processing.</p>
                      </div>
                      <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">
                        <p className="font-medium">Return Mode</p>
                        <p className="text-xs text-muted-foreground">Search by receipt number, select items to return, add return fee if applicable, and process.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Barcode Scanning</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-muted/30 p-3 rounded-lg">
                      <QrCode className="h-5 w-5 mb-2 text-primary" />
                      <p className="font-medium">Scanner Input</p>
                      <p className="text-xs text-muted-foreground">Connect USB barcode scanner - scans automatically add products to cart</p>
                    </div>
                    <div className="bg-muted/30 p-3 rounded-lg">
                      <Mic className="h-5 w-5 mb-2 text-primary" />
                      <p className="font-medium">Voice Search</p>
                      <p className="text-xs text-muted-foreground">Click microphone icon and speak product name to search</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products */}
          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Box className="h-5 w-5 text-primary" />
                  Product Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">Adding Products</h3>
                    <ul className="space-y-2 text-sm">
                      <li>• Click "Add Product" button or press <kbd className="px-1 py-0.5 bg-muted rounded">Ctrl+A</kbd></li>
                      <li>• Fill product details: Name, SKU, Barcode, Category, Brand, Supplier</li>
                      <li>• Set pricing: Cost Price and Selling Price</li>
                      <li>• Set inventory: Stock quantity and Minimum stock alert level</li>
                      <li>• Add product images (supports multiple images)</li>
                      <li>• Click "Save" to add to inventory</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3">Import/Export</h3>
                    <ul className="space-y-2 text-sm">
                      <li>• <strong>Export:</strong> Click export button or press <kbd>Ctrl+E</kbd> to download CSV</li>
                      <li>• <strong>Import:</strong> Click import button, select CSV file with product data</li>
                      <li>• <strong>Barcode Generation:</strong> Enter barcode value and quantity to generate printable barcodes</li>
                    </ul>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Product Filters</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">Search by name/SKU/barcode</Badge>
                    <Badge variant="outline">Filter by Category</Badge>
                    <Badge variant="outline">Filter by Brand</Badge>
                    <Badge variant="outline">Filter by Supplier</Badge>
                    <Badge variant="outline">Stock Status (In/Out/Low)</Badge>
                    <Badge variant="outline">Price Range</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sales */}
          <TabsContent value="sales" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HandCoins className="h-5 w-5 text-primary" />
                  Sales History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">Features</h3>
                    <ul className="space-y-2 text-sm">
                      <li>• View all completed and pending sales</li>
                      <li>• Filter by date range, payment method, or search</li>
                      <li>• Export sales data to CSV with <kbd>Ctrl+E</kbd></li>
                      <li>• Click on any sale to view detailed items</li>
                      <li>• Return button to process return from sale</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3">Return Status Indicators</h3>
                    <div className="space-y-2">
                      <Badge className="bg-red-500 text-white">Fully Returned</Badge>
                      <Badge className="bg-yellow-500 text-white">Partially Returned</Badge>
                      <Badge variant="outline">No Return</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Returns */}
          <TabsContent value="returns" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Undo2 className="h-5 w-5 text-primary" />
                  Returns Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">Processing Returns</h3>
                    <ol className="space-y-2 text-sm list-decimal list-inside">
                      <li>Go to Returns tab or click Return button from Sales</li>
                      <li>Search by original receipt number</li>
                      <li>Select items to return (check boxes or reduce quantity)</li>
                      <li>Add return fee if applicable (percentage or fixed amount)</li>
                      <li>Click "Process Return" to complete</li>
                    </ol>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3">Return Tracking</h3>
                    <p className="text-sm text-muted-foreground">
                      Returns are tracked with separate receipt numbers (RET-xxxxx). 
                      Stock is automatically restored and profit calculations are adjusted.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Customers */}
          <TabsContent value="customers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users2 className="h-5 w-5 text-primary" />
                  Customer Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">Customer Features</h3>
                    <ul className="space-y-2 text-sm">
                      <li>• Add new customers with contact details</li>
                      <li>• Track customer purchase history</li>
                      <li>• Send receipts via WhatsApp (requires phone number)</li>
                      <li>• View customer profile and activity</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3">WhatsApp Integration</h3>
                    <p className="text-sm text-muted-foreground">
                      When processing a sale, enter customer phone number to enable WhatsApp sharing.
                      Receipts are automatically formatted and sent directly to customer.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Employees */}
          <TabsContent value="employees" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users2 className="h-5 w-5 text-primary" />
                  Employee Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">Employee Features</h3>
                    <ul className="space-y-2 text-sm">
                      <li>• Add employees with salary details (Monthly/Weekly)</li>
                      <li>• Track attendance (Present/Absent/Leave)</li>
                      <li>• Manage salary payments with status tracking</li>
                      <li>• View sales performance for salesman role</li>
                      <li>• Share salary slips via WhatsApp</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3">Salary Calculation</h3>
                    <p className="text-sm text-muted-foreground">
                      Monthly salaries are calculated based on attendance. 
                      Absent days are deducted from monthly salary automatically.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expenses */}
          <TabsContent value="expenses" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  Expense Tracking
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">Managing Expenses</h3>
                    <ul className="space-y-2 text-sm">
                      <li>• Categorize expenses (Utilities, Rent, Supplies, etc.)</li>
                      <li>• Set recurring expenses (Daily, Weekly, Monthly, Yearly)</li>
                      <li>• Track daily cost automatically</li>
                      <li>• View expense summaries and trends</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3">Expense Categories</h3>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">Utilities</Badge>
                      <Badge variant="outline">Rent</Badge>
                      <Badge variant="outline">Supplies</Badge>
                      <Badge variant="outline">Marketing</Badge>
                      <Badge variant="outline">Transportation</Badge>
                      <Badge variant="outline">Maintenance</Badge>
                      <Badge variant="outline">Insurance</Badge>
                      <Badge variant="outline">Staff</Badge>
                      <Badge variant="outline">Equipment</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Purchases */}
          <TabsContent value="purchases" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  Purchase Orders
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">Creating Purchase Orders</h3>
                    <ul className="space-y-2 text-sm">
                      <li>• Click "New Purchase" or press <kbd>Ctrl+A</kbd></li>
                      <li>• Generate or enter PO Number</li>
                      <li>• Select supplier from your supplier list</li>
                      <li>• Enter items description and amounts</li>
                      <li>• Track order status (Pending/Delivered/Cancelled/Overdue)</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3">Supplier Management</h3>
                    <p className="text-sm text-muted-foreground">
                      Maintain supplier directory with contact info, vehicle details, 
                      and track purchase history with each supplier.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Suppliers */}
          <TabsContent value="suppliers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  Supplier Directory
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">Supplier Information</h3>
                    <ul className="space-y-2 text-sm">
                      <li>• Store contact details (Phone, Email)</li>
                      <li>• Track what each supplier sells</li>
                      <li>• Vehicle/transport information</li>
                      <li>• Address and city location</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3">Supplier Actions</h3>
                    <ul className="space-y-2 text-sm">
                      <li>• Add new suppliers with <kbd>Ctrl+A</kbd></li>
                      <li>• Edit supplier details</li>
                      <li>• Activate/Deactivate suppliers</li>
                      <li>• Export supplier list to CSV</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories */}
          <TabsContent value="categories" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tags className="h-5 w-5 text-primary" />
                  Category Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">Organizing Products</h3>
                    <ul className="space-y-2 text-sm">
                      <li>• Create parent/child category hierarchy</li>
                      <li>• Assign products to categories for better organization</li>
                      <li>• Filter products by category in POS terminal</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3">Category Structure</h3>
                    <div className="bg-muted/30 p-3 rounded-lg text-sm">
                      <p className="font-mono">Electronics</p>
                      <p className="pl-4 font-mono text-muted-foreground">├── Mobile Phones</p>
                      <p className="pl-4 font-mono text-muted-foreground">├── Laptops</p>
                      <p className="pl-4 font-mono text-muted-foreground">└── Accessories</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Net Profit */}
          <TabsContent value="net-profit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-primary" />
                  Profit Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">Profit Calculation</h3>
                    <ul className="space-y-2 text-sm">
                      <li>• <strong>Gross Profit:</strong> Sales revenue minus COGS</li>
                      <li>• <strong>Net Profit:</strong> Gross minus salaries and expenses</li>
                      <li>• View profit for any date range</li>
                      <li>• Breakdown by product category</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3">Profit Insights</h3>
                    <p className="text-sm text-muted-foreground">
                      Track your business profitability over time. Identify top-selling 
                      products and categories. Monitor expense impact on bottom line.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  System Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">General Settings</h3>
                    <ul className="space-y-2 text-sm">
                      <li>• Set default tax percentage</li>
                      <li>• Set default discount percentage</li>
                      <li>• Configure sidebar visibility for operators</li>
                      <li>• Reset admin PIN</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3">Backup & Restore</h3>
                    <ul className="space-y-2 text-sm">
                      <li>• Export database for backup</li>
                      <li>• Import database to restore</li>
                      <li>• Connect Google Drive for cloud backups</li>
                      <li>• Set auto-backup frequency</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Keyboard Shortcuts */}
          <TabsContent value="keyboard-shortcuts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Keyboard className="h-5 w-5 text-primary" />
                  Keyboard Shortcuts Reference
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">Global Shortcuts</h3>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b"><td className="py-2 font-mono"><kbd>F1</kbd></td><td>New Sale / Clear Cart</td></tr>
                        <tr className="border-b"><td className="py-2 font-mono"><kbd>F2</kbd></td><td>Process Payment</td></tr>
                        <tr className="border-b"><td className="py-2 font-mono"><kbd>F3</kbd></td><td>Print Receipt</td></tr>
                        <tr className="border-b"><td className="py-2 font-mono"><kbd>F4</kbd></td><td>Search Product</td></tr>
                        <tr className="border-b"><td className="py-2 font-mono"><kbd>F5</kbd></td><td>Toggle Return Mode</td></tr>
                        <tr className="border-b"><td className="py-2 font-mono"><kbd>F6</kbd></td><td>Toggle Order Mode</td></tr>
                        <tr className="border-b"><td className="py-2 font-mono"><kbd>F7</kbd></td><td>Focus Customer Name</td></tr>
                        <tr className="border-b"><td className="py-2 font-mono"><kbd>F8</kbd></td><td>Focus Customer Phone</td></tr>
                        <tr className="border-b"><td className="py-2 font-mono"><kbd>Delete</kbd></td><td>Remove Selected Item</td></tr>
                        <tr className="border-b"><td className="py-2 font-mono"><kbd>Esc</kbd></td><td>Clear Selection</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3">Modifier Shortcuts</h3>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b"><td className="py-2 font-mono"><kbd>Ctrl+↑</kbd></td><td>Increase Quantity</td></tr>
                        <tr className="border-b"><td className="py-2 font-mono"><kbd>Ctrl+↓</kbd></td><td>Decrease Quantity</td></tr>
                        <tr className="border-b"><td className="py-2 font-mono"><kbd>Ctrl+D</kbd></td><td>Focus Discount</td></tr>
                        <tr className="border-b"><td className="py-2 font-mono"><kbd>Ctrl+T</kbd></td><td>Focus Tax</td></tr>
                        <tr className="border-b"><td className="py-2 font-mono"><kbd>Ctrl+S</kbd></td><td>Go to Settings</td></tr>
                        <tr className="border-b"><td className="py-2 font-mono"><kbd>Ctrl+E</kbd></td><td>Export Data</td></tr>
                        <tr className="border-b"><td className="py-2 font-mono"><kbd>Ctrl+A</kbd></td><td>Add New (Product/Employee/etc)</td></tr>
                        <tr className="border-b"><td className="py-2 font-mono"><kbd>Ctrl+C</kbd></td><td>Clear Filters</td></tr>
                        <tr className="border-b"><td className="py-2 font-mono"><kbd>Ctrl+F</kbd></td><td>Focus Search Bar</td></tr>
                        <tr className="border-b"><td className="py-2 font-mono"><kbd>Alt+1-7</kbd></td><td>Quick Navigation</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-center text-muted-foreground">
                    💡 Shortcuts work when not typing in input fields. Press <kbd>Ctrl+H</kbd> to open shortcuts modal.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Support Footer */}
        <Card className="mt-8 bg-primary/5">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Need help? Contact support at <strong>support@brainsees.com</strong> or call <strong>+92-329-6121520</strong>
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Brainsees POS v1.0 - All rights reserved
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}