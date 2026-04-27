"use client";

import { cn } from "@/lib/utils";
import {
  Box,
  Calculator,
  ShoppingCart,
  Store,
  Tags,
  Truck,
  ChartLine,
  X,
  Settings,
  Users2,
  UserCircle,
  Shield,
  User,
  Banknote,
  Undo2,
  HandCoins,
  ShoppingBag,
  HelpCircle
} from "lucide-react";
import { useHeader } from "@/contexts/HeaderContext";
import { useAuth } from "@/hooks/useAuth";
import { useLoginType } from "@/hooks/useLoginType";
import { useSidebarSettings } from "@/hooks/useSidebarSettings";
import { useNavigation } from "../../App";
import { AdminPinModal } from "@/components/admin/AdminPinModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";

// All available navigation items
const ALL_NAVIGATION = [
  { name: "Dashboard", href: "/", icon: ChartLine, title: "Dashboard", subtitle: "Overview of your business", adminOnly: false },
  { name: "POS Terminal", href: "/pos", icon: ShoppingBag, title: "POS Terminal", subtitle: "Process customer sales", adminOnly: false },
  { name: "Products", href: "/products", icon: Box, title: "Products", subtitle: "Manage your product catalog", adminOnly: true },
  { name: "Sales", href: "/sales", icon: HandCoins, title: "Sales", subtitle: "View and manage all sales transactions", adminOnly: false },
  { name: "Returns", href: "/returns", icon: Undo2, title: "Returns", subtitle: "View and manage all returns transactions", adminOnly: false },
  { name: "Purchases", href: "/purchases", icon: ShoppingCart, title: "Purchases", subtitle: "Record purchase orders", adminOnly: true },
  { name: "Suppliers", href: "/suppliers", icon: Truck, title: "Suppliers", subtitle: "Manage supplier information", adminOnly: true },
  { name: "Categories", href: "/categories", icon: Tags, title: "Categories", subtitle: "Organize your products", adminOnly: true },
  { name: "Expenses", href: "/expenses", icon: Calculator, title: "Expenses", subtitle: "Track business expenses", adminOnly: true },
  { name: "Employees", href: "/employees", icon: Users2, title: "Employees", subtitle: "Manage employees", adminOnly: true },
  { name: "Net Profit", href: "/net-profit", icon: Banknote, title: "Net Profit", subtitle: "Track Net Profit", adminOnly: true },
  { name: "Profile", href: "/profile", icon: UserCircle, title: "Profile", subtitle: "See Shop Details", adminOnly: false },
  { name: "Settings", href: "/settings", icon: Settings, title: "Settings", subtitle: "Manage settings", adminOnly: true },
  { name: "User Guide", href: "/user-guide", icon: HelpCircle, title: "User Guide", subtitle: "User Guide", adminOnly: true },
  { name: "Terms Polices", href: "/terms-policies", icon: HelpCircle, title: "Terms Polices", subtitle: "Terms and Polices", adminOnly: true },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { setTitle, setSubtitle } = useHeader();
  const { shop, user } = useAuth();
  const { loginType, switchToOperator, refetch } = useLoginType();
  const { visibleTabs } = useSidebarSettings();
  const { currentPath, navigateTo } = useNavigation();
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  const filteredNavigation = ALL_NAVIGATION.filter(item => {
    if (loginType === 'admin') return true;
    return visibleTabs.includes(item.name);
  });

  const handleAdminToggle = async () => {
    if (loginType === 'admin') {
      await switchToOperator();
      refetch();
      window.location.reload();
    } else {
      setIsPinModalOpen(true);
    }
  };

  return (
    <>
      <div
        className={cn(
          "w-64 bg-card border-r border-border flex flex-col shrink-0 transition-all duration-300 ease-in-out z-50 h-full",
          isOpen ? "w-64" : "w-0 overflow-hidden border-r-0"
        )}
      >
        {/* Close button */}
        {/* <div className="flex justify-end p-4 shrink-0">
          <button
            onClick={onClose}
            className="rounded-md hover:bg-muted focus:outline-none"
          >
            <X className="h-6 w-6" />
          </button>
        </div> */}

        {/* Logo */}
        <div className="px-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-14 h-14 rounded-lg flex items-center justify-center overflow-hidden bg-muted">
              {shop?.imageUrl ? (
                <img
                  src={shop?.imageUrl}
                  alt={shop.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <Store className="h-6 w-6 text-primary-foreground" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{shop?.name || "ShopMart"}</h1>
            </div>
          </div>
        </div>

        {/* Mode Chip - Fixed at top of scrollable area */}
        <div className="p-4 border-b border-border shrink-0">
          <div className="bg-muted p-3 rounded-lg">
            <div className="mb-2">
              <span className="text-xs text-muted-foreground">Current Mode</span>
              <Badge variant={loginType === 'admin' ? "destructive" : "default"} className="ml-2">
                {loginType === 'admin' ? 'Admin' : 'Operator'}
              </Badge>
            </div>

            <Button
              variant={loginType === 'admin' ? "destructive" : "outline"}
              size="sm"
              onClick={handleAdminToggle}
              className="w-full"
            >
              {loginType === 'admin' ? <User className="h-4 w-4 mr-1" /> : <Shield className="h-4 w-4 mr-1" />}
              {loginType === 'admin' ? 'Switch to Operator' : 'Switch to Admin'}
            </Button>
          </div>
        </div>

        {/* Scrollable navigation */}
        <div className="flex-1 overflow-y-auto">
          <nav className="p-4">
            <ul className="space-y-2">
              {filteredNavigation.map((item) => {
                const isActive = currentPath === item.href;
                return (
                  <li key={item.name}>
                    <div
                      className={cn(
                        "flex items-center space-x-3 p-3 rounded-lg transition-colors cursor-pointer",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                      onClick={() => {
                        navigateTo(item.href);
                        setTitle(item.title);
                        setSubtitle(item.subtitle);
                      }}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="text-sm">{item.name}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <AdminPinModal 
        isOpen={isPinModalOpen} 
        onClose={() => setIsPinModalOpen(false)} 
        onSuccess={() => { 
          refetch(); 
          window.location.reload(); 
        }} 
      />
    </>
  );
}