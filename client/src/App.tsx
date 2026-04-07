import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "../src/components/ui/toaster";
import { TooltipProvider } from "../src/components/ui/tooltip";
import { AppLayout } from "../src/components/layout/AppLayout";
import { useEffect, useState, createContext, useContext } from "react";

// Pages
import Home from "@/pages/home";
import POS from "@/pages/pos";
import Products from "@/pages/products";
import Sales from "@/pages/sales";
import Purchases from "@/pages/purchases";
import Suppliers from "@/pages/suppliers";
import Categories from "@/pages/categories";
import TransactionLogs from "@/pages/transaction-logs";
import ReceiptManagement from "@/pages/receipt-management";
import Expenses from "@/pages/expenses";
import NotFound from "@/pages/not-found";
import { HeaderProvider } from "./contexts/HeaderContext";
import SettingsPage from "./pages/settings";
import Employees from "./pages/employees/page";
import EmployeeDetails from "./pages/employees/[id]/page";
import { Profile } from "./pages/profile";
import Returns from "./pages/returns";
import ItemDetails from "./pages/item-details";
import AdminDashboard from "./pages/admin";
import { queryClient } from "./lib/queryClient";
import ActivationScreen from "@/pages/activation";

// Create a navigation context
type NavigationContextType = {
  currentPath: string;
  navigateTo: (path: string) => void;
};

export const NavigationContext = createContext<NavigationContextType>({
  currentPath: '/',
  navigateTo: () => {},
});

export const useNavigation = () => useContext(NavigationContext);

function useLicense() {
  const [isLicensed, setIsLicensed] = useState<boolean | null>(null);
  const [licenseData, setLicenseData] = useState<any>(null);

  useEffect(() => {
    checkLicense();
  }, []);

  const checkLicense = async () => {
    try {
      if (window.electronAPI && window.electronAPI.checkLicense) {
        const result = await window.electronAPI.checkLicense();
        setIsLicensed(result.success);
        setLicenseData(result);
      } else {
        setIsLicensed(true);
      }
    } catch (error) {
      console.error("License check failed:", error);
      setIsLicensed(false);
    }
  };

  return { isLicensed, licenseData, checkLicense };
}

// Main content renderer based on path
function MainContent({ path }: { path: string }) {
  // Handle dynamic routes
  if (path.startsWith('/employees/') && path !== '/employees') {
    const id = path.split('/')[2];
    return <EmployeeDetails params={{ id }} />;
  }
  
  if (path.startsWith('/item-details/')) {
    const parts = path.split('/');
    const id = parts[2];
    const mode = parts[3];
    return <ItemDetails params={{ id, mode }} />;
  }

  // Static routes
  switch(path) {
    case '/':
      return <Home />;
    case '/pos':
      return <POS />;
    case '/products':
      return <Products />;
    case '/sales':
      return <Sales />;
    case '/returns':
      return <Returns />;
    case '/purchases':
      return <Purchases />;
    case '/suppliers':
      return <Suppliers />;
    case '/categories':
      return <Categories />;
    case '/transaction-logs':
      return <TransactionLogs />;
    case '/receipt-management':
      return <ReceiptManagement />;
    case '/expenses':
      return <Expenses />;
    case '/employees':
      return <Employees />;
    case '/admin':
      return <AdminDashboard />;
    case '/settings':
      return <SettingsPage />;
    case '/profile':
      return <Profile />;
    default:
      return <NotFound />;
  }
}

function Router() {
  const { isLicensed } = useLicense();
  const [currentPath, setCurrentPath] = useState(() => {
    // Try to get from localStorage or default to '/'
    return localStorage.getItem('currentRoute') || '/';
  });

  // Save to localStorage when path changes
  useEffect(() => {
    localStorage.setItem('currentRoute', currentPath);
  }, [currentPath]);

  const navigateTo = (path: string) => {
    setCurrentPath(path);
  };

  if (isLicensed === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking license...</p>
        </div>
      </div>
    );
  }

  if (isLicensed === true) {
    return (
      <NavigationContext.Provider value={{ currentPath, navigateTo }}>
        <AppLayout>
          <MainContent path={currentPath} />
        </AppLayout>
      </NavigationContext.Provider>
    );
  }

  return <ActivationScreen onActivated={() => window.location.reload()} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <HeaderProvider>
          <Router />
        </HeaderProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;