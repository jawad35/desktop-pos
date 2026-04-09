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
  History,
  FileText,
  CreditCard,
  ChartLine,
  X,
  Settings,
  Users2,
  UserCircle,
} from "lucide-react";
import { useHeader } from "@/contexts/HeaderContext";
import { useAuth } from "@/hooks/useAuth";

const navigation = [
  { name: "Dashboard", href: "/", icon: ChartLine, title: "Dashboard", subtitle: "Overview of your business" },
  { name: "POS Terminal", href: "/pos", icon: CreditCard, title: "POS Terminal", subtitle: "Process customer sales" },
  { name: "Products", href: "/products", icon: Box, title: "Products", subtitle: "Manage your product catalog" },
  { name: "Sales", href: "/sales", icon: Receipt, title: "Sales", subtitle: "View and manage all sales transactions" },
  { name: "Returns", href: "/returns", icon: Receipt, title: "Returns", subtitle: "View and manage all returns transactions" },
  { name: "Purchases", href: "/purchases", icon: ShoppingCart, title: "Purchases", subtitle: "Record purchase orders" },
  { name: "Suppliers", href: "/suppliers", icon: Truck, title: "Suppliers", subtitle: "Manage supplier information" },
  { name: "Categories", href: "/categories", icon: Tags, title: "Categories", subtitle: "Organize your products with categories and brands" },
  // { name: "Reports", href: "/reports", icon: BarChart3, title: "Reports", subtitle: "Business performance insights" },
  // { name: "Transaction Logs", href: "/transaction-logs", icon: History, title: "Transaction Logs", subtitle: "Audit system transactions" },
  // { name: "Receipt Management", href: "/receipt-management", icon: FileText, title: "Receipt Management", subtitle: "Manage receipts and invoices" },
  { name: "Expenses", href: "/expenses", icon: Calculator, title: "Expenses", subtitle: "Track business expenses" },
  { name: "Employees", href: "/employees", icon: Users2, title: "Employees", subtitle: "Manage employees, attendance and salaries" }, // Add this line
  // { name: "Orders", href: "/orders", icon: Users2, title: "Orders", subtitle: "Manage orders, attendance and salaries" }, // Add this line
  { name: "Damaged Stock", href: "/damaged", icon: Users2, title: "Employees", subtitle: "Manage employees, attendance and salaries" }, // Add this line

  { name: "Admin", href: "/admin", icon: Users2, title: "Admin", subtitle: "Manage admin, attendance and salaries" }, // Add this line
  { name: "Profile", href: "/profile", icon: UserCircle, title: "Profile", subtitle: "See Shop Details" },
  { name: "Settings", href: "/settings", icon: Settings, title: "Settings", subtitle: "Manage Discount and Tax" },

];


interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { setTitle, setSubtitle } = useHeader();
  const { expiryDate, shop, user } = useAuth();
  


  return (
    <>
      <div
        className={cn(
          "fixed inset-y-0 left-0 w-64 bg-card border-r border-border flex flex-col z-40 transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0 lg:static lg:flex"
        )}
      >
        {/* Mobile close button */}
        <div className="lg:hidden flex justify-end p-4">
          <button
            onClick={onClose}
            className="rounded-md hover:bg-muted focus:outline-none"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Logo */}
        <div className="px-6 pb-4 lg:p-6 border-b border-border flex-shrink-0">
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
              <h1 className="text-xl font-bold text-foreground">{shop ? shop?.name : "ShopMart"}</h1>
              <p className="text-sm text-muted-foreground"></p>
            </div>
          </div>
        </div>


        {/* Scrollable navigation */}
        <div className="flex-1 overflow-y-auto">
          <nav className="p-4">
            <ul className="space-y-2">
              {navigation.map((item) => {
                if (item.name === "Admin" && user?.role !== "admin") return null;

                const isActive = location === item.href;
                return (
                  <li key={item.name}>
                    <Link href={item.href}>
                      <a
                        className={cn(
                          "flex items-center space-x-3 p-3 rounded-lg transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
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

        {/* Footer fixed at bottom */}
        <div className="p-4 border-t border-border flex-shrink-0">
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Subscription</p>
                {/* <p className="text-xs text-muted-foreground">Expires: {new Date(expiryDate).toISOString().split("T")[0]}</p> */}
              </div>
              <div className="w-2 h-2 bg-secondary rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}
    </>
  );
}
