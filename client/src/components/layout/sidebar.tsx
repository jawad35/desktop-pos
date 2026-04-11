"use client";

import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Box,
  Calculator,
  ShoppingCart,
  Store,
  Tags,
  Truck,
  Receipt,
  CreditCard,
  ChartLine,
  X,
  Settings,
  Users2,
  UserCircle,
  Shield,
  User,
  AlertTriangle,
  Database,
  Key,
} from "lucide-react";
import { useHeader } from "@/contexts/HeaderContext";
import { useAuth } from "@/hooks/useAuth";
import { useLoginType } from "@/hooks/useLoginType";
import { useSidebarSettings } from "@/hooks/useSidebarSettings";
import { AdminPinModal } from "@/components/admin/AdminPinModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";

// All available navigation items
const ALL_NAVIGATION = [
  { name: "Dashboard", href: "/", icon: ChartLine, title: "Dashboard", subtitle: "Overview of your business", adminOnly: false },
  { name: "POS Terminal", href: "/pos", icon: CreditCard, title: "POS Terminal", subtitle: "Process customer sales", adminOnly: false },
  { name: "Products", href: "/products", icon: Box, title: "Products", subtitle: "Manage your product catalog", adminOnly: true },
  { name: "Sales", href: "/sales", icon: Receipt, title: "Sales", subtitle: "View and manage all sales transactions", adminOnly: false },
  { name: "Returns", href: "/returns", icon: Receipt, title: "Returns", subtitle: "View and manage all returns transactions", adminOnly: false },
  { name: "Purchases", href: "/purchases", icon: ShoppingCart, title: "Purchases", subtitle: "Record purchase orders", adminOnly: true },
  { name: "Suppliers", href: "/suppliers", icon: Truck, title: "Suppliers", subtitle: "Manage supplier information", adminOnly: true },
  { name: "Categories", href: "/categories", icon: Tags, title: "Categories", subtitle: "Organize your products", adminOnly: true },
  { name: "Expenses", href: "/expenses", icon: Calculator, title: "Expenses", subtitle: "Track business expenses", adminOnly: true },
  { name: "Employees", href: "/employees", icon: Users2, title: "Employees", subtitle: "Manage employees", adminOnly: true },
  // { name: "Damaged Stock", href: "/damaged", icon: AlertTriangle, title: "Damaged Stock", subtitle: "Manage damaged products", adminOnly: true },
  { name: "Profile", href: "/profile", icon: UserCircle, title: "Profile", subtitle: "See Shop Details", adminOnly: false },
  { name: "Settings", href: "/settings", icon: Settings, title: "Settings", subtitle: "Manage settings", adminOnly: true },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { setTitle, setSubtitle } = useHeader();
  const { shop } = useAuth();
  const { loginType, switchToOperator, refetch } = useLoginType();
  const { visibleTabs, isLoading: settingsLoading } = useSidebarSettings();
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  const filteredNavigation = ALL_NAVIGATION.filter(item => {
    if (loginType === 'admin') return true;
    // For operator: only show tabs that are in visibleTabs
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
      <div className={cn(
        "fixed inset-y-0 left-0 w-64 bg-card border-r border-border flex flex-col z-40 transform transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0 lg:static lg:flex"
      )}>
        {/* Mobile close button */}
        <div className="lg:hidden flex justify-end p-4">
          <button onClick={onClose} className="rounded-md hover:bg-muted">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Logo */}
        <div className="px-6 pb-4 lg:p-6 border-b border-border flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-14 h-14 rounded-lg flex items-center justify-center overflow-hidden bg-muted">
              {shop?.imageUrl ? (
                <img src={shop?.imageUrl} alt={shop.name} className="w-full h-full object-cover rounded-lg" />
              ) : (
                <Store className="h-6 w-6 text-primary-foreground" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{shop?.name || "ShopMart"}</h1>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">
          <nav className="p-4">
            <ul className="space-y-2">
              {filteredNavigation.map((item) => {
                const isActive = location === item.href;
                return (
                  <li key={item.name}>
                    <Link href={item.href}>
                      <a
                        className={cn(
                          "flex items-center space-x-3 p-3 rounded-lg transition-colors",
                          isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                        onClick={() => {
                          setTitle(item.title);
                          setSubtitle(item.subtitle);
                          onClose();
                        }}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.name}</span>
                      </a>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex-shrink-0 space-y-3">
          <div className="bg-muted p-3 rounded-lg">
            {/* Current Mode displayed above */}
            <div className="mb-3">
              <span className="text-xs text-muted-foreground">Current Mode </span>
              <Badge variant={loginType === 'admin' ? "destructive" : "default"} className="mt-1">
                {loginType === 'admin' ? 'Admin' : 'Operator'}
              </Badge>
            </div>

            {/* Switch button below */}
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
      </div>

      {isOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />}

      <AdminPinModal isOpen={isPinModalOpen} onClose={() => setIsPinModalOpen(false)} onSuccess={() => { refetch(); window.location.reload(); }} />
    </>
  );
}