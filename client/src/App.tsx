import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "../src/components/ui/toaster";
import { TooltipProvider } from "../src/components/ui/tooltip";
import {useAuth } from "../src/hooks/useAuth";
import { AppLayout } from "../src/components/layout/AppLayout";

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
import LoginPage from "./pages/login";
import { HeaderProvider } from "./contexts/HeaderContext";
import SettingsPage from "./pages/settings";
import Employees from "./pages/employees/page";
import EmployeeDetails from "./pages/employees/[id]/page";
import { Profile } from "./pages/profile";
import Returns from "./pages/returns";
import ItemDetails from "./pages/item-details";
import AdminDashboard from "./pages/admin";
import { queryClient } from "./lib/queryClient";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {isAuthenticated ? (
        <Route path="/" component={LoginPage} />
      ) : (
        <AppLayout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/pos" component={POS} />
            <Route path="/products" component={Products} />
            <Route path="/sales" component={Sales} />
            <Route path="/returns" component={Returns} />
            <Route path="/item-details/:id/:mode" component={ItemDetails} />
            <Route path="/purchases" component={Purchases} />
            <Route path="/suppliers" component={Suppliers} />
            <Route path="/categories" component={Categories} />
            <Route path="/transaction-logs" component={TransactionLogs} />
            <Route path="/receipt-management" component={ReceiptManagement} />
            <Route path="/expenses" component={Expenses} />
            <Route path="/employees/:id" component={EmployeeDetails} />
            <Route path="/employees" component={Employees} />
            {user?.role === 'admin' && <Route path="/admin" component={AdminDashboard} />}
            <Route path="/settings" component={SettingsPage} />
            <Route path="/profile" component={Profile} />
            <Route component={NotFound} />
          </Switch>
        </AppLayout>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <HeaderProvider>
          {/* <AuthProvider> */}
            <Router />
          {/* </AuthProvider> */}
        </HeaderProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;