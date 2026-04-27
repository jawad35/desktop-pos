import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
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
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const { setTitle, setSubtitle } = useHeader();
    const itemsPerPage = 10;

    useEffect(() => {
        setTitle("Profile");
        setSubtitle("Shop Details & Payment History");
        loadShopData();

        // Set up auto-sync every 5 minutes
        const interval = setInterval(() => {
            refreshAllData(true); // Silent refresh
        }, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (shop?.id || shop?.shopId) {
            loadPaymentHistory();
        }
    }, [shop?.id, shop?.shopId, currentPage]);

    const loadShopData = async () => {
        try {
            // First try to get from electron or local storage
            let localShopData = null;

            if (window.electronAPI && window.electronAPI.getShopData) {
                const result = await window.electronAPI.getShopData();
                if (result.success && result.shop) {
                    localShopData = result.shop;
                }
            } else {
                const storedData = localStorage.getItem('shopData');
                if (storedData) {
                    localShopData = JSON.parse(storedData);
                }
            }

            if (localShopData) {
                setShop(localShopData);

                // Check if data is stale (older than 5 minutes)
                const lastFetch = localStorage.getItem('lastShopDataFetch');
                if (lastFetch && (Date.now() - parseInt(lastFetch)) > 5 * 60 * 1000) {
                    await fetchLatestShopData();
                }
            } else {
                // If no local data, fetch from server
                await fetchLatestShopData();
            }
        } catch (error) {
            console.error('Failed to load shop data:', error);
        }
    };

    const fetchLatestShopData = async () => {
    try {
        // Get shop ID from various sources
        let shopId = null;

        // Try to get from electron first
        if (window.electronAPI && window.electronAPI.getShopId) {
            const result = await window.electronAPI.getShopId();
            shopId = result.shopId;
        }
        // Then try from current shop state
        else if (shop?.shopId) {
            shopId = shop.shopId;
        }
        // Finally try from localStorage
        else {
            shopId = localStorage.getItem('shopId');
        }

        if (!shopId) {
            console.error('No shop ID found');
            return;
        }

        console.log('Fetching latest shop data for ID:', shopId);

        // Fetch subscription status from server
        const response = await axios.get(`${API_URL}/shops/${shopId}/subscription-status`, {
            timeout: 10000,
            headers: { 'Content-Type': 'application/json' }
        });

        console.log('Server response:', response.data);

        if (response.data.success && response.data.data) {
            const serverShopData = response.data.data;

            // Merge with existing local data to preserve any extra fields
            const mergedShopData = {
                ...shop,
                ...serverShopData,
                id: serverShopData.id,
                shopId: serverShopData.shopId,
                name: serverShopData.name,
                subscriptionStatus: serverShopData.subscriptionStatus,
                expiryDate: serverShopData.expiryDate,
                permanentLicense: serverShopData.permanentLicense,
                phoneNo: serverShopData.phoneNo || shop?.phoneNo,
                termsPoliciesAccepted: serverShopData.termsPoliciesAccepted || shop?.termsPoliciesAccepted,
                owner: serverShopData.owner || shop?.owner,
                type: serverShopData.type || shop?.type,
                city: serverShopData.city || shop?.city,
                location: serverShopData.location || shop?.location,
                imageUrl: serverShopData.imageUrl || shop?.imageUrl,
                discount: serverShopData.discount || shop?.discount,
                createdAt: serverShopData.createdAt || shop?.createdAt,
                updatedAt: serverShopData.updatedAt || new Date().toISOString()
            };

            setShop(mergedShopData);

            // 1. Update localStorage
            localStorage.setItem('shopData', JSON.stringify(mergedShopData));
            localStorage.setItem('lastShopDataFetch', Date.now().toString());
            localStorage.setItem('shopId', serverShopData.shopId);

            // 2. Update electron local storage (renderer store)
            if (window.electronAPI && window.electronAPI.updateShopData) {
                await window.electronAPI.updateShopData(mergedShopData);
            }

            // 3. CRITICAL: Update license data in main process
            if (window.electronAPI && window.electronAPI.updateLicenseShopData) {
                const licenseUpdateResult = await window.electronAPI.updateLicenseShopData(mergedShopData);
                console.log('License update result:', licenseUpdateResult);
                
                if (licenseUpdateResult && licenseUpdateResult.success) {
                    console.log('✅ License data updated successfully in main process');
                } else {
                    console.error('❌ Failed to update license data');
                }
            }

            // 4. Also update the shop data in main process storage
            if (window.electronAPI && window.electronAPI.syncShopData) {
                await window.electronAPI.syncShopData(mergedShopData);
            }

            setSyncStatus('success');
            setTimeout(() => setSyncStatus('idle'), 3000);

            return mergedShopData;
        } else {
            console.error('Server returned unsuccessful response:', response.data);
            setSyncStatus('error');
            setTimeout(() => setSyncStatus('idle'), 3000);
            return null;
        }
    } catch (error) {
        console.error('Failed to fetch latest shop data:', error);
        setSyncStatus('error');
        setTimeout(() => setSyncStatus('idle'), 3000);
        return null;
    }
};

    const loadPaymentHistory = async () => {
        const shopIdentifier = shop?.id || shop?.shopId;
        if (!shopIdentifier) return;

        setIsLoading(true);
        try {
            const response = await axios.get(`${API_URL}/shops/${shopIdentifier}/payment-history`, {
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

    const refreshAllData = async (silent = false) => {
        if (!silent) {
            setIsRefreshing(true);
        }

        try {
            console.log('Refreshing all data...');

            // Fetch latest shop data from server
            const updatedShop = await fetchLatestShopData();

            // If shop data was updated, reload payment history
            if (updatedShop || shop) {
                // Reset to first page to show latest payments
                if (currentPage !== 1) {
                    setCurrentPage(1);
                } else {
                    // If already on first page, reload payment history
                    await loadPaymentHistory();
                }
            }

            setLastSyncTime(new Date());
            console.log('Refresh completed successfully');
        } catch (error) {
            console.error('Error refreshing data:', error);
            if (!silent) {
                setSyncStatus('error');
                setTimeout(() => setSyncStatus('idle'), 3000);
            }
        } finally {
            if (!silent) {
                setIsRefreshing(false);
            }
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
            {/* Sync Status Indicator */}
            {syncStatus !== 'idle' && (
                <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${syncStatus === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {syncStatus === 'success' ? (
                        <>
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-sm">Data synced successfully</span>
                        </>
                    ) : (
                        <>
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm">Sync failed. Please try again.</span>
                        </>
                    )}
                </div>
            )}

            {/* Profile Section */}
            <Card>
                <CardHeader className="relative">
                    <div className="flex flex-col items-center space-y-4">
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
                                shop.subscriptionStatus === "active" ? "default" :
                                    shop.subscriptionStatus === "expired" ? "destructive" : "secondary"
                            }
                        >
                            {shop.subscriptionStatus}
                        </Badge>
                    </div>
                    <div className="absolute top-4 right-4 flex gap-2">
                        {lastSyncTime && (
                            <span className="text-xs text-muted-foreground mr-2">
                                Last sync: {lastSyncTime.toLocaleTimeString()}
                            </span>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refreshAllData(false)}
                            disabled={isRefreshing}
                        >
                            {isRefreshing ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Syncing...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Sync Now
                                </>
                            )}
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="grid gap-6 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Basic Information Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 border-b pb-2">
                                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                                <h3 className="font-semibold text-base">Basic Information</h3>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <p className="font-medium text-muted-foreground">Shop ID</p>
                                    <p className="font-mono text-sm bg-muted px-2 py-1 rounded">{shop.shopId}</p>
                                </div>

                                <div className="flex justify-between items-center">
                                    <p className="font-medium text-muted-foreground">Shop Name</p>
                                    <p className="font-semibold">{shop.name}</p>
                                </div>

                                <div className="flex justify-between items-center">
                                    <p className="font-medium text-muted-foreground">Owner</p>
                                    <p>{shop.owner || '-'}</p>
                                </div>

                                <div className="flex justify-between items-center">
                                    <p className="font-medium text-muted-foreground">WhatsApp</p>
                                    {shop?.phoneNo ? (
                                        <a href={`https://wa.me/${shop.phoneNo.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                                            className="text-green-600 hover:text-green-700 flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                                            </svg>
                                            {shop.phoneNo}
                                        </a>
                                    ) : (
                                        <p className="text-muted-foreground">-</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Location Information Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 border-b pb-2">
                                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                <h3 className="font-semibold text-base">Location Details</h3>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <p className="font-medium text-muted-foreground">Shop Type</p>
                                    <Badge variant="outline" className="capitalize">
                                        {shop.type || '-'}
                                    </Badge>
                                </div>

                                <div className="flex justify-between items-center">
                                    <p className="font-medium text-muted-foreground">City</p>
                                    <Badge variant="secondary">{shop.city || '-'}</Badge>
                                </div>

                                <div className="flex justify-between items-start">
                                    <p className="font-medium text-muted-foreground">Location</p>
                                    <p className="text-right max-w-[60%]">{shop.location || "-"}</p>
                                </div>
                            </div>
                        </div>

                        {/* Subscription Information Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 border-b pb-2">
                                <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                                <h3 className="font-semibold text-base">Subscription</h3>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <p className="font-medium text-muted-foreground">Status</p>
                                    <Badge
                                        variant={shop.subscriptionStatus === "active" ? "default" : "destructive"}
                                        className="capitalize"
                                    >
                                        {shop.subscriptionStatus}
                                    </Badge>
                                </div>

                                <div className="flex justify-between items-center">
                                    <p className="font-medium text-muted-foreground">Permanent License</p>
                                    <Badge variant={shop.permanentLicense ? "default" : "secondary"}>
                                        {shop.permanentLicense ? "✓ Yes" : "✗ No"}
                                    </Badge>
                                </div>

                                {shop.expiryDate && !shop.permanentLicense && (
                                    <div className="flex justify-between items-center">
                                        <p className="font-medium text-muted-foreground">Expiry Date</p>
                                        <Badge variant={new Date(shop.expiryDate) < new Date() ? "destructive" : "outline"}>
                                            {new Date(shop.expiryDate).toLocaleDateString()}
                                            {new Date(shop.expiryDate) < new Date() && " (Expired)"}
                                        </Badge>
                                    </div>
                                )}

                                {shop.discount && parseFloat(shop.discount) > 0 && (
                                    <div className="flex justify-between items-center">
                                        <p className="font-medium text-muted-foreground">Discount</p>
                                        <Badge variant="success" className="bg-green-100 text-green-800">
                                            {shop.discount}% OFF
                                        </Badge>
                                    </div>
                                )}

                                <div className="flex justify-between items-center">
                                    <p className="font-medium text-muted-foreground">Terms & Policies</p>
                                    <Badge variant={shop.termsPoliciesAccepted ? "default" : "destructive"}>
                                        {shop.termsPoliciesAccepted ? "✓ Accepted" : "✗ Not Accepted"}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {/* System Information Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 border-b pb-2">
                                <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                                <h3 className="font-semibold text-base">System Info</h3>
                            </div>

                            <div className="space-y-3">
                                {shop.totalRevenue && (
                                    <div className="flex justify-between items-center">
                                        <p className="font-medium text-muted-foreground">Total Revenue</p>
                                        <p className="text-green-600 font-semibold">PKR {parseFloat(shop.totalRevenue).toLocaleString()}</p>
                                    </div>
                                )}

                                {shop.createdAt && (
                                    <div className="flex justify-between items-center">
                                        <p className="font-medium text-muted-foreground">Created At</p>
                                        <p className="text-muted-foreground">{new Date(shop.createdAt).toLocaleDateString()}</p>
                                    </div>
                                )}

                                {shop.updatedAt && (
                                    <div className="flex justify-between items-center">
                                        <p className="font-medium text-muted-foreground">Last Updated</p>
                                        <p className="text-muted-foreground">{new Date(shop.updatedAt).toLocaleDateString()}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Terms & Policies Acceptance Card (if not accepted) */}
                    {!shop.termsPoliciesAccepted && (
                        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-yellow-800">Terms & Policies Not Accepted</p>
                                    <p className="text-sm text-yellow-700 mt-1">
                                        Please accept the terms and policies to continue using all features.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Payment History Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                        <span>Payment History</span>
                        <div className="flex gap-4">
                            <span className="text-sm font-normal text-muted-foreground">
                                Total Paid: Rs. {paymentHistory.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0).toLocaleString()}
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => refreshAllData(false)}
                                disabled={isRefreshing}
                            >
                                {isRefreshing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
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
                                            disabled={currentPage === 1 || isRefreshing}
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
                                            disabled={currentPage === totalPages || isRefreshing}
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