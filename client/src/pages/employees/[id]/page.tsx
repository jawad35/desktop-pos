import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPKR } from "@/lib/currency";
import { format } from "date-fns";
import { Calendar, Banknote, Share, Download, ArrowLeft, Users } from "lucide-react";
import { useHeader } from "@/contexts/HeaderContext";
import { useToast } from "@/hooks/use-toast";
import { useRoute, useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { api } from "../../../services/electron-api";
interface Employee {
    id: string;
    name: string;
    phone: string;
    salary: number;
    salary_type: 'monthly' | 'weekly';
    payment_method: 'cash' | 'easypaisa' | 'bank' | 'jazzcash' | "card" | 'check';
    shift: 'day' | 'night';
    employee_type: 'manager' | 'cashier' | 'labor' | 'salesman' | 'other';
    join_date: string;
    leave_date?: string;
    is_active: number;
}

interface Attendance {
    id: string;
    employeeId: string;
    date: string;
    status: 'present' | 'absent' | 'leave';
    checkIn?: string;
    checkOut?: string;
    notes?: string;
}

interface Salary {
    id: string;
    employeeId: string;
    month: string;
    year: number;
    basicSalary: number;
    deductions: number;
    bonuses: number;
    netSalary: number;
    status: 'pending' | 'paid' | 'cancelled';
    paymentDate?: string;
    payment_method?: string;
    notes?: string;
}

export default function EmployeeDetails() {
    const [match, params] = useRoute("/employees/:id");
    const [, setLocation] = useLocation();
    const employeeId = params?.id as string;
    const [selectedTab, setSelectedTab] = useState("attendance");
    const [attendanceDate, setAttendanceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [salaryDate, setSalaryDate] = useState(format(new Date(), 'yyyy-MM'));
    const [bonuses, setBonuses] = useState("0");
    const [deductions, setDeductions] = useState("0");
    const [salaryStatus, setSalaryStatus] = useState<'pending' | 'paid' | 'cancelled'>('pending');
    const { toast } = useToast();

    const handleBack = () => {
        setLocation("/employees"); // Navigate back to employees list
    };

    // Handle click redirect
    const handleSaleClick = (saleId: string) => {
        setLocation(`/item-details/${saleId}/sales`);
    };

    const { data: employee, isLoading } = useQuery<Employee>({
        queryKey: ["employee", employeeId],
        queryFn: async () => {
            const result = await api.getEmployee(employeeId);  // This calls getEmployee
            console.log('Employee API result:', result);
            if (result?.success && result.data) return result.data;
            if (result?.id) return result;  // If result is the employee directly
            return result;
        },
        enabled: !!employeeId,
    });

    const { data: attendance = [], isLoading: attendanceLoading } = useQuery<Attendance[]>({
        queryKey: ["attendance", employeeId],
        queryFn: async () => {
            // Get current month and year
            const now = new Date();
            const year = now.getFullYear().toString();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');

            // Pass month and year to get all attendance for current month
            const result = await api.getAttendance(employeeId, month, year);
            console.log('Attendance API result:', result);

            if (Array.isArray(result)) return result;
            if (result?.success && Array.isArray(result.data)) return result.data;
            return [];
        },
        enabled: !!employeeId,
    });

    const { data: salaries = [], isLoading: salariesLoading } = useQuery<Salary[]>({
        queryKey: ["salaries", employeeId],
        queryFn: async () => {
            const result = await api.getSalaries(employeeId);
            if (Array.isArray(result)) return result;
            if (result?.success && Array.isArray(result.data)) return result.data;
            return [];
        },
        enabled: !!employeeId,
    });

    const markAttendanceMutation = useMutation({
        mutationFn: async (data: { date: string; status: string }) => {
            const attendanceData = {
                employeeId: employeeId,
                date: data.date,
                status: data.status,
                userId: 'system',
                shopId: 'default'
            };
            const result = await api.markAttendance(attendanceData);
            return result;
        },
        onSuccess: () => {
            toast({ title: "Success", description: "Attendance marked successfully" });
            queryClient.invalidateQueries({ queryKey: ["attendance", employeeId] });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const createSalaryMutation = useMutation({
        mutationFn: async (salaryData: any) => {
            const data = {
                employeeId: employeeId,
                month: salaryData.month,
                year: salaryData.year,
                basicSalary: parseFloat(salaryData.basicSalary) || 0,
                bonuses: parseFloat(salaryData.bonuses) || 0,
                deductions: parseFloat(salaryData.deductions) || 0,
                netSalary: parseFloat(salaryData.netSalary) || 0,
                status: salaryData.status,
                paymentMethod: salaryData.paymentMethod || 'cash',
                userId: 'system',
                shopId: 'default'
            };
            console.log('Creating salary with data:', data);
            const result = await api.createSalary(data);
            console.log('Create salary result:', result);
            return result;
        },
        onSuccess: () => {
            toast({ title: "Success", description: "Salary record added successfully" });
            queryClient.invalidateQueries({ queryKey: ["salaries", employeeId] });
            setBonuses("0");
            setDeductions("0");
            setSalaryStatus('pending');
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const updateSalaryStatusMutation = useMutation({
        mutationFn: async ({ salaryId, status }: { salaryId: string; status: string }) => {
            const result = await api.updateSalaryStatus(salaryId, status);
            return result;
        },
        onSuccess: () => {
            toast({ title: "Success", description: "Salary status updated successfully" });
            queryClient.invalidateQueries({ queryKey: ["salaries", employeeId] });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const handleMarkAttendance = (status: 'present' | 'absent' | 'leave') => {
        markAttendanceMutation.mutate({
            date: attendanceDate,
            status,
        });
    };

    const handleAddSalary = () => {
        if (!salaryDate) {
            toast({ title: "Error", description: "Please select a month", variant: "destructive" });
            return;
        }

        const [year, month] = salaryDate.split('-');
        const basic = parseFloat(employee?.salary?.toString() || "0");
        const bonus = parseFloat(bonuses) || 0;
        const deduction = parseFloat(deductions) || 0;
        const netSalary = basic + bonus - deduction;

        createSalaryMutation.mutate({
            month: salaryDate,
            year: parseInt(year),
            basicSalary: basic,
            bonuses: bonus,
            deductions: deduction,
            netSalary: netSalary,
            status: salaryStatus,
            payment_method: employee?.payment_method,
        });
    };

    // Update the filter handlers:
    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleShareSalarySlip = (salary: Salary) => {
        if (!employee) return;

        // Safe date formatting for WhatsApp message
        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"];

        // Extract month number from "YYYY-MM" format
        const monthNumber = parseInt(salary.month.split('-')[1]);
        const monthName = monthNames[monthNumber - 1]; // Convert to 0-based index
        const formattedDate = `${monthName} ${salary.year}`;

        const message = `*Salary Slip - ${formattedDate}*%0A%0A` +
            `Employee: ${employee.name}%0A` +
            `Phone: ${employee.phone}%0A` +
            `Basic Salary: ${formatPKR(salary.basicSalary)}%0A` +
            `Bonuses: ${formatPKR(salary.bonuses)}%0A` +
            `Deductions: ${formatPKR(salary.deductions)}%0A` +
            `*Net Salary: ${formatPKR(salary.netSalary)}*%0A` +
            `Status: ${salary.status.toUpperCase()}%0A` +
            `Payment Method: ${employee.payment_method}%0A%0A` +
            `Thank you for your hard work!`;

        const whatsappUrl = `https://wa.me/+92${employee.phone.replace(/\D/g, '').replace(/^0/, '')}?text=${message}`;
        window.open(whatsappUrl, '_blank');
    };


    const [paymentStatus, setPaymentStatus] = useState("");
    const [minTotal, setMinTotal] = useState("");
    const [maxTotal, setMaxTotal] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [filters, setFilters] = useState({
        paymentStatus: "",
        startDate: "",
        endDate: "",
        minTotal: "",
        maxTotal: "",
    });
    const { data: sales = [], isLoading: salesLoading } = useQuery({
        queryKey: ["sales", employee?.id, filters],
        queryFn: async () => {
            if (!employee?.id) return [];
            const result = await api.getSales();
            let salesData = [];
            if (Array.isArray(result)) salesData = result;
            else if (result?.success && Array.isArray(result.data)) salesData = result.data;

            // Filter by employeeId
            salesData = salesData.filter((s: any) => s.employee_id === employee.id);

            // Apply other filters
            if (filters.paymentStatus) {
                salesData = salesData.filter((s: any) => s.payment_status === filters.paymentStatus);
            }
            if (filters.minTotal) {
                salesData = salesData.filter((s: any) => parseFloat(s.total) >= parseFloat(filters.minTotal));
            }
            if (filters.maxTotal) {
                salesData = salesData.filter((s: any) => parseFloat(s.total) <= parseFloat(filters.maxTotal));
            }
            if (filters.startDate) {
                salesData = salesData.filter((s: any) => new Date(s.created_at) >= new Date(filters.startDate));
            }
            if (filters.endDate) {
                salesData = salesData.filter((s: any) => new Date(s.created_at) <= new Date(filters.endDate));
            }

            return { data: salesData };
        },
        enabled: !!employee?.id && employee?.employee_type === 'salesman',
    });


    // Calculate totals for summary
    // Calculate totals for summary
    const totalPaid = salaries.filter(s => s.status === 'paid').reduce((sum, s) => sum + (parseFloat(s.netSalary?.toString() || '0')), 0);
    const totalPending = salaries.filter(s => s.status === 'pending').reduce((sum, s) => sum + (parseFloat(s.netSalary?.toString() || '0')), 0);
    const netSalaryCalculation = parseFloat(employee?.salary || "0") + parseFloat(bonuses) - parseFloat(deductions);

    const { setTitle, setSubtitle } = useHeader();

    useEffect(() => {
        if (employee) {
            setTitle(employee.name);
            setSubtitle("Employee Details");
        }
    }, [employee]);
    // Update the reset function:
    const handleResetFilters = () => {
        setFilters({
            paymentStatus: "",
            startDate: "",
            endDate: "",
            minTotal: "",
            maxTotal: "",
        });
    };
    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2">Loading employee...</span>
            </div>
        );
    }

    if (!employee) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <p>Employee not found</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <main className="flex-1 overflow-auto p-6">
                {/* Back Button */}
                <div className="mb-6">
                    <Button variant="outline" onClick={handleBack}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Employees
                    </Button>
                </div>


                {/* Employee Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <Card>
                        <CardContent className="p-6">
                            <p className="text-sm text-muted-foreground">Salary</p>
                            <p className="text-2xl font-bold">{formatPKR(employee.salary)}</p>
                            <Badge variant="outline" className="mt-2 capitalize">{employee.salary_type}</Badge>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <p className="text-sm text-muted-foreground">Type & Shift</p>
                            <p className="text-lg font-bold capitalize">{employee.employee_type}</p>
                            <Badge variant="secondary" className="mt-2 capitalize">{employee.shift} shift</Badge>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <p className="text-sm text-muted-foreground">Join Date</p>
                            <p className="text-lg font-bold">{format(new Date(employee?.join_date), 'dd/MM/yyyy')}</p>
                            <p className="text-xs text-muted-foreground">
                                {Math.floor((new Date().getTime() - new Date(employee?.join_date).getTime()) / (1000 * 60 * 60 * 24))} days
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <p className="text-sm text-muted-foreground">Status</p>
                            <Badge className={employee.is_active === 1 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                                {employee.is_active === 1 ? 'Active' : 'Inactive'}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-2">Payment: {employee.payment_method}</p>
                        </CardContent>
                    </Card>
                </div>

                <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 sm:grid-cols-3">
                        <TabsTrigger value="attendance">Attendance</TabsTrigger>
                        {
                            employee.employee_type === "salesman" && <TabsTrigger value="sales">Sales</TabsTrigger>
                        }

                        <TabsTrigger value="salary">Salary</TabsTrigger>
                    </TabsList>

                    {/* ATTENDANCE TAB */}
                    <TabsContent value="attendance">
                        <Card>
                            <CardHeader>
                                <CardTitle>Attendance Management</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {/* Mark Attendance */}
                                <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-4 mb-6 p-4 bg-muted/30 rounded-lg space-y-4 sm:space-y-0">
                                    <div className="flex-1">
                                        <label className="text-sm font-medium mb-2 block">Select Date</label>
                                        <Input
                                            type="date"
                                            value={attendanceDate}
                                            onChange={(e) => setAttendanceDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            onClick={() => handleMarkAttendance("present")}
                                            variant="default"
                                            disabled={markAttendanceMutation.isPending}
                                        >
                                            Present
                                        </Button>
                                        <Button
                                            onClick={() => handleMarkAttendance("absent")}
                                            variant="outline"
                                            disabled={markAttendanceMutation.isPending}
                                        >
                                            Absent
                                        </Button>
                                        <Button
                                            onClick={() => handleMarkAttendance("leave")}
                                            variant="outline"
                                            disabled={markAttendanceMutation.isPending}
                                        >
                                            Leave
                                        </Button>
                                    </div>
                                </div>

                                {/* Attendance History */}
                                <div className="space-y-2">
                                    {attendanceLoading ? (
                                        <div className="flex items-center justify-center py-8">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                            <span className="ml-2">Loading attendance...</span>
                                        </div>
                                    ) : attendance.length === 0 ? (
                                        <div className="text-center py-8">
                                            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                                            <p className="text-muted-foreground">No attendance records found</p>
                                        </div>
                                    ) : (
                                        attendance.map((record) => (
                                            <div
                                                key={record.id}
                                                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg"
                                            >
                                                <div>
                                                    <p className="font-medium">
                                                        {format(new Date(record.date), "dd/MM/yyyy")}
                                                    </p>
                                                    {record.checkIn && record.checkOut && (
                                                        <p className="text-sm text-muted-foreground">
                                                            {record.checkIn} - {record.checkOut}
                                                        </p>
                                                    )}
                                                </div>
                                                <Badge
                                                    className={
                                                        record.status === "present"
                                                            ? "bg-green-100 text-green-800"
                                                            : record.status === "absent"
                                                                ? "bg-red-100 text-red-800"
                                                                : "bg-yellow-100 text-yellow-800"
                                                    }
                                                >
                                                    {record.status.toUpperCase()}
                                                </Badge>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* SALES TAB */}
                    {
                        employee.employee_type === "salesman" && <TabsContent value="sales">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Sales History</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {/* 🔍 Filters */}
                                    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5 mb-6 p-4 bg-muted/40 rounded-lg">
                                        <div>
                                            <label className="text-sm font-medium mb-1 block">Payment Status</label>
                                            <Select
                                                value={filters.paymentStatus || "all"}
                                                onValueChange={(value) => handleFilterChange("paymentStatus", value === "all" ? "" : value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="All" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All</SelectItem>
                                                    <SelectItem value="completed">Completed</SelectItem>
                                                    <SelectItem value="pending">Pending</SelectItem>
                                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium mb-1 block">Min Total</label>
                                            <Input
                                                type="number"
                                                value={filters.minTotal}
                                                onChange={(e) => handleFilterChange("minTotal", e.target.value)}
                                                placeholder="e.g. 100"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium mb-1 block">Max Total</label>
                                            <Input
                                                type="number"
                                                value={filters.maxTotal}
                                                onChange={(e) => handleFilterChange("maxTotal", e.target.value)}
                                                placeholder="e.g. 1000"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium mb-1 block">Start Date</label>
                                            <Input
                                                type="date"
                                                value={filters.startDate}
                                                onChange={(e) => handleFilterChange("startDate", e.target.value)}
                                            />
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium mb-1 block">End Date</label>
                                            <Input
                                                type="date"
                                                value={filters.endDate}
                                                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                                            />
                                        </div>

                                        <div className="flex items-end space-x-2 col-span-full">
                                            <Button variant="outline" onClick={handleResetFilters}>Reset</Button>
                                        </div>
                                    </div>

                                    {/* 🧮 Summary Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                                        <Card className="bg-green-50">
                                            <CardContent className="p-4">
                                                <p className="text-sm text-muted-foreground">Completed Sales Total</p>
                                                <p className="text-2xl font-bold text-green-600">
                                                    $
                                                    {sales?.data
                                                        ?.filter((s) => s.paymentStatus === "completed")
                                                        ?.reduce((acc, s) => acc + parseFloat(s.total || 0), 0)
                                                        ?.toFixed(2) || "0.00"}
                                                </p>
                                            </CardContent>
                                        </Card>
                                        <Card className="bg-yellow-50">
                                            <CardContent className="p-4">
                                                <p className="text-sm text-muted-foreground">Pending Sales Total</p>
                                                <p className="text-2xl font-bold text-yellow-600">
                                                    $
                                                    {sales?.data
                                                        ?.filter((s) => s.paymentStatus === "pending")
                                                        ?.reduce((acc, s) => acc + parseFloat(s.total || 0), 0)
                                                        ?.toFixed(2) || "0.00"}
                                                </p>
                                            </CardContent>
                                        </Card>
                                        <Card className="bg-red-50">
                                            <CardContent className="p-4">
                                                <p className="text-sm text-muted-foreground">Cancelled Sales Total</p>
                                                <p className="text-2xl font-bold text-red-600">
                                                    $
                                                    {sales?.data
                                                        ?.filter((s) => s.paymentStatus === "cancelled")
                                                        ?.reduce((acc, s) => acc + parseFloat(s.total || 0), 0)
                                                        ?.toFixed(2) || "0.00"}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* 🧾 Sales List */}
                                    {salesLoading ? (
                                        <div className="flex items-center justify-center py-8">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                            <span className="ml-2">Loading sales...</span>
                                        </div>
                                    ) : sales?.data?.length === 0 ? (
                                        <div className="text-center py-8">
                                            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                                            <p className="text-muted-foreground">No sales records found</p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                                            {sales?.data?.map((sale) => (
                                                <div
                                                    key={sale.id}
                                                    onClick={() => handleSaleClick(sale.id)}
                                                    className="cursor-pointer p-4 border rounded-lg transition hover:bg-muted/50"
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <p className="font-medium">{format(new Date(sale.createdAt), "dd/MM/yyyy")}</p>
                                                        <span
                                                            className={`text-xs font-semibold px-2 py-1 rounded-full ${sale.paymentStatus === "completed"
                                                                ? "bg-green-100 text-green-700"
                                                                : sale.paymentStatus === "pending"
                                                                    ? "bg-yellow-100 text-yellow-700"
                                                                    : "bg-red-100 text-red-700"
                                                                }`}
                                                        >
                                                            {sale.paymentStatus.toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mb-2">
                                                        Customer: {sale.customerName || "N/A"}
                                                    </p>
                                                    <div className="flex justify-between text-sm">
                                                        <span>Subtotal: ${sale.subtotal}</span>
                                                        <span className="font-semibold">Total: ${sale.total}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    }

                    {/* SALARY TAB */}
                    <TabsContent value="salary">
                        <Card>
                            <CardHeader>
                                <CardTitle>Salary Management</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {/* Add Salary Record */}
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
                                    <div>
                                        <label className="text-sm font-medium mb-2 block">Month</label>
                                        <Input
                                            type="month"
                                            value={salaryDate}
                                            onChange={(e) => setSalaryDate(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-2 block">Basic Salary</label>
                                        <Input
                                            type="number"
                                            value={employee.salary}
                                            disabled
                                            className="bg-muted"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-2 block">Bonuses</label>
                                        <Input
                                            type="number"
                                            value={bonuses}
                                            onChange={(e) => setBonuses(e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-2 block">Deductions</label>
                                        <Input
                                            type="number"
                                            value={deductions}
                                            onChange={(e) => setDeductions(e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-2 block">Status</label>
                                        <Select
                                            value={salaryStatus}
                                            onValueChange={(value: "pending" | "paid" | "cancelled") =>
                                                setSalaryStatus(value)
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pending">Pending</SelectItem>
                                                <SelectItem value="paid">Paid</SelectItem>
                                                <SelectItem value="cancelled">Cancelled</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Calculate and Show Net Salary */}
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 p-4 bg-primary/10 rounded-lg space-y-4 sm:space-y-0">
                                    <div>
                                        <p className="text-sm text-muted-foreground">
                                            Net Salary Calculation
                                        </p>
                                        <p className="text-lg font-semibold">
                                            {formatPKR(parseFloat(employee.salary))} +{" "}
                                            {formatPKR(parseFloat(bonuses))} -{" "}
                                            {formatPKR(parseFloat(deductions))} =
                                            <span className="text-secondary ml-2">
                                                {formatPKR(netSalaryCalculation)}
                                            </span>
                                        </p>
                                    </div>
                                    <Button onClick={handleAddSalary} disabled={createSalaryMutation.isPending}>
                                        {createSalaryMutation.isPending ? "Adding..." : "Add Salary Record"}
                                    </Button>
                                </div>

                                {/* Salary Summary */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                    <Card>
                                        <CardContent className="p-4 text-center sm:text-left">
                                            <p className="text-sm text-muted-foreground">Total Paid</p>
                                            <p className="text-2xl font-bold text-green-600">{formatPKR(totalPaid)}</p>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-4 text-center sm:text-left">
                                            <p className="text-sm text-muted-foreground">Pending</p>
                                            <p className="text-2xl font-bold text-yellow-600">{formatPKR(totalPending)}</p>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-4 text-center sm:text-left">
                                            <p className="text-sm text-muted-foreground">Total Records</p>
                                            <p className="text-2xl font-bold">{salaries.length}</p>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Salary History */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Salary History</h3>
                                    {salariesLoading ? (
                                        <div className="flex items-center justify-center py-8">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                            <span className="ml-2">Loading salaries...</span>
                                        </div>
                                    ) : salaries.length === 0 ? (
                                        <div className="text-center py-8">
                                            <Banknote className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                                            <p className="text-muted-foreground">No salary records found</p>
                                        </div>
                                    ) : (
                                        salaries.map((salary) => (
                                            <div
                                                key={salary.id}
                                                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg"
                                            >
                                                <div className="flex-1 mb-3 sm:mb-0">
                                                    <p className="font-medium">
                                                        {format(
                                                            new Date(parseInt(salary?.year), parseInt(salary.month) - 1, 1),
                                                            "MMMM yyyy"
                                                        )}
                                                    </p>
                                                    <div className="text-sm text-muted-foreground space-y-1">
                                                        <p>Basic: {formatPKR(salary.basicSalary || 0)}</p>
                                                        <p>Bonuses: {formatPKR(salary.bonuses || 0)}</p>
                                                        <p>Deductions: {formatPKR(salary.deductions || 0)}</p>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <p className="text-lg font-bold text-secondary">
                                                        {formatPKR(salary.netSalary || 0)}
                                                    </p>
                                                    <Badge
                                                        className={
                                                            salary.status === "paid"
                                                                ? "bg-green-100 text-green-800"
                                                                : salary.status === "cancelled"
                                                                    ? "bg-red-100 text-red-800"
                                                                    : "bg-yellow-100 text-yellow-800"
                                                        }
                                                    >
                                                        {salary.status.toUpperCase()}
                                                    </Badge>
                                                    <div className="flex justify-end sm:justify-start space-x-2 mt-2">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleShareSalarySlip(salary)}
                                                        >
                                                            <Share className="h-4 w-4 mr-1" />
                                                            Share
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

            </main>
        </div>
    );
}