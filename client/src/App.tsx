import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "../src/components/ui/toaster";
import { TooltipProvider } from "../src/components/ui/tooltip";
import { AppLayout } from "../src/components/layout/AppLayout";
import { useEffect, useState } from "react";

// Pages
import Home from "@/pages/home";
import POS from "@/pages/pos";
import Products from "@/pages/products";
import DamagedStock from "@/pages/damaged-stock";
import Sales from "@/pages/sales";
import Purchases from "@/pages/purchases";
import Suppliers from "@/pages/suppliers";
import NetProfit from "@/pages/net-profit";

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
      // console.error("License check failed:", error);
      setIsLicensed(false);
    }
  };

  return { isLicensed, licenseData, checkLicense };
}

function Router() {
  const [location, setLocation] = useLocation();
  const { isLicensed } = useLicense();

  // Don't force redirect - let the routes handle navigation
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
      <AppLayout>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/pos" component={POS} />
          <Route path="/damaged" component={DamagedStock} />
          <Route path="/products" component={Products} />
          <Route path="/sales" component={Sales} />
          <Route path="/returns" component={Returns} />
          <Route path="/item-details/:id/:mode" component={ItemDetails} />
          <Route path="/purchases" component={Purchases} />
          <Route path="/suppliers" component={Suppliers} />
          <Route path="/net-profit" component={NetProfit} />
          <Route path="/categories" component={Categories} />
          <Route path="/transaction-logs" component={TransactionLogs} />
          <Route path="/receipt-management" component={ReceiptManagement} />
          <Route path="/expenses" component={Expenses} />
          <Route path="/employees/:id" component={EmployeeDetails} />
          <Route path="/employees" component={Employees} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/profile" component={Profile} />
          <Route component={isLicensed === true ? POS : NotFound} />
        </Switch>
      </AppLayout>
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