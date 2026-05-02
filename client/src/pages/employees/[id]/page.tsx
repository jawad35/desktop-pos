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
import { Calendar, Banknote, Share, Download, ArrowLeft, Users, Wallet, Clock } from "lucide-react";
import { useHeader } from "@/contexts/HeaderContext";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { api } from "../../../services/electron-api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Edit } from "lucide-react";
import { EditSalaryModal } from "../modals/EditSalaryModal";
import { EditAttendanceModal } from "../modals/EditAttendanceModal";
import { useNavigation } from "../../../App";
import EmployeePaymentManager from "../../../components/Employee/EmployeePaymentManager";

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
    payment_type?: string;
    daily_rate?: number;
    weekly_rate?: number;
    hourly_rate?: number;
    contract_amount?: number;
    contract_start_date?: string;
    contract_end_date?: string;
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

interface EmployeePayment {
    id: string;
    employee_id: string;
    payment_date: string;
    amount: number;
    payment_type: string;
    period_start?: string;
    period_end?: string;
    description?: string;
    status: string;
    payment_method: string;
}

export default function EmployeeDetails({ employeeId }) {
    const [, setLocation] = useLocation();
    const [selectedTab, setSelectedTab] = useState("attendance");
    const [attendanceDate, setAttendanceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [showPaymentManager, setShowPaymentManager] = useState(false);

    const [attendanceFilterMonth, setAttendanceFilterMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [salaryFilterMonth, setSalaryFilterMonth] = useState(format(new Date(), 'yyyy-MM'));

    const [isAttendanceEditModalOpen, setIsAttendanceEditModalOpen] = useState(false);
    const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(null);
    const [tempAttendanceStatus, setTempAttendanceStatus] = useState<'present' | 'absent' | 'leave'>('present');

    const [paymentHistoryPage, setPaymentHistoryPage] = useState(1);
    const [paymentHistoryPageSize] = useState(10);

    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month, 0).getDate();
    };
    const { toast } = useToast();

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

    const calculateTotalDays = (joinDate: string, leaveDate?: string) => {
        const start = new Date(joinDate);
        const end = leaveDate ? new Date(leaveDate) : new Date();
        const diffTime = Math.abs(end.getTime() - start.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const calculateAbsentDeduction = (absentCount: number, monthlySalary: number, year: number, month: number) => {
        const daysInMonth = getDaysInMonth(year, month);
        const dailyRate = monthlySalary / daysInMonth;
        return absentCount * dailyRate;
    };

    const { navigateTo } = useNavigation();
    const handleBack = () => navigateTo("/employees");
    const handleSaleClick = (saleId: string) => setLocation(`/item-details/${saleId}/sales`);

    // Fetch Employee
    const { data: employee, isLoading, refetch: refetchEmployee } = useQuery<Employee>({
        queryKey: ["employee", employeeId],
        queryFn: async () => {
            const result = await api.getEmployee(employeeId);
            return result?.id ? result : null;
        },
        enabled: !!employeeId,
    });

    // Fetch Attendance
    const { data: attendance = [], isLoading: attendanceLoading } = useQuery<Attendance[]>({
        queryKey: ["attendance", employeeId],
        queryFn: async () => {
            const promises = [];
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

    // Fetch Salaries (Monthly)
    const { data: salaries = [], isLoading: salariesLoading, refetch: refetchSalaries } = useQuery<Salary[]>({
        queryKey: ["salaries", employeeId],
        queryFn: async () => {
            const result = await api.getSalaries(employeeId, undefined, undefined);
            let salariesData = [];
            if (Array.isArray(result)) salariesData = result;
            else if (result?.success && Array.isArray(result.data)) salariesData = result.data;
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

    // Fetch Employee Payments (Wages, Extra Work, Advances Repayment)
    const { data: employeePayments = [], refetch: refetchEmployeePayments } = useQuery<EmployeePayment[]>({
        queryKey: ["employeePayments", employeeId],
        queryFn: async () => {
            const result = await api.getEmployeePayments(employeeId);
            return Array.isArray(result) ? result : [];
        },
        enabled: !!employeeId,
    });

    // Fetch Advances
    const { data: advances = [], refetch: refetchAdvances } = useQuery({
        queryKey: ["employeeAdvances", employeeId],
        queryFn: async () => {
            const result = await api.getEmployeeAdvances(employeeId);
            return Array.isArray(result) ? result : [];
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
            return await api.markAttendance(attendanceData);
        },
        onSuccess: () => {
            toast({ title: "Success", description: "Attendance marked successfully" });
            queryClient.invalidateQueries({ queryKey: ["attendance", employeeId] });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const handleMarkAttendance = (status: 'present' | 'absent' | 'leave') => {
        markAttendanceMutation.mutate({ date: attendanceDate, status });
    };

    // Sales Filters
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

            salesData = salesData.filter((s: any) => s.employee_id === employee.id || s.employeeId === employee.id);

            if (filters.paymentStatus) {
                salesData = salesData.filter((s: any) => (s.payment_status || s.paymentStatus) === filters.paymentStatus);
            }
            if (filters.minTotal) {
                salesData = salesData.filter((s: any) => parseFloat(s.total || 0) >= parseFloat(filters.minTotal));
            }
            if (filters.maxTotal) {
                salesData = salesData.filter((s: any) => parseFloat(s.total || 0) <= parseFloat(filters.maxTotal));
            }
            if (filters.startDate) {
                salesData = salesData.filter((s: any) => new Date(s.created_at || s.createdAt) >= new Date(filters.startDate));
            }
            if (filters.endDate) {
                salesData = salesData.filter((s: any) => new Date(s.created_at || s.createdAt) <= new Date(filters.endDate));
            }

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
                    return_status: s.return_status || 'none',
                    total_returned_amount: s.total_returned_amount || 0,
                }))
            };
        },
        enabled: !!employee?.id && employee?.employee_type === 'salesman',
    });

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleResetFilters = () => {
        setFilters({ paymentStatus: "", startDate: "", endDate: "", minTotal: "", maxTotal: "" });
    };

    // Calculate totals
    const totalSalariesPaid = salaries.filter(s => s.status === 'paid').reduce((sum, s) => sum + (s.netSalary || 0), 0);
    const totalWagesPaid = employeePayments.filter(p => p.payment_type !== 'advance_repayment').reduce((sum, p) => sum + p.amount, 0);
    const totalEmployeeCost = totalSalariesPaid + totalWagesPaid;
    const totalOutstandingAdvances = advances.filter(a => a.status !== 'completed').reduce((sum, a) => sum + a.remaining_amount, 0);

    const { setTitle, setSubtitle } = useHeader();

    useEffect(() => {
        if (employee) {
            setTitle(employee.name);
            setSubtitle("Employee Details");
        }
    }, [employee]);

    if (isLoading) {
        return (<div className="flex-1 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div><span className="ml-2">Loading employee...</span></div>);
    }

    if (!employee) {
        return (<div className="flex-1 flex items-center justify-center"><p>Employee not found</p></div>);
    }

    const handleUpdateAttendance = async () => {
        if (!editingAttendance) return;
        try {
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
            if (result && result.success === true) {
                toast({ title: "Success", description: "Attendance updated" });
                queryClient.invalidateQueries({ queryKey: ["attendance", employeeId] });
                setIsAttendanceEditModalOpen(false);
                setEditingAttendance(null);
            } else {
                throw new Error(result?.error || "Update failed");
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };
    const formatDateSafe = (dateValue: string | null | undefined, formatStr: string = 'dd/MM/yyyy') => {
        if (!dateValue) return 'Not set';
        try {
            const date = new Date(dateValue);
            if (isNaN(date.getTime())) return 'Invalid date';
            return format(date, formatStr);
        } catch (error) {
            return 'Invalid date';
        }
    };

    const allPayments = [
        ...salaries.map(s => ({
            id: s.id,
            date: s.paymentDate && !isNaN(new Date(s.paymentDate).getTime()) ? s.paymentDate : `${s.year}-${s.month}-01`,
            amount: s.netSalary,
            type: 'salary',
            description: `Monthly salary for ${s.month}/${s.year}`,
            status: s.status,
            payment_method: s.payment_method,
            notes: s.notes
        })),
        ...employeePayments.map(p => ({
            id: p.id,
            date: p.payment_date && !isNaN(new Date(p.payment_date).getTime()) ? p.payment_date : new Date().toISOString(),
            amount: p.amount,
            type: p.payment_type,
            description: p.description || 'Payment',
            status: p.status,
            payment_method: p.payment_method,
            notes: p.description
        }))
    ].filter(p => p.date)
        .sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
            return dateB.getTime() - dateA.getTime();
        });

    const paginatedPayments = allPayments.slice((paymentHistoryPage - 1) * paymentHistoryPageSize, paymentHistoryPage * paymentHistoryPageSize);
    const totalPaymentPages = Math.ceil(allPayments.length / paymentHistoryPageSize);

    const isMonthlyEmployee = employee.payment_type === 'fixed' || (!employee.payment_type && employee.salary_type === 'monthly');

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <main className="flex-1 overflow-auto p-6">
                <div className="mb-6">
                    <Button variant="outline" onClick={handleBack}><ArrowLeft className="h-4 w-4 mr-2" />Back to Employees</Button>
                </div>

                {/* Employee Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4 mb-6">
                    <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Quick Actions</p><Button variant="outline" size="sm" className="mt-2" onClick={() => setShowPaymentManager(true)}><Banknote className="h-4 w-4 mr-2" />Manage Payments</Button></div><Banknote className="h-8 w-8 text-primary opacity-50" /></div></CardContent></Card>

                    <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">{employee.payment_type === 'daily' ? 'Daily Rate' : employee.payment_type === 'weekly' ? 'Weekly Rate' : employee.payment_type === 'hourly' ? 'Hourly Rate' : employee.payment_type === 'contract' ? 'Contract Amount' : 'Monthly Salary'}</p><p className="text-xl font-bold">{employee.payment_type === 'daily' ? formatPKR(employee.daily_rate || 0) + '/day' : employee.payment_type === 'weekly' ? formatPKR(employee.weekly_rate || 0) + '/week' : employee.payment_type === 'hourly' ? formatPKR(employee.hourly_rate || 0) + '/hour' : employee.payment_type === 'contract' ? formatPKR(employee.contract_amount || 0) : formatPKR(employee.salary)}</p><Badge variant="outline" className="mt-1 capitalize text-xs">{employee.payment_type || employee.salary_type}</Badge></CardContent></Card>

                    <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Type & Shift</p><p className="text-lg font-bold capitalize">{employee.employee_type}</p><Badge variant="secondary" className="mt-1 capitalize text-xs">{employee.shift} shift</Badge></CardContent></Card>

                    <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Join Date</p><p className="text-lg font-bold">{format(new Date(employee.join_date), 'dd/MM/yyyy')}</p><p className="text-xs text-muted-foreground">{Math.floor((new Date().getTime() - new Date(employee.join_date).getTime()) / (1000 * 60 * 60 * 24))} days</p></CardContent></Card>

                    <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Status</p><Badge className={employee.is_active === 1 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>{employee.is_active === 1 ? 'Active' : 'Inactive'}</Badge><p className="text-xs text-muted-foreground mt-2">Payment: {employee.payment_method}</p></CardContent></Card>

                    <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Payment Method</p><p className="text-lg font-bold capitalize">{employee.payment_method}</p><p className="text-xs text-muted-foreground mt-2">Type: {employee.salary_type}</p></CardContent></Card>

                    <Card className="bg-yellow-50"><CardContent className="p-4"><p className="text-sm text-muted-foreground">💰 Outstanding Advances</p><p className="text-2xl font-bold text-yellow-600">{formatPKR(totalOutstandingAdvances)}</p><p className="text-xs text-muted-foreground">{advances.filter(a => a.status !== 'completed').length} active</p></CardContent></Card>
                </div>

                <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="attendance">📅 Attendance</TabsTrigger>
                        {employee.employee_type === "salesman" && <TabsTrigger value="sales">📦 Sales</TabsTrigger>}
                        <TabsTrigger value="payments">💰 Payments History</TabsTrigger>
                    </TabsList>

                    {/* ATTENDANCE TAB */}
                    <TabsContent value="attendance">
                        <Card>
                            <CardHeader><CardTitle>Attendance Management</CardTitle></CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <Card className="bg-blue-50"><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Days Employed</p><p className="text-2xl font-bold text-blue-600">{calculateTotalDays(employee.join_date, employee.leave_date)} days</p><p className="text-xs text-muted-foreground">Since {format(new Date(employee.join_date), 'dd/MM/yyyy')}</p></CardContent></Card>
                                    <Card className="bg-green-50"><CardContent className="p-4"><p className="text-sm text-muted-foreground">Current Month Present</p><p className="text-2xl font-bold text-green-600">{(() => { const now = new Date(); const summary = calculateAttendanceSummary(attendance, now.getFullYear(), now.getMonth()); return `${summary.present} / ${summary.total}`; })()}</p></CardContent></Card>
                                    <Card className="bg-red-50"><CardContent className="p-4"><p className="text-sm text-muted-foreground">Current Month Absents</p><p className="text-2xl font-bold text-red-600">{(() => { const now = new Date(); const summary = calculateAttendanceSummary(attendance, now.getFullYear(), now.getMonth()); return summary.absent; })()}</p></CardContent></Card>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-4 mb-6 p-4 bg-muted/30 rounded-lg">
                                    <div className="flex-1"><label className="text-sm font-medium mb-2 block">Select Date</label><Input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} /></div>
                                    <div className="flex flex-wrap gap-2 mt-2 sm:mt-0"><Button onClick={() => handleMarkAttendance("present")}>Present</Button><Button onClick={() => handleMarkAttendance("absent")} variant="outline">Absent</Button><Button onClick={() => handleMarkAttendance("leave")} variant="outline">Leave</Button></div>
                                </div>

                                <div className="flex flex-wrap gap-4 mb-6 p-4 bg-muted/30 rounded-lg"><div><label className="text-sm font-medium mb-2 block">View Month</label><Input type="month" value={attendanceFilterMonth} onChange={(e) => setAttendanceFilterMonth(e.target.value)} className="w-48" /></div></div>

                                <div className="space-y-2">
                                    {attendanceLoading ? (<div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>) : (() => {
                                        const [year, month] = attendanceFilterMonth.split('-');
                                        const filteredAttendance = attendance.filter(record => new Date(record.date).getFullYear() === parseInt(year) && new Date(record.date).getMonth() === parseInt(month) - 1);
                                        const summary = calculateAttendanceSummary(attendance, parseInt(year), parseInt(month) - 1);
                                        const daysInMonth = getDaysInMonth(parseInt(year), parseInt(month) - 1);
                                        const deduction = calculateAbsentDeduction(summary.absent, employee.salary, parseInt(year), parseInt(month) - 1);
                                        return (<><div className="bg-muted/50 p-4 rounded-lg mb-4"><h3 className="font-semibold mb-2">Month Summary: {format(new Date(parseInt(year), parseInt(month) - 1), 'MMMM yyyy')}</h3><div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm"><div>📅 Total Days: {daysInMonth}</div><div>✅ Present: {summary.present}</div><div>❌ Absent: {summary.absent}</div><div>🌴 Leave: {summary.leave}</div></div>{summary.absent > 0 && <div className="mt-2 text-red-600">Deduction: {formatPKR(deduction)}</div>}</div>
                                            {filteredAttendance.length === 0 ? (<div className="text-center py-8"><Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-2" /><p className="text-muted-foreground">No attendance records</p></div>) : (filteredAttendance.map((record) => (<div key={record.id} className="flex justify-between items-center p-3 border rounded-lg"><div><p className="font-medium">{format(new Date(record.date), "dd/MM/yyyy")}</p>{record.checkIn && record.checkOut && <p className="text-sm text-muted-foreground">{record.checkIn} - {record.checkOut}</p>}</div><div className="flex items-center gap-3"><Badge className={record.status === "present" ? "bg-green-100 text-green-800" : record.status === "absent" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}>{record.status.toUpperCase()}</Badge><Button size="sm" variant="ghost" onClick={() => { setEditingAttendance({ id: record.id, employeeId: record.employeeId || record.employee_id, date: record.date, status: record.status, notes: record.notes }); setTempAttendanceStatus(record.status); setIsAttendanceEditModalOpen(true); }}><Edit className="h-4 w-4" /></Button></div></div>)))}</>);
                                    })()}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* SALES TAB */}
                    {employee.employee_type === "salesman" && (
                        <TabsContent value="sales">
                            <Card>
                                <CardHeader><CardTitle>Sales History</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5 mb-6 p-4 bg-muted/40 rounded-lg">
                                        <div><label className="text-sm font-medium mb-1 block">Payment Status</label><Select value={filters.paymentStatus || "all"} onValueChange={(v) => handleFilterChange("paymentStatus", v === "all" ? "" : v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select></div>
                                        <div><label className="text-sm font-medium mb-1 block">Min Total</label><Input type="number" value={filters.minTotal} onChange={(e) => handleFilterChange("minTotal", e.target.value)} placeholder="Min" /></div>
                                        <div><label className="text-sm font-medium mb-1 block">Max Total</label><Input type="number" value={filters.maxTotal} onChange={(e) => handleFilterChange("maxTotal", e.target.value)} placeholder="Max" /></div>
                                        <div><label className="text-sm font-medium mb-1 block">Start Date</label><Input type="date" value={filters.startDate} onChange={(e) => handleFilterChange("startDate", e.target.value)} /></div>
                                        <div><label className="text-sm font-medium mb-1 block">End Date</label><Input type="date" value={filters.endDate} onChange={(e) => handleFilterChange("endDate", e.target.value)} /></div>
                                        <div className="col-span-full"><Button variant="outline" onClick={handleResetFilters}>Reset Filters</Button></div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                        <Card className="bg-blue-50"><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Sales</p><p className="text-2xl font-bold text-blue-600">{formatPKR(sales?.data?.reduce((acc, s) => acc + parseFloat(s.total || 0), 0) || 0)}</p><p className="text-xs">{sales?.data?.length || 0} transactions</p></CardContent></Card>
                                        <Card className="bg-green-50"><CardContent className="p-4"><p className="text-sm text-muted-foreground">Completed</p><p className="text-2xl font-bold text-green-600">{formatPKR(sales?.data?.filter(s => s.payment_status === "completed").reduce((acc, s) => acc + parseFloat(s.total || 0), 0) || 0)}</p></CardContent></Card>
                                        <Card className="bg-yellow-50"><CardContent className="p-4"><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold text-yellow-600">{formatPKR(sales?.data?.filter(s => s.payment_status === "pending").reduce((acc, s) => acc + parseFloat(s.total || 0), 0) || 0)}</p></CardContent></Card>
                                        <Card className="bg-red-50"><CardContent className="p-4"><p className="text-sm text-muted-foreground">Cancelled/Returned</p><p className="text-2xl font-bold text-red-600">{formatPKR(sales?.data?.filter(s => s.payment_status === "cancelled" || s.return_status !== 'none').reduce((acc, s) => acc + parseFloat(s.total || 0), 0) || 0)}</p></CardContent></Card>
                                    </div>

                                    {salesLoading ? (<div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div><span className="ml-2">Loading...</span></div>) : sales?.data?.length === 0 ? (<div className="text-center py-8"><Calendar className="h-12 w-12 mx-auto mb-2" /><p>No sales records</p></div>) : (<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                        {sales?.data?.map((sale) => {
                                            let formattedDate = "Date not available";
                                            try {
                                                if (sale.created_at) {
                                                    const date = new Date(sale.created_at);
                                                    if (!isNaN(date.getTime())) {
                                                        formattedDate = format(date, "dd/MM/yyyy");
                                                    }
                                                }
                                            } catch (error) {
                                                formattedDate = "Invalid date";
                                            }

                                            return (
                                                <div key={sale.id} onClick={() => handleSaleClick(sale.id)} className="cursor-pointer p-4 border rounded-lg hover:bg-muted/50">
                                                    <div className="flex justify-between mb-2">
                                                        <p className="font-medium">{formattedDate}</p>
                                                        <Badge className={sale.payment_status === "completed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                                                            {sale.payment_status?.toUpperCase()}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">Customer: {sale.customer_name || 'Walk-in'}</p>
                                                    <div className="flex justify-between mt-2">
                                                        <span>Total: {formatPKR(sale.total)}</span>
                                                        <span className="text-purple-600">Profit: {formatPKR(sale.total_profit)}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>)}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    )}

                    {/* PAYMENTS HISTORY TAB - Shows ALL payments (Salaries + Wages + Extra Work) */}
                    <TabsContent value="payments">
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle>Complete Payment History</CardTitle>
                                    <Button onClick={() => setShowPaymentManager(true)}>
                                        <Banknote className="h-4 w-4 mr-2" />
                                        Manage Payments
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                    <Card className="bg-green-50"><CardContent className="p-4"><p className="text-sm text-muted-foreground">💰 Total Salaries Paid</p><p className="text-2xl font-bold text-green-600">{formatPKR(totalSalariesPaid)}</p></CardContent></Card>
                                    <Card className="bg-blue-50"><CardContent className="p-4"><p className="text-sm text-muted-foreground">⏰ Total Wages & Extra Work</p><p className="text-2xl font-bold text-blue-600">{formatPKR(totalWagesPaid)}</p></CardContent></Card>
                                    <Card className="bg-purple-50"><CardContent className="p-4"><p className="text-sm text-muted-foreground">📊 Total Employee Cost</p><p className="text-2xl font-bold text-purple-600">{formatPKR(totalEmployeeCost)}</p></CardContent></Card>
                                </div>

                                {allPayments.length === 0 ? (
                                    <div className="text-center py-8"><Banknote className="h-12 w-12 mx-auto mb-2" /><p>No payment records found</p></div>
                                ) : (
                                    <div className="space-y-3">
                                        {paginatedPayments.map((payment) => {
                                            let displayDate = "Date not set";
                                            if (payment.date) {
                                                try {
                                                    const date = new Date(payment.date);
                                                    if (!isNaN(date.getTime())) {
                                                        displayDate = format(date, 'dd/MM/yyyy');
                                                    }
                                                } catch (e) {
                                                    displayDate = "Invalid date";
                                                }
                                            }

                                            return (
                                                <div key={payment.id} className="flex justify-between items-start p-4 border rounded-lg">
                                                    <div>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className="font-medium">
                                                                {payment.type === 'salary' ? '📅 Monthly Salary' :
                                                                    payment.type === 'daily' ? '📆 Daily Wages' :
                                                                        payment.type === 'weekly' ? '📆 Weekly Wages' :
                                                                            payment.type === 'extra_work' ? '⏰ Extra Work' :
                                                                                payment.type === 'advance_repayment' ? '💰 Advance Repayment' : '💰 Payment'}
                                                            </p>
                                                            <Badge className={payment.status === 'paid' || payment.status === 'completed' ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                                                                {payment.status?.toUpperCase() || 'COMPLETED'}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground mt-1">{payment.description || 'No description'}</p>
                                                        <p className="text-xs text-muted-foreground mt-1">{displayDate} • {payment.payment_method?.toUpperCase() || 'CASH'}</p>
                                                        {payment.notes && <p className="text-xs text-muted-foreground mt-1">Note: {payment.notes}</p>}
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-lg font-bold text-green-600">{formatPKR(payment.amount)}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {totalPaymentPages > 1 && (
                                    <div className="flex justify-between items-center mt-4">
                                        <div className="text-sm text-muted-foreground">
                                            Showing {((paymentHistoryPage - 1) * paymentHistoryPageSize) + 1} to {Math.min(paymentHistoryPage * paymentHistoryPageSize, allPayments.length)} of {allPayments.length}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={() => setPaymentHistoryPage(p => Math.max(1, p - 1))} disabled={paymentHistoryPage === 1}>
                                                Previous
                                            </Button>
                                            <span className="px-4 text-sm">Page {paymentHistoryPage} of {totalPaymentPages}</span>
                                            <Button variant="outline" size="sm" onClick={() => setPaymentHistoryPage(p => Math.min(totalPaymentPages, p + 1))} disabled={paymentHistoryPage === totalPaymentPages}>
                                                Next
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>

            <EditAttendanceModal isOpen={isAttendanceEditModalOpen} onClose={() => setIsAttendanceEditModalOpen(false)} editingAttendance={editingAttendance} setEditingAttendance={setEditingAttendance} tempAttendanceStatus={tempAttendanceStatus} setTempAttendanceStatus={setTempAttendanceStatus} onSave={handleUpdateAttendance} />

            {showPaymentManager && (
                <EmployeePaymentManager
                    employeeId={employeeId}
                    onClose={() => {
                        setShowPaymentManager(false);
                        refetchEmployee();
                        refetchEmployeePayments();
                        refetchSalaries();
                        refetchAdvances();
                        queryClient.invalidateQueries({ queryKey: ["salaries", employeeId] });
                        queryClient.invalidateQueries({ queryKey: ["employeePayments", employeeId] });
                        queryClient.invalidateQueries({ queryKey: ["employeeAdvances", employeeId] });
                    }}
                    onPaymentUpdate={() => {
                        refetchEmployeePayments();
                        refetchSalaries();
                        queryClient.invalidateQueries({ queryKey: ["employeePayments", employeeId] });
                        queryClient.invalidateQueries({ queryKey: ["salaries", employeeId] });
                    }}
                />
            )}
        </div>
    );
}