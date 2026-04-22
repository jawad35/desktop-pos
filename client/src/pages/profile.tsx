import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useHeader } from "@/contexts/HeaderContext";
import axios from 'axios';

const API_URL = 'https://admin-pod.onrender.com/api';

export function Profile() {
    const [shop, setShop] = useState<any>(null);
    const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
    const [totalPayments, setTotalPayments] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const { setTitle, setSubtitle } = useHeader();
    const itemsPerPage = 10;

    console.log(shop,'sjop7273')

    useEffect(() => {
        setTitle("Profile");
        setSubtitle("Shop Details & Payment History");
        loadShopData();
    }, []);

    useEffect(() => {
        if (shop?.id) {
            loadPaymentHistory();
        }
    }, [shop?.id, currentPage]);

    const loadShopData = async () => {
        try {
            if (window.electronAPI && window.electronAPI.getShopData) {
                const result = await window.electronAPI.getShopData();
                if (result.success && result.shop) {
                    setShop(result.shop);
                }
            }
        } catch (error) {
            console.error('Failed to load shop data:', error);
        }
    };

    const loadPaymentHistory = async () => {
        if (!shop?.id) return;
        
        setIsLoading(true);
        try {
            const response = await axios.get(`${API_URL}/shops/${shop.id}/payment-history`, {
                params: { page: currentPage, limit: itemsPerPage },
                timeout: 10000,
                headers: { 'Content-Type': 'application/json' }
            });
            
            console.log('Payment history:', response.data);
            setPaymentHistory(response.data.payments || []);
            setTotalPayments(response.data.total || 0);
            setTotalPages(response.data.totalPages || 1);
        } catch (error) {
            console.error('Error fetching payment history:', error);
            setPaymentHistory([]);
        } finally {
            setIsLoading(false);
        }
    };

    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    if (!shop) {
        return (
            <div className="p-6 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
{/* 
                        <p className="font-medium">Monthly Fee</p>
                        <p>Rs. {shop.monthlyFee}</p> */}

                        <p className="font-medium">Permanent License</p>
                        <p>{shop.permanentLicense ? "Yes" : "No"}</p>

                        {/* <p className="font-medium">Expiry Date</p>
                        <p>
                            {shop.expiryDate
                                ? new Date(shop.expiryDate).toLocaleDateString()
                                : "-"}
                        </p> */}

                        <p className="font-medium">Created At</p>
                        <p>{new Date(shop.createdAt).toLocaleDateString()}</p>
                    </div>
                </CardContent>
            </Card>

            {/* Payment History Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                        <span>Payment History</span>
                        <span className="text-sm font-normal text-muted-foreground">
                            Total Paid: Rs. {paymentHistory.reduce((sum, p) => sum + parseFloat(p.amount), 0).toLocaleString()}
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : paymentHistory.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No payment history found
                        </div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Month</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Payment Date</TableHead>
                                        <TableHead>Method</TableHead>
                                        <TableHead>Collected By</TableHead>
                                        <TableHead>Receipt #</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paymentHistory.map((payment) => (
                                        <TableRow key={payment.id}>
                                            <TableCell>
                                                {new Date(payment.paymentMonth).toLocaleDateString('default', { 
                                                    month: 'long', 
                                                    year: 'numeric' 
                                                })}
                                            </TableCell>
                                            <TableCell>Rs. {parseFloat(payment.amount).toLocaleString()}</TableCell>
                                            <TableCell>
                                                {new Date(payment.paymentDate).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="capitalize">{payment.paymentMethod}</TableCell>
                                            <TableCell>{payment.collectedBy || '-'}</TableCell>
                                            <TableCell className="font-mono text-xs">{payment.receiptNumber}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-4">
                                    <div className="text-sm text-muted-foreground">
                                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalPayments)} of {totalPayments} payments
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => goToPage(currentPage - 1)}
                                            disabled={currentPage === 1}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                            Previous
                                        </Button>
                                        <span className="flex items-center px-4 text-sm">
                                            Page {currentPage} of {totalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => goToPage(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                        >
                                            Next
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}