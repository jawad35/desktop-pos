import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, BarChart3, ShoppingCart, Receipt } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/login"; // ✅ goes to login page
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
              <Store className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            ShopSmart Manager Pro
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Complete POS & Inventory Management System for Pakistani Businesses
          </p>
          <Button
            onClick={handleLogin}
            size="lg"
            className="text-lg px-8 py-6"
            data-testid="button-login"
          >
            Login to Continue
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Receipt className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Point of Sale</CardTitle>
              <CardDescription>
                Fast and efficient POS terminal with barcode scanning and multiple payment methods
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                <ShoppingCart className="h-6 w-6 text-secondary" />
              </div>
              <CardTitle>Inventory Management</CardTitle>
              <CardDescription>
                Complete product management with categories, brands, and supplier tracking
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-accent" />
              </div>
              <CardTitle>Reports & Analytics</CardTitle>
              <CardDescription>
                Comprehensive reporting with sales analytics and financial insights
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="text-center">
          <p className="text-muted-foreground">
            Designed specifically for Pakistani retail businesses with PKR currency support
          </p>
        </div>
      </div>
    </div>
  );
}
