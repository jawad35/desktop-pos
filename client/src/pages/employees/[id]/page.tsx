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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Edit } from "lucide-react";
import { EditSalaryModal } from "../modals/EditSalaryModal";
import { EditAttendanceModal } from "../modals/EditAttendanceModal";
import { useNavigation } from "../../../App";
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

export default function EmployeeDetails({ employeeId }) {
    const [, setLocation] = useLocation();
    const [selectedTab, setSelectedTab] = useState("attendance");
    const [attendanceDate, setAttendanceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [salaryDate, setSalaryDate] = useState(format(new Date(), 'yyyy-MM'));
    const [bonuses, setBonuses] = useState("0");
    const [deductions, setDeductions] = useState("0");
    const [salaryStatus, setSalaryStatus] = useState<'pending' | 'paid' | 'cancelled'>('pending');
    const { toast } = useToast();


    // Add these new state variables
    const [attendanceFilterMonth, setAttendanceFilterMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [salaryFilterMonth, setSalaryFilterMonth] = useState(format(new Date(), 'yyyy-MM'));

    // Add these with your other state variables
    const [isSalaryEditModalOpen, setIsSalaryEditModalOpen] = useState(false);
    const [isAttendanceEditModalOpen, setIsAttendanceEditModalOpen] = useState(false);
    const [editingSalary, setEditingSalary] = useState<Salary | null>(null);
    const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(null);
    const [tempAttendanceStatus, setTempAttendanceStatus] = useState<'present' | 'absent' | 'leave'>('present');

    // Add pagination for salary history
    const [salaryPage, setSalaryPage] = useState(1);
    const salaryPageSize = 10;

    // Calculate days in month function
    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month, 0).getDate();
    };

    // Calculate attendance summary for current month
    const calculateAttendanceSummary = (attendanceList: Attendance[], year: number, month: number) => {
        const filtered = attendanceList.filter(a => {
            const date = new Date(a.date);
            return date.getFullYear() === year && date.getMonth() === month;
        });

        const present = filtered.filter(a => a.status === 'present').length;
        const absent = filtered.filter(a => a.status === 'absent').length;
        const leave = filtered.filter(a => a.status === 'leave').length;

        return { present, absent, leave, total: filtered.length };
    };

    // Calculate total days from start to end of job
    const calculateTotalDays = (joinDate: string, leaveDate?: string) => {
        const start = new Date(joinDate);
        const end = leaveDate ? new Date(leaveDate) : new Date();
        const diffTime = Math.abs(end.getTime() - start.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    // Calculate deduction for absents
    const calculateAbsentDeduction = (absentCount: number, monthlySalary: number, year: number, month: number) => {
        const daysInMonth = getDaysInMonth(year, month);
        const dailyRate = monthlySalary / daysInMonth;
        return absentCount * dailyRate;
    };
    const { navigateTo } = useNavigation();
    const handleBack = () => {
        navigateTo("/employees");
    };

    // Handle click redirect
    const handleSaleClick = (saleId: string) => {
        setLocation(`/item-details/${saleId}/sales`);
    };

    const { data: employee, isLoading, refetch: refetchEmployee } = useQuery<Employee>({
        queryKey: ["employee", employeeId],
        queryFn: async () => {
            const result = await api.getEmployee(employeeId);
            console.log('Employee API result:', result);
            if (result?.success && result.data) return result.data;
            if (result?.id) return result;
            return result;
        },
        enabled: !!employeeId,
        refetchOnWindowFocus: true, // Add this line
        staleTime: 0, // Always fetch fresh data
    });

    // Update the attendance query to get all data for calculations
    const { data: attendance = [], isLoading: attendanceLoading } = useQuery<Attendance[]>({
        queryKey: ["attendance", employeeId],
        queryFn: async () => {
            // Get all attendance for this employee (no month/year filter initially)
            const promises = [];
            // Get last 12 months of data for summary
            for (let i = 0; i < 12; i++) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const year = date.getFullYear().toString();
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                promises.push(api.getAttendance(employeeId, month, year));
            }
            const results = await Promise.all(promises);
            let allAttendance: Attendance[] = [];
            results.forEach(result => {
                if (Array.isArray(result)) allAttendance.push(...result);
                else if (result?.success && Array.isArray(result.data)) allAttendance.push(...result.data);
            });
            return allAttendance;
        },
        enabled: !!employeeId,
    });

    const { data: salaries = [], isLoading: salariesLoading } = useQuery<Salary[]>({
        queryKey: ["salaries", employeeId],
        queryFn: async () => {
            const result = await api.getSalaries(employeeId, undefined, undefined);
            console.log('Salaries API result:', result);

            let salariesData = [];
            if (Array.isArray(result)) {
                salariesData = result;
            } else if (result?.success && Array.isArray(result.data)) {
                salariesData = result.data;
            }

            // Map snake_case to camelCase
            return salariesData.map((salary: any) => ({
                id: salary.id,
                employeeId: salary.employee_id,
                month: salary.month,
                year: salary.year,
                basicSalary: salary.basic_salary,
                deductions: salary.deductions,
                bonuses: salary.bonuses,
                netSalary: salary.net_salary,
                status: salary.status,
                paymentDate: salary.payment_date,
                payment_method: salary.payment_method,
                notes: salary.notes,
            }));
        },
        enabled: !!employeeId,
    });
    console.log(employeeId, 'hea8888')
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
            const [year, month] = salaryData.month.split('-');

            // First, check if a salary record already exists for this month/year
            const existingSalaries = await api.getSalaries(employeeId, month, year.toString());
            let existingSalary = null;

            if (Array.isArray(existingSalaries) && existingSalaries.length > 0) {
                existingSalary = existingSalaries[0];
            } else if (existingSalaries?.success && Array.isArray(existingSalaries.data) && existingSalaries.data.length > 0) {
                existingSalary = existingSalaries.data[0];
            }

            const data = {
                employeeId: employeeId,
                month: month,  // Send just the month number
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

            // If exists, update it
            if (existingSalary) {
                console.log('Updating existing salary record:', existingSalary.id);
                // You'll need an updateSalary API endpoint
                const result = await api.updateSalary(existingSalary.id, data);
                return { ...result, isUpdate: true };
            } else {
                // Create new
                console.log('Creating new salary record');
                const result = await api.createSalary(data);
                return { ...result, isUpdate: false };
            }
        },
        onSuccess: (result, variables) => {
            toast({
                title: "Success",
                description: result?.isUpdate ? "Salary record updated successfully" : "Salary record added successfully"
            });
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

        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"];

        const monthNumber = parseInt(salary.month);
        const monthName = monthNames[monthNumber - 1];
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
            if (!employee?.id) return { data: [] };
            const result = await api.getSales();
            let salesData = [];
            if (Array.isArray(result)) salesData = result;
            else if (result?.success && Array.isArray(result.data)) salesData = result.data;

            console.log('All sales before filtering:', salesData.length);
            console.log('Sample sale:', salesData[0]);

            // Filter by employeeId (handle both field names) - DON'T filter by status here
            salesData = salesData.filter((s: any) =>
                s.employee_id === employee.id || s.employeeId === employee.id
            );

            console.log('Sales after employee filter:', salesData.length);

            // Apply user filters (paymentStatus, minTotal, maxTotal, dates)
            if (filters.paymentStatus) {
                salesData = salesData.filter((s: any) =>
                    (s.payment_status || s.paymentStatus) === filters.paymentStatus
                );
            }
            if (filters.minTotal) {
                salesData = salesData.filter((s: any) =>
                    parseFloat(s.total || 0) >= parseFloat(filters.minTotal)
                );
            }
            if (filters.maxTotal) {
                salesData = salesData.filter((s: any) =>
                    parseFloat(s.total || 0) <= parseFloat(filters.maxTotal)
                );
            }
            if (filters.startDate) {
                salesData = salesData.filter((s: any) =>
                    new Date(s.created_at || s.createdAt) >= new Date(filters.startDate)
                );
            }
            if (filters.endDate) {
                salesData = salesData.filter((s: any) =>
                    new Date(s.created_at || s.createdAt) <= new Date(filters.endDate)
                );
            }

            // Normalize the data structure - keep all sales including cancelled/returned
            return {
                data: salesData.map((s: any) => ({
                    id: s.id,
                    receipt_number: s.receipt_number,
                    created_at: s.created_at || s.createdAt,
                    subtotal: s.subtotal || 0,
                    total: s.total || 0,
                    total_profit: s.total_profit || s.profit || 0,
                    payment_status: s.payment_status || s.paymentStatus || 'unknown',
                    customer_name: s.customer_name || s.customerName,
                    employee_id: s.employee_id || s.employeeId,
                    return_status: s.return_status || 'none',
                    total_returned_amount: s.total_returned_amount || 0,
                }))
            };
        },
        enabled: !!employee?.id && employee?.employee_type === 'salesman',
    });


    // Calculate totals for summary
    // Calculate totals for summary
    // Calculate totals for summary
    const totalPaid = salaries
        .filter(s => s.status === 'paid')
        .reduce((sum, s) => sum + (s.netSalary || 0), 0);

    const totalPending = salaries
        .filter(s => s.status === 'pending')
        .reduce((sum, s) => sum + (s.netSalary || 0), 0);
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

    const handleUpdateSalary = async () => {
        if (!editingSalary) return;

        try {
            const result = await api.updateSalary(editingSalary.id, {
                basicSalary: editingSalary.basicSalary,
                bonuses: editingSalary.bonuses,
                deductions: editingSalary.deductions,
                netSalary: editingSalary.netSalary,
                status: editingSalary.status,
                payment_method: editingSalary.payment_method,
                notes: editingSalary.notes,
            });

            if (result.success) {
                toast({ title: "Success", description: "Salary record updated successfully" });
                queryClient.invalidateQueries({ queryKey: ["salaries", employeeId] });
                setIsSalaryEditModalOpen(false);
                setEditingSalary(null);
            }
        } catch (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const handleUpdateAttendance = async () => {
        if (!editingAttendance) return;

        try {
            console.log('Updating attendance with data:', {
                employeeId: editingAttendance.employeeId,
                date: editingAttendance.date,
                status: tempAttendanceStatus,
                checkIn: editingAttendance.checkIn,
                checkOut: editingAttendance.checkOut,
                notes: editingAttendance.notes,
            });

            const result = await api.markAttendance({
                employeeId: editingAttendance.employeeId,
                date: editingAttendance.date,
                status: tempAttendanceStatus,
                checkIn: editingAttendance.checkIn,
                checkOut: editingAttendance.checkOut,
                notes: editingAttendance.notes,
                userId: 'system',
                shopId: 'default'
            });

            console.log('Mark attendance result:', result);

            // Check if result is successful
            // The API returns { success: true, data: {...} } or just { success: false, error: ... }
            if (result && result.success === true) {
                toast({ title: "Success", description: "Attendance updated successfully" });
                queryClient.invalidateQueries({ queryKey: ["attendance", employeeId] });
                setIsAttendanceEditModalOpen(false);
                setEditingAttendance(null);
            } else {
                // If result is false or has error
                throw new Error(result?.error || "Update failed");
            }
        } catch (error: any) {
            console.error('Update attendance error:', error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

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
                                {/* Employee Stats Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <Card className="bg-blue-50">
                                        <CardContent className="p-4">
                                            <p className="text-sm text-muted-foreground">Total Days Employed</p>
                                            <p className="text-2xl font-bold text-blue-600">
                                                {calculateTotalDays(employee.join_date, employee.leave_date)} days
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Since {format(new Date(employee.join_date), 'dd/MM/yyyy')}
                                            </p>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-green-50">
                                        <CardContent className="p-4">
                                            <p className="text-sm text-muted-foreground">Current Month Present</p>
                                            <p className="text-2xl font-bold text-green-600">
                                                {(() => {
                                                    const now = new Date();
                                                    const summary = calculateAttendanceSummary(attendance, now.getFullYear(), now.getMonth());
                                                    return `${summary.present} / ${summary.total}`;
                                                })()}
                                            </p>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-red-50">
                                        <CardContent className="p-4">
                                            <p className="text-sm text-muted-foreground">Current Month Absents</p>
                                            <p className="text-2xl font-bold text-red-600">
                                                {(() => {
                                                    const now = new Date();
                                                    const summary = calculateAttendanceSummary(attendance, now.getFullYear(), now.getMonth());
                                                    return summary.absent;
                                                })()}
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>

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
                                        <Button onClick={() => handleMarkAttendance("present")} variant="default">
                                            Present
                                        </Button>
                                        <Button onClick={() => handleMarkAttendance("absent")} variant="outline">
                                            Absent
                                        </Button>
                                        <Button onClick={() => handleMarkAttendance("leave")} variant="outline">
                                            Leave
                                        </Button>
                                    </div>
                                </div>

                                {/* Attendance Filter by Month */}
                                <div className="flex flex-wrap gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
                                    <div>
                                        <label className="text-sm font-medium mb-2 block">View Month</label>
                                        <Input
                                            type="month"
                                            value={attendanceFilterMonth}
                                            onChange={(e) => setAttendanceFilterMonth(e.target.value)}
                                            className="w-48"
                                        />
                                    </div>
                                </div>

                                {/* Attendance History */}
                                <div className="space-y-2">
                                    {attendanceLoading ? (
                                        <div className="flex items-center justify-center py-8">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                        </div>
                                    ) : (() => {
                                        const [year, month] = attendanceFilterMonth.split('-');
                                        const filteredAttendance = attendance.filter(record => {
                                            const date = new Date(record.date);
                                            return date.getFullYear() === parseInt(year) &&
                                                date.getMonth() === parseInt(month) - 1;
                                        });
                                        const summary = calculateAttendanceSummary(attendance, parseInt(year), parseInt(month) - 1);
                                        const daysInMonth = getDaysInMonth(parseInt(year), parseInt(month) - 1);
                                        const deduction = calculateAbsentDeduction(summary.absent, employee.salary, parseInt(year), parseInt(month) - 1);

                                        return (
                                            <>
                                                <div className="bg-muted/50 p-4 rounded-lg mb-4">
                                                    <h3 className="font-semibold mb-2">Month Summary: {format(new Date(parseInt(year), parseInt(month) - 1), 'MMMM yyyy')}</h3>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                        <div>📅 Total Days: {daysInMonth}</div>
                                                        <div>✅ Present: {summary.present}</div>
                                                        <div>❌ Absent: {summary.absent}</div>
                                                        <div>🌴 Leave: {summary.leave}</div>
                                                    </div>
                                                    {summary.absent > 0 && (
                                                        <div className="mt-2 text-red-600">
                                                            Deduction for absents: {formatPKR(deduction)}
                                                        </div>
                                                    )}
                                                </div>

                                                {filteredAttendance.length === 0 ? (
                                                    <div className="text-center py-8">
                                                        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                                                        <p className="text-muted-foreground">No attendance records found for this month</p>
                                                    </div>
                                                ) : (
                                                    filteredAttendance.map((record) => (
                                                        <div key={record.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg">
                                                            <div>
                                                                <p className="font-medium">{format(new Date(record.date), "dd/MM/yyyy")}</p>
                                                                {record.checkIn && record.checkOut && (
                                                                    <p className="text-sm text-muted-foreground">{record.checkIn} - {record.checkOut}</p>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-3 mt-2 sm:mt-0">
                                                                <Badge className={
                                                                    record.status === "present" ? "bg-green-100 text-green-800" :
                                                                        record.status === "absent" ? "bg-red-100 text-red-800" :
                                                                            "bg-yellow-100 text-yellow-800"
                                                                }>
                                                                    {record.status.toUpperCase()}
                                                                </Badge>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => {
                                                                        const mappedRecord = {
                                                                            id: record.id,
                                                                            employeeId: record.employeeId || record.employee_id, // Try both formats
                                                                            date: record.date,
                                                                            status: record.status,
                                                                            notes: record.notes,
                                                                        };
                                                                        setEditingAttendance(mappedRecord);
                                                                        setTempAttendanceStatus(record.status);
                                                                        setIsAttendanceEditModalOpen(true);
                                                                    }}
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* SALES TAB */}
                    {/* SALES TAB */}
                    {employee.employee_type === "salesman" && (
                        <TabsContent value="sales">
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

                                    {/* 🧮 Summary Cards - Fixed */}
                                    {/* 🧮 Summary Cards - Shows all sales including cancelled/returned */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                        <Card className="bg-blue-50">
                                            <CardContent className="p-4">
                                                <p className="text-sm text-muted-foreground">Total Sales (All)</p>
                                                <p className="text-2xl font-bold text-blue-600">
                                                    {formatPKR(
                                                        sales?.data?.reduce((acc, s) => acc + parseFloat(s.total || 0), 0) || 0
                                                    )}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {sales?.data?.length || 0} total transactions
                                                </p>
                                            </CardContent>
                                        </Card>

                                        <Card className="bg-green-50">
                                            <CardContent className="p-4">
                                                <p className="text-sm text-muted-foreground">Completed Sales</p>
                                                <p className="text-2xl font-bold text-green-600">
                                                    {formatPKR(
                                                        sales?.data
                                                            ?.filter((s) => (s.payment_status === "completed"))
                                                            ?.reduce((acc, s) => acc + parseFloat(s.total || 0), 0) || 0
                                                    )}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {sales?.data?.filter((s) => s.payment_status === "completed").length || 0} transactions
                                                </p>
                                            </CardContent>
                                        </Card>

                                        <Card className="bg-yellow-50">
                                            <CardContent className="p-4">
                                                <p className="text-sm text-muted-foreground">Pending Sales</p>
                                                <p className="text-2xl font-bold text-yellow-600">
                                                    {formatPKR(
                                                        sales?.data
                                                            ?.filter((s) => s.payment_status === "pending")
                                                            ?.reduce((acc, s) => acc + parseFloat(s.total || 0), 0) || 0
                                                    )}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {sales?.data?.filter((s) => s.payment_status === "pending").length || 0} transactions
                                                </p>
                                            </CardContent>
                                        </Card>

                                        <Card className="bg-red-50">
                                            <CardContent className="p-4">
                                                <p className="text-sm text-muted-foreground">Cancelled/Returned</p>
                                                <p className="text-2xl font-bold text-red-600">
                                                    {formatPKR(
                                                        sales?.data
                                                            ?.filter((s) => s.payment_status === "cancelled" || s.return_status !== 'none')
                                                            ?.reduce((acc, s) => acc + parseFloat(s.total || 0), 0) || 0
                                                    )}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {sales?.data?.filter((s) => s.payment_status === "cancelled" || s.return_status !== 'none').length || 0} transactions
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
                                            {sales?.data?.map((sale) => {
                                                // Safe date formatting
                                                let formattedDate = "Date not available";
                                                try {
                                                    const dateValue = sale.created_at;
                                                    if (dateValue) {
                                                        const date = new Date(dateValue);
                                                        if (!isNaN(date.getTime())) {
                                                            formattedDate = format(date, "dd/MM/yyyy");
                                                        }
                                                    }
                                                } catch (error) {
                                                    console.error("Date formatting error for sale:", sale.id, error);
                                                }

                                                const paymentStatus = sale.payment_status || "unknown";
                                                const customerName = sale.customer_name || "N/A";
                                                const profit = sale.total_profit || 0;
                                                const isReturned = sale.return_status !== 'none';
                                                const isPartiallyReturned = sale.return_status === 'partial';

                                                return (
                                                    <div
                                                        key={sale.id}
                                                        onClick={() => handleSaleClick(sale.id)}
                                                        className={`cursor-pointer p-4 border rounded-lg transition hover:bg-muted/50 ${isReturned ? 'bg-red-50/30 border-red-200' : ''
                                                            }`}
                                                    >
                                                        <div className="flex items-center justify-between mb-2">
                                                            <p className="font-medium">{formattedDate}</p>
                                                            <div className="flex gap-2">
                                                                {isReturned && (
                                                                    <Badge className={isPartiallyReturned ? "bg-yellow-500 text-white" : "bg-red-500 text-white"}>
                                                                        {isPartiallyReturned ? "Partial Return" : "Full Return"}
                                                                    </Badge>
                                                                )}
                                                                <span
                                                                    className={`text-xs font-semibold px-2 py-1 rounded-full ${paymentStatus === "completed"
                                                                        ? "bg-green-100 text-green-700"
                                                                        : paymentStatus === "pending"
                                                                            ? "bg-yellow-100 text-yellow-700"
                                                                            : "bg-red-100 text-red-700"
                                                                        }`}
                                                                >
                                                                    {paymentStatus.toUpperCase()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground mb-2">
                                                            Customer: {customerName}
                                                        </p>
                                                        <div className="flex justify-between text-sm mb-1">
                                                            <span>Subtotal: {formatPKR(sale.subtotal || 0)}</span>
                                                            <span className="font-semibold">Total: {formatPKR(sale.total || 0)}</span>
                                                        </div>
                                                        <div className="flex justify-between text-xs">
                                                            <span className="text-muted-foreground">Receipt: {sale.receipt_number || "N/A"}</span>
                                                            <span className={`font-medium ${profit >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                                                                Profit: {formatPKR(profit)}
                                                            </span>
                                                        </div>
                                                        {sale.total_returned_amount > 0 && (
                                                            <div className="mt-2 text-xs text-red-600">
                                                                Returned Amount: {formatPKR(sale.total_returned_amount)}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    )}

                    {/* SALARY TAB */}
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
                                        <Input type="number" value={employee.salary} disabled className="bg-muted" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-2 block">Bonuses</label>
                                        <Input type="number" value={bonuses} onChange={(e) => setBonuses(e.target.value)} placeholder="0" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-2 block">Deductions</label>
                                        <Input type="number" value={deductions} onChange={(e) => setDeductions(e.target.value)} placeholder="0" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-2 block">Status</label>
                                        <Select value={salaryStatus} onValueChange={(value: any) => setSalaryStatus(value)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pending">Pending</SelectItem>
                                                <SelectItem value="paid">Paid</SelectItem>
                                                <SelectItem value="cancelled">Cancelled</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Calculate Net Salary */}
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 p-4 bg-primary/10 rounded-lg">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Net Salary Calculation</p>
                                        <p className="text-lg font-semibold">
                                            {formatPKR(employee.salary)} + {formatPKR(parseFloat(bonuses))} - {formatPKR(parseFloat(deductions))} =
                                            <span className="text-secondary ml-2">{formatPKR(netSalaryCalculation)}</span>
                                        </p>
                                    </div>
                                    <Button onClick={handleAddSalary} disabled={createSalaryMutation.isPending} className="mt-2 sm:mt-0">
                                        {createSalaryMutation.isPending ? "Adding..." : "Add Salary Record"}
                                    </Button>
                                </div>

                                {/* Salary Summary */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                    <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Paid</p><p className="text-2xl font-bold text-green-600">{formatPKR(totalPaid)}</p></CardContent></Card>
                                    <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold text-yellow-600">{formatPKR(totalPending)}</p></CardContent></Card>
                                    <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Records</p><p className="text-2xl font-bold">{salaries.length}</p></CardContent></Card>
                                </div>

                                {/* Filter by Month/Year */}
                                <div className="flex flex-wrap gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
                                    <div>
                                        <label className="text-sm font-medium mb-2 block">Filter by Month</label>
                                        <Input type="month" value={salaryFilterMonth} onChange={(e) => setSalaryFilterMonth(e.target.value)} className="w-48" />
                                    </div>
                                </div>

                                {/* Salary History with Pagination */}
                                {/* Salary History with Pagination */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Salary History</h3>
                                    {salariesLoading ? (
                                        <div className="flex items-center justify-center py-8">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                        </div>
                                    ) : (() => {
                                        // Filter salaries by selected month (salaryFilterMonth is "YYYY-MM")
                                        // In the salary tab, update the filteredSalaries logic:

                                        let filteredSalaries = salaries;
                                        if (salaryFilterMonth) {
                                            // salaryFilterMonth is in "YYYY-MM" format (e.g., "2026-04")
                                            // Compare with salary.month which is also "YYYY-MM" format
                                            filteredSalaries = salaries.filter(s => s.month === salaryFilterMonth);
                                        }

                                        // Sort by year and month descending (newest first)
                                        filteredSalaries = [...filteredSalaries].sort((a, b) => {
                                            if (a.year !== b.year) return b.year - a.year;
                                            return parseInt(b.month) - parseInt(a.month);
                                        });

                                        const totalFiltered = filteredSalaries.length;
                                        const totalFilteredPages = Math.ceil(totalFiltered / salaryPageSize);
                                        const paginatedSalaries = filteredSalaries.slice(
                                            (salaryPage - 1) * salaryPageSize,
                                            salaryPage * salaryPageSize
                                        );

                                        return (
                                            <>
                                                {filteredSalaries.length === 0 ? (
                                                    <div className="text-center py-8">
                                                        <Banknote className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                                                        <p className="text-muted-foreground">No salary records found for {salaryFilterMonth}</p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {salaries.map((salary) => (
                                                            <div key={salary.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg">
                                                                <div className="flex-1 mb-3 sm:mb-0">
                                                                    <p className="font-medium">
                                                                        {format(new Date(salary.year, parseInt(salary.month) - 1, 1), "MMMM yyyy")}
                                                                    </p>
                                                                    <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground mt-1">
                                                                        <span>Basic: {formatPKR(salary.basicSalary || 0)}</span>
                                                                        <span>Bonus: {formatPKR(salary.bonuses || 0)}</span>
                                                                        <span>Deduction: {formatPKR(salary.deductions || 0)}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-lg font-bold text-secondary">{formatPKR(salary.netSalary || 0)}</p>
                                                                    <Badge className={
                                                                        salary.status === "paid" ? "bg-green-100 text-green-800" :
                                                                            salary.status === "cancelled" ? "bg-red-100 text-red-800" :
                                                                                "bg-yellow-100 text-yellow-800"
                                                                    }>
                                                                        {salary.status.toUpperCase()}
                                                                    </Badge>
                                                                    <div className="flex justify-end space-x-2 mt-2">
                                                                        <Button
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            onClick={() => {
                                                                                setEditingSalary(salary);
                                                                                setIsSalaryEditModalOpen(true);
                                                                            }}
                                                                        >
                                                                            <Edit className="h-4 w-4 mr-1" />Edit
                                                                        </Button>
                                                                        <Button size="sm" variant="ghost" onClick={() => handleShareSalarySlip(salary)}>
                                                                            <Share className="h-4 w-4 mr-1" />Share
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}

                                                        {/* Pagination Controls */}
                                                        {totalFilteredPages > 1 && (
                                                            <div className="flex items-center justify-between mt-4">
                                                                <div className="text-sm text-muted-foreground">
                                                                    Showing {((salaryPage - 1) * salaryPageSize) + 1} to {Math.min(salaryPage * salaryPageSize, totalFiltered)} of {totalFiltered} records
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => setSalaryPage(p => Math.max(1, p - 1))}
                                                                        disabled={salaryPage === 1}
                                                                    >
                                                                        Previous
                                                                    </Button>
                                                                    <span className="flex items-center px-4 text-sm">
                                                                        Page {salaryPage} of {totalFilteredPages}
                                                                    </span>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => setSalaryPage(p => Math.min(totalFilteredPages, p + 1))}
                                                                        disabled={salaryPage === totalFilteredPages}
                                                                    >
                                                                        Next
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

            </main>
            <EditSalaryModal
                isOpen={isSalaryEditModalOpen}
                onClose={() => setIsSalaryEditModalOpen(false)}
                editingSalary={editingSalary}
                setEditingSalary={setEditingSalary}
                onSave={handleUpdateSalary}
            />

            <EditAttendanceModal
                isOpen={isAttendanceEditModalOpen}
                onClose={() => setIsAttendanceEditModalOpen(false)}
                editingAttendance={editingAttendance}
                setEditingAttendance={setEditingAttendance}
                tempAttendanceStatus={tempAttendanceStatus}
                setTempAttendanceStatus={setTempAttendanceStatus}
                onSave={handleUpdateAttendance}
            />
        </div>
    );
}