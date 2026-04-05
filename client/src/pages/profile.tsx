import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { useHeader } from "@/contexts/HeaderContext";

export function Profile() {
    const [shop, setShop] = useState<any>(null);
    const [subscriptionHistory, setSubscriptionHistory] = useState<any[]>([]);
    const { setTitle, setSubtitle } = useHeader();

    useEffect(() => {
        setTitle("Profile");
        setSubtitle("Shop Details");
        loadShopData();
    }, []);

    const loadShopData = async () => {
        try {
            // Get shop data from local license
            if (window.electronAPI && window.electronAPI.getShopData) {
                const result = await window.electronAPI.getShopData();
                if (result.success && result.shop) {
                    setShop(result.shop);
                }
            }
            
            // TODO: Load subscription history from local storage or API when online
            // For now, use mock data
            setSubscriptionHistory([
                { id: 1, amount: 15000, date: "2025-09-04", status: "Paid" },
                { id: 2, amount: 15000, date: "2025-08-04", status: "Paid" },
                { id: 3, amount: 15000, date: "2025-07-04", status: "Paid" },
            ]);
        } catch (error) {
            console.error('Failed to load shop data:', error);
        }
    };

    if (!shop) {
        return (
            <div className="p-6">
                <p className="text-muted-foreground">Loading shop details...</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-8">
            {/* Profile Section */}
            <Card>
                <CardHeader className="flex flex-col items-center space-y-4">
                    {shop.imageUrl && (
                        <img
                            src={shop.imageUrl}
                            alt={shop.name}
                            className="w-32 h-32 rounded-full object-cover border"
                        />
                    )}
                    <CardTitle className="text-2xl">{shop.name}</CardTitle>
                    <Badge
                        variant={
                            shop.subscriptionStatus === "active" ? "default" : "destructive"
                        }
                    >
                        {shop.subscriptionStatus}
                    </Badge>
                </CardHeader>

                <CardContent className="grid gap-4 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                        <p className="font-medium">Shop ID</p>
                        <p>{shop.shopId}</p>

                        <p className="font-medium">Owner</p>
                        <p>{shop.owner}</p>

                        <p className="font-medium">Type</p>
                        <p>{shop.type}</p>

                        <p className="font-medium">City</p>
                        <p>{shop.city}</p>

                        <p className="font-medium">Location</p>
                        <p>{shop.location || "-"}</p>

                        <p className="font-medium">Monthly Fee</p>
                        <p>Rs. {shop.monthlyFee}</p>

                        <p className="font-medium">Discount</p>
                        <p>{shop.discount}%</p>

                        <p className="font-medium">Permanent License</p>
                        <p>{shop.permanentLicense ? "Yes" : "No"}</p>

                        <p className="font-medium">Expiry Date</p>
                        <p>
                            {shop.expiryDate
                                ? new Date(shop.expiryDate).toLocaleDateString()
                                : "-"}
                        </p>

                        <p className="font-medium">Created At</p>
                        <p>{new Date(shop.createdAt).toLocaleDateString()}</p>
                    </div>
                </CardContent>
            </Card>

            {/* Subscription History Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Subscription History</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {subscriptionHistory.map((sub) => (
                                <TableRow key={sub.id}>
                                    <TableCell>{new Date(sub.date).toLocaleDateString()}</TableCell>
                                    <TableCell>Rs. {sub.amount}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={sub.status === "Paid" ? "default" : "destructive"}
                                        >
                                            {sub.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}