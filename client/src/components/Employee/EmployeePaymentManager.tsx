// EmployeePaymentManager.tsx
import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPKR } from "@/lib/currency";
import { format } from "date-fns";
import { Calendar, Banknote, Download, AlertCircle, CheckCircle, Clock, Plus, Eye, Edit, Trash2, Search, Filter, ChevronLeft, ChevronRight, Calculator } from "lucide-react";
import { api } from "../../services/electron-api";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface Employee {
    id: string;
    name: string;
    phone: string;
    payment_type: string;
    salary: number;
    daily_rate: number;
    weekly_rate: number;
    hourly_rate: number;
    contract_amount: number;
    contract_start_date?: string;
    contract_end_date?: string;
    salary_type?: string;
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

interface EmployeeAdvance {
    id: string;
    employee_id: string;
    advance_date: string;
    amount: number;
    paid_amount: number;
    remaining_amount: number;
    reason: string;
    status: string;
    expected_deduction_date?: string;
}

interface SalaryDeduction {
    id: string;
    employee_id: string;
    advance_id: string;
    amount: number;
    deduction_type: string;
    deduction_month: string;
    monthly_amount: number;
    total_months: number;
    deducted_so_far: number;
    status: string;
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

export default function EmployeePaymentManager({ employeeId, onClose, onPaymentUpdate }: { employeeId: string; onClose: () => void; onPaymentUpdate?: () => void }) {
    const [selectedTab, setSelectedTab] = useState("wages");
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentType, setPaymentType] = useState("salary");
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [paymentNotes, setPaymentNotes] = useState("");
    const [periodStart, setPeriodStart] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [periodEnd, setPeriodEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    // Salary Management States (for monthly employees)
    const [salaryMonth, setSalaryMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [salaryBonuses, setSalaryBonuses] = useState(0);
    const [salaryDeductions, setSalaryDeductions] = useState(0);
    const [salaryStatus, setSalaryStatus] = useState<'pending' | 'paid' | 'cancelled'>('pending');
    const [salaryNotes, setSalaryNotes] = useState("");

    // Pagination states for payment history
    const [paymentHistoryPage, setPaymentHistoryPage] = useState(1);
    const [paymentHistorySearch, setPaymentHistorySearch] = useState("");
    const [paymentHistoryFilter, setPaymentHistoryFilter] = useState("all");
    const [paymentHistoryDateFrom, setPaymentHistoryDateFrom] = useState("");
    const [paymentHistoryDateTo, setPaymentHistoryDateTo] = useState("");
    const itemsPerPage = 10;

    // Schedule related states
    const [showScheduleList, setShowScheduleList] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<SalaryDeduction | null>(null);
    const [showEditSchedule, setShowEditSchedule] = useState(false);
    const [deductionAlert, setDeductionAlert] = useState<{ type: 'warning' | 'info' | 'success'; message: string } | null>(null);
    const [selectedSchedule, setSelectedSchedule] = useState<SalaryDeduction | null>(null);
    const [showMarkAsDeducted, setShowMarkAsDeducted] = useState(false);
    const [showCancelSchedule, setShowCancelSchedule] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Extra Work states
    const [editingExtraWork, setEditingExtraWork] = useState<any>(null);
    const [showEditExtraWork, setShowEditExtraWork] = useState(false);
    const [extraWorkDate, setExtraWorkDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [extraHours, setExtraHours] = useState(0);
    const [extraAmount, setExtraAmount] = useState(0);
    const [extraWorkReason, setExtraWorkReason] = useState("");
    const [extraWorkRecords, setExtraWorkRecords] = useState<any[]>([]);
    const [hourlyRate, setHourlyRate] = useState(0);

    // Advance-related state
    const [newAdvanceAmount, setNewAdvanceAmount] = useState(0);
    const [newAdvanceReason, setNewAdvanceReason] = useState("");
    const [newAdvanceExpectedDate, setNewAdvanceExpectedDate] = useState("");
    const [newAdvanceNotes, setNewAdvanceNotes] = useState("");
    const [showDeductFromSalary, setShowDeductFromSalary] = useState(false);
    const [showRecordRepayment, setShowRecordRepayment] = useState(false);
    const [selectedAdvance, setSelectedAdvance] = useState<EmployeeAdvance | null>(null);
    const [repaymentAmount, setRepaymentAmount] = useState(0);
    const [repaymentMethod, setRepaymentMethod] = useState("cash");
    const [repaymentNotes, setRepaymentNotes] = useState("");

    const [deductionType, setDeductionType] = useState('current_month');
    const [deductionMonth, setDeductionMonth] = useState('');
    const [installmentAmount, setInstallmentAmount] = useState(0);
    const [installmentMonths, setInstallmentMonths] = useState(1);
    const [deductionNotes, setDeductionNotes] = useState('');

    // Paid dates tracking
    const [paidDates, setPaidDates] = useState<string[]>([]);
    const [showSalaryManagement, setShowSalaryManagement] = useState(false);

    // Fetch salary deductions
    const { data: salaryDeductionsData = [], refetch: refetchDeductions } = useQuery({
        queryKey: ["salaryDeductions", employeeId],
        queryFn: async () => {
            const result = await api.getSalaryDeductions(employeeId);
            return Array.isArray(result) ? result : [];
        },
        enabled: !!employeeId,
    });

    // Fetch employee details
    const { data: employee, refetch: refetchEmployee } = useQuery<Employee>({
        queryKey: ["employee", employeeId],
        queryFn: async () => {
            const result = await api.getEmployee(employeeId);
            return result?.id ? result : null;
        },
    });

    // Fetch payment history
    const { data: payments = [], refetch: refetchPayments } = useQuery<EmployeePayment[]>({
        queryKey: ["employeePayments", employeeId],
        queryFn: async () => {
            const result = await api.getEmployeePayments(employeeId);
            return Array.isArray(result) ? result : [];
        },
    });

    // Fetch salaries
    const { data: salaries = [], refetch: refetchSalaries } = useQuery<Salary[]>({
        queryKey: ["salaries", employeeId],
        queryFn: async () => {
            const result = await api.getSalaries(employeeId);
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

    // Fetch advances
    const { data: advances = [], refetch: refetchAdvances } = useQuery<EmployeeAdvance[]>({
        queryKey: ["employeeAdvances", employeeId],
        queryFn: async () => {
            const result = await api.getEmployeeAdvances(employeeId);
            return Array.isArray(result) ? result : [];
        },
    });

    // Check if employee is monthly/salary type
    const isMonthlyEmployee = employee?.payment_type === 'fixed' || employee?.salary_type === 'monthly';

    // Create/Update Salary Mutation
    const createSalaryMutation = useMutation({
        mutationFn: async (salaryData: any) => {
            const [year, month] = salaryData.month.split('-');
            const existingSalaries = await api.getSalaries(employeeId, month, year.toString());
            let existingSalary = null;
            if (Array.isArray(existingSalaries) && existingSalaries.length > 0) {
                existingSalary = existingSalaries[0];
            } else if (existingSalaries?.success && Array.isArray(existingSalaries.data) && existingSalaries.data.length > 0) {
                existingSalary = existingSalaries.data[0];
            }

            const data = {
                employeeId: employeeId,
                month: month,
                year: salaryData.year,
                basicSalary: parseFloat(salaryData.basicSalary) || 0,
                bonuses: parseFloat(salaryData.bonuses) || 0,
                deductions: parseFloat(salaryData.deductions) || 0,
                netSalary: parseFloat(salaryData.netSalary) || 0,
                status: salaryData.status,
                paymentMethod: salaryData.paymentMethod || 'cash',
                userId: 'system',
                shopId: 'default',
                notes: salaryData.notes
            };

            if (existingSalary) {
                const result = await api.updateSalary(existingSalary.id, data);
                return { ...result, isUpdate: true };
            } else {
                const result = await api.createSalary(data);
                return { ...result, isUpdate: false };
            }
        },
        onSuccess: (result) => {
            toast({ title: "Success", description: result?.isUpdate ? "Salary record updated" : "Salary record added" });
            refetchSalaries();
            if (onPaymentUpdate) onPaymentUpdate();
            setSalaryBonuses(0);
            setSalaryDeductions(0);
            setSalaryStatus('pending');
            setSalaryNotes("");
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const handleCreateSalary = () => {
        if (!salaryMonth) {
            toast({ title: "Error", description: "Please select a month", variant: "destructive" });
            return;
        }
        const [year, month] = salaryMonth.split('-');
        const basic = parseFloat(employee?.salary?.toString() || "0");
        const bonus = parseFloat(salaryBonuses?.toString() || "0");
        const deduction = parseFloat(salaryDeductions?.toString() || "0");
        const netSalary = basic + bonus - deduction;

        createSalaryMutation.mutate({
            month: salaryMonth,
            year: parseInt(year),
            basicSalary: basic,
            bonuses: bonus,
            deductions: deduction,
            netSalary: netSalary,
            status: salaryStatus,
            paymentMethod: employee?.payment_method,
            notes: salaryNotes
        });
    };

    // Update paid dates list from payments
    useEffect(() => {
        if (payments.length > 0) {
            const dates: string[] = [];
            payments.forEach(payment => {
                if (payment.payment_type === 'salary' || payment.payment_type === 'daily') {
                    if (payment.payment_date) {
                        dates.push(payment.payment_date.split('T')[0]);
                    }
                    if (payment.period_start && payment.period_end) {
                        const start = new Date(payment.period_start);
                        const end = new Date(payment.period_end);
                        let current = new Date(start);
                        while (current <= end) {
                            dates.push(format(current, 'yyyy-MM-dd'));
                            current.setDate(current.getDate() + 1);
                        }
                    }
                }
            });
            setPaidDates([...new Set(dates)]);
        }
    }, [payments]);

    // Check for upcoming deductions
    useEffect(() => {
        if (salaryDeductionsData.length > 0) {
            const upcomingDeductions = salaryDeductionsData.filter((d: SalaryDeduction) => {
                if (d.status !== 'scheduled' && d.status !== 'active') return false;
                if (d.deduction_month) {
                    const deductionDate = new Date(d.deduction_month);
                    const now = new Date();
                    const threeDaysFromNow = new Date();
                    threeDaysFromNow.setDate(now.getDate() + 3);
                    return deductionDate <= threeDaysFromNow && deductionDate >= now;
                }
                return false;
            });

            if (upcomingDeductions.length > 0) {
                setDeductionAlert({
                    type: 'warning',
                    message: `⚠️ ${upcomingDeductions.length} deduction(s) scheduled in next 3 days. Please review.`
                });
                setTimeout(() => setDeductionAlert(null), 5000);
            }
        }
    }, [salaryDeductionsData]);

    // Helper functions
    const getDaysInPeriod = (startDate: string, endDate: string) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        let count = 0;
        let current = new Date(start);
        while (current <= end) {
            count++;
            current.setDate(current.getDate() + 1);
        }
        return count;
    };

    const getPaidDaysInPeriod = useCallback((startDate: string, endDate: string) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const paidDays: string[] = [];
        let current = new Date(start);
        while (current <= end) {
            const dateStr = format(current, 'yyyy-MM-dd');
            if (paidDates.includes(dateStr)) {
                paidDays.push(dateStr);
            }
            current.setDate(current.getDate() + 1);
        }
        return paidDays;
    }, [paidDates]);

    const getUnpaidDaysInPeriod = useCallback((startDate: string, endDate: string) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const unpaidDays: Date[] = [];
        let current = new Date(start);
        while (current <= end) {
            const dateStr = format(current, 'yyyy-MM-dd');
            if (!paidDates.includes(dateStr)) {
                unpaidDays.push(new Date(current));
            }
            current.setDate(current.getDate() + 1);
        }
        return unpaidDays;
    }, [paidDates]);

   const calculateWages = () => {
    if (!employee) return 0;
    if (employee.payment_type === 'fixed' || employee.salary_type === 'monthly') return 0; // Monthly employees handled separately

    const unpaidDays = getUnpaidDaysInPeriod(periodStart, periodEnd);
    const unpaidDaysCount = unpaidDays.length;
    
    if (unpaidDaysCount === 0) return 0;
    
    const weeks = Math.ceil(unpaidDaysCount / 7);
    const hours = unpaidDaysCount * 8;

    switch (employee.payment_type) {
        case 'contract':
            // For contractors, calculate daily rate from contract amount
            if (employee.contract_amount && employee.contract_start_date && employee.contract_end_date) {
                const contractStart = new Date(employee.contract_start_date);
                const contractEnd = new Date(employee.contract_end_date);
                const contractDays = Math.ceil((contractEnd.getTime() - contractStart.getTime()) / (1000 * 60 * 60 * 24));
                const dailyRate = employee.contract_amount / contractDays;
                return dailyRate * unpaidDaysCount;
            }
            return employee.contract_amount || 0;
        case 'daily':
            return employee.daily_rate * unpaidDaysCount;
        case 'weekly':
            return employee.weekly_rate * weeks;
        case 'hourly':
            return employee.hourly_rate * hours;
        default:
            return 0;
    }
};

    // Calculate total paid (synced with salaries and payments)
    const totalPaidWages = payments.filter(p => p.payment_type !== 'salary').reduce((sum, p) => sum + p.amount, 0);
    const totalSalariesPaid = salaries.filter(s => s.status === 'paid').reduce((sum, s) => sum + s.netSalary, 0);
    const totalEmployeeCost = totalPaidWages + totalSalariesPaid;

    const handlePayWages = async () => {
    if (paymentAmount <= 0) {
        toast({ title: "Error", description: "Please enter a valid amount", variant: "destructive" });
        return;
    }

    const paidDaysInSelectedPeriod = getPaidDaysInPeriod(periodStart, periodEnd);
    const unpaidDays = getUnpaidDaysInPeriod(periodStart, periodEnd);
    
    if (unpaidDays.length === 0) {
        toast({ title: "No Unpaid Days", description: "All days in this period have already been paid.", variant: "destructive" });
        return;
    }

    if (paidDaysInSelectedPeriod.length > 0) {
        toast({
            title: "Partial Period Payment",
            description: `${paidDaysInSelectedPeriod.length} day(s) already paid. Paying for ${unpaidDays.length} unpaid day(s).`,
            variant: "default"
        });
    }

    // Determine correct payment_type based on employee's payment_type
    let actualPaymentType = paymentType;
    if (employee?.payment_type === 'contract') {
        actualPaymentType = 'contract'; // Contractors should use 'contract' type
    } else if (employee?.payment_type === 'fixed' || employee?.salary_type === 'monthly') {
        actualPaymentType = 'salary'; // Monthly salaried employees use 'salary'
    } else if (employee?.payment_type === 'daily') {
        actualPaymentType = 'daily';
    } else if (employee?.payment_type === 'weekly') {
        actualPaymentType = 'weekly';
    } else if (employee?.payment_type === 'hourly') {
        actualPaymentType = 'hourly';
    }

    setIsSubmitting(true);
    try {
        const result = await api.createEmployeePayment({
            employee_id: employeeId,
            payment_date: new Date().toISOString(),
            amount: paymentAmount,
            payment_type: actualPaymentType, // Use the corrected type
            period_start: periodStart,
            period_end: periodEnd,
            description: paymentNotes || `${employee?.payment_type === 'contract' ? 'Contract payment' : 'Wage payment'} for ${unpaidDays.length} unpaid days`,
            status: 'completed',
            payment_method: paymentMethod,
            user_id: 'system',
            shop_id: 'default'
        });

        if (result.success) {
            toast({ title: "Success", description: `Paid ${unpaidDays.length} day(s) - ${formatPKR(paymentAmount)}` });
            refetchPayments();
            if (onPaymentUpdate) onPaymentUpdate();
            setPaymentAmount(0);
            setPaymentNotes("");
        }
    } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
};

    const handleCreateAdvance = async () => {
        if (newAdvanceAmount <= 0 || !newAdvanceReason) {
            toast({ title: "Error", description: "Please enter amount and reason", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await api.createEmployeeAdvance({
                employee_id: employeeId,
                advance_date: new Date().toISOString(),
                amount: newAdvanceAmount,
                paid_amount: 0,
                remaining_amount: newAdvanceAmount,
                reason: newAdvanceReason,
                status: 'pending',
                expected_deduction_date: newAdvanceExpectedDate || null,
                user_id: 'system',
                shop_id: 'default'
            });

            if (result.success) {
                toast({ title: "Success", description: `Advance of ${formatPKR(newAdvanceAmount)} recorded` });
                setNewAdvanceAmount(0);
                setNewAdvanceReason("");
                setNewAdvanceExpectedDate("");
                setNewAdvanceNotes("");
                refetchAdvances();
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleScheduleDeduction = async () => {
        if (!selectedAdvance) return;

        let deductionMonthValue = null;
        let monthlyAmount = 0;
        let totalMonths = 0;

        switch (deductionType) {
            case 'current_month':
                deductionMonthValue = format(new Date(), 'yyyy-MM');
                break;
            case 'next_month':
                const nextMonth = new Date();
                nextMonth.setMonth(nextMonth.getMonth() + 1);
                deductionMonthValue = format(nextMonth, 'yyyy-MM');
                break;
            case 'specific_month':
                deductionMonthValue = deductionMonth;
                break;
            case 'installments':
                monthlyAmount = installmentAmount;
                totalMonths = installmentMonths;
                deductionMonthValue = format(new Date(), 'yyyy-MM');
                break;
        }

        setIsSubmitting(true);
        try {
            const result = await api.createSalaryDeduction({
                employee_id: employeeId,
                advance_id: selectedAdvance.id,
                amount: selectedAdvance.remaining_amount,
                deduction_type: deductionType,
                deduction_month: deductionMonthValue,
                monthly_amount: monthlyAmount,
                total_months: totalMonths,
                status: 'scheduled',
                notes: deductionNotes,
                user_id: 'system',
                shop_id: 'default'
            });

            if (result.success) {
                toast({ title: "Success", description: deductionType === 'installments' ? `Will deduct ${formatPKR(installmentAmount)} per month for ${installmentMonths} month(s)` : `Deduction scheduled for ${deductionMonthValue}` });
                await api.updateEmployeeAdvance(selectedAdvance.id, { status: deductionType === 'installments' ? 'scheduled_installments' : 'scheduled_deduction' });
                refetchAdvances();
                refetchDeductions();
                setShowDeductFromSalary(false);
                setSelectedAdvance(null);
                setDeductionType('current_month');
                setDeductionMonth('');
                setInstallmentAmount(0);
                setInstallmentMonths(1);
                setDeductionNotes('');
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRecordRepayment = async () => {
        if (!selectedAdvance || repaymentAmount <= 0) return;

        const newPaidAmount = (selectedAdvance.paid_amount || 0) + repaymentAmount;
        const newRemaining = selectedAdvance.amount - newPaidAmount;
        const newStatus = newRemaining === 0 ? 'completed' : 'partially_paid';

        try {
            await api.updateEmployeeAdvance(selectedAdvance.id, {
                paid_amount: newPaidAmount,
                remaining_amount: newRemaining,
                status: newStatus
            });

            await api.createEmployeePayment({
                employee_id: employeeId,
                payment_date: new Date().toISOString(),
                amount: repaymentAmount,
                payment_type: 'advance_repayment',
                description: `Repayment of advance: ${selectedAdvance.reason}`,
                status: 'completed',
                payment_method: repaymentMethod,
                notes: repaymentNotes,
                user_id: 'system',
                shop_id: 'default'
            });

            toast({ title: "Success", description: `Repayment of ${formatPKR(repaymentAmount)} recorded` });
            refetchAdvances();
            refetchPayments();
            setShowRecordRepayment(false);
            setSelectedAdvance(null);
            setRepaymentAmount(0);
            setRepaymentNotes("");
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    // Extra Work Functions
    const fetchExtraWorkRecords = async () => {
        try {
            const result = await api.getEmployeePayments(employeeId);
            const extraWorks = result.filter((p: any) => p.payment_type === 'extra_work').map((p: any) => ({
                id: p.id,
                payment_date: p.payment_date,
                amount: p.amount,
                description: p.description,
                hours: extractHoursFromDescription(p.description),
            }));
            setExtraWorkRecords(extraWorks);
        } catch (error) {
            console.error('Error fetching extra work records:', error);
        }
    };

    const extractHoursFromDescription = (description: string) => {
        if (!description) return 0;
        const match = description.match(/\(([\d.]+)\s*hours?\)/i);
        return match ? parseFloat(match[1]) : 0;
    };

    const handleAddExtraWork = async () => {
        const finalAmount = extraAmount > 0 ? extraAmount : extraHours * hourlyRate;
        if (finalAmount <= 0) {
            toast({ title: "Error", description: "Please enter valid hours or amount", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await api.createEmployeePayment({
                employee_id: employeeId,
                payment_date: extraWorkDate,
                amount: finalAmount,
                payment_type: 'extra_work',
                description: `Extra work: ${extraWorkReason} (${extraHours} hours)`,
                status: 'completed',
                payment_method: paymentMethod,
                user_id: 'system',
                shop_id: 'default'
            });

            if (result.success) {
                toast({ title: "Success", description: `Extra work payment of ${formatPKR(finalAmount)} recorded` });
                await fetchExtraWorkRecords();
                refetchPayments();
                setExtraHours(0);
                setExtraAmount(0);
                setExtraWorkReason("");
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteExtraWork = async (id: string) => {
        if (confirm('Are you sure you want to delete this extra work record?')) {
            try {
                const result = await api.deleteEmployeePayment(id);
                if (result.success) {
                    toast({ title: "Success", description: "Extra work record deleted" });
                    fetchExtraWorkRecords();
                    refetchPayments();
                }
            } catch (error: any) {
                toast({ title: "Error", description: error.message, variant: "destructive" });
            }
        }
    };

    const handleEditExtraWork = (record: any) => {
        setEditingExtraWork(record);
        setShowEditExtraWork(true);
    };

    const handleUpdateExtraWork = async () => {
        if (!editingExtraWork) return;
        try {
            const result = await api.updateEmployeePayment(editingExtraWork.id, {
                amount: editingExtraWork.amount,
                description: editingExtraWork.description,
                payment_date: editingExtraWork.payment_date
            });
            if (result.success) {
                toast({ title: "Success", description: "Extra work record updated" });
                fetchExtraWorkRecords();
                refetchPayments();
                setShowEditExtraWork(false);
                setEditingExtraWork(null);
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    // Schedule management handlers
    const handleUpdateSchedule = async () => {
        if (!editingSchedule) return;
        try {
            const result = await api.updateSalaryDeduction(editingSchedule.id, {
                deduction_month: editingSchedule.deduction_month,
                monthly_amount: editingSchedule.monthly_amount,
                total_months: editingSchedule.total_months,
                status: editingSchedule.status,
                notes: editingSchedule.notes,
            });
            if (result.success) {
                toast({ title: "Success", description: "Schedule updated successfully" });
                refetchDeductions();
                setShowEditSchedule(false);
                setEditingSchedule(null);
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const handleMarkAsDeducted = async () => {
        if (!selectedSchedule) return;
        const newDeductedSoFar = (selectedSchedule.deducted_so_far || 0) + (selectedSchedule.deduction_type === 'installments' ? selectedSchedule.monthly_amount : selectedSchedule.amount);
        const newStatus = newDeductedSoFar >= selectedSchedule.amount ? 'completed' : 'active';
        try {
            await api.updateSalaryDeduction(selectedSchedule.id, { deducted_so_far: newDeductedSoFar, status: newStatus });
            if (newStatus === 'completed' && selectedSchedule.advance_id) {
                await api.updateEmployeeAdvance(selectedSchedule.advance_id, { status: 'completed', remaining_amount: 0 });
            }
            toast({ title: "Success", description: "Marked as deducted for this month" });
            refetchDeductions();
            refetchAdvances();
            setShowMarkAsDeducted(false);
            setSelectedSchedule(null);
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const handleCancelSchedule = async () => {
        if (!selectedSchedule) return;
        try {
            await api.updateSalaryDeduction(selectedSchedule.id, { status: 'cancelled', notes: `Cancelled on ${new Date().toLocaleDateString()}. ${selectedSchedule.notes || ''}` });
            if (selectedSchedule.advance_id) {
                await api.updateEmployeeAdvance(selectedSchedule.advance_id, { status: 'pending' });
            }
            toast({ title: "Success", description: "Schedule cancelled successfully" });
            refetchDeductions();
            refetchAdvances();
            setShowCancelSchedule(false);
            setSelectedSchedule(null);
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const handleDeleteSchedule = async () => {
        if (!selectedSchedule) return;
        try {
            await api.updateSalaryDeduction(selectedSchedule.id, { status: 'cancelled', notes: `Deleted on ${new Date().toLocaleDateString()}. ${selectedSchedule.notes || ''}` });
            toast({ title: "Success", description: "Schedule deleted" });
            refetchDeductions();
            setShowDeleteConfirm(false);
            setSelectedSchedule(null);
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    // Filtered and paginated payment history
    const filteredPayments = payments.filter(payment => {
        if (paymentHistoryFilter !== "all" && payment.payment_type !== paymentHistoryFilter) return false;
        if (paymentHistorySearch && !payment.description?.toLowerCase().includes(paymentHistorySearch.toLowerCase())) return false;
        if (paymentHistoryDateFrom && new Date(payment.payment_date) < new Date(paymentHistoryDateFrom)) return false;
        if (paymentHistoryDateTo && new Date(payment.payment_date) > new Date(paymentHistoryDateTo)) return false;
        return true;
    });

    const paginatedPayments = filteredPayments.slice((paymentHistoryPage - 1) * itemsPerPage, paymentHistoryPage * itemsPerPage);
    const totalPaymentPages = Math.ceil(filteredPayments.length / itemsPerPage);

    // Salary History Filter
    const [salaryFilterMonth, setSalaryFilterMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [salaryPage, setSalaryPage] = useState(1);
    const salaryPageSize = 10;

    const filteredSalaries = [...salaries].filter(s => {
        if (salaryFilterMonth) {
            const [filterYear, filterMonth] = salaryFilterMonth.split('-');
            return s.year.toString() === filterYear && s.month === filterMonth;
        }
        return true;
    }).sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return parseInt(b.month) - parseInt(a.month);
    });

    const paginatedSalaries = filteredSalaries.slice((salaryPage - 1) * salaryPageSize, salaryPage * salaryPageSize);
    const totalSalaryPages = Math.ceil(filteredSalaries.length / salaryPageSize);

    const totalSalariesOutstanding = salaries.filter(s => s.status === 'pending').reduce((sum, s) => sum + s.netSalary, 0);
    const netSalaryCalculation = (employee?.salary || 0) + salaryBonuses - salaryDeductions;

    useEffect(() => {
        if (employee) {
            if (employee.payment_type === 'fixed') setHourlyRate(employee.salary / (30 * 8));
            else if (employee.payment_type === 'daily') setHourlyRate(employee.daily_rate / 8);
            else if (employee.payment_type === 'hourly') setHourlyRate(employee.hourly_rate);
        }
    }, [employee]);

    useEffect(() => {
        if (employeeId) fetchExtraWorkRecords();
    }, [employeeId]);

    const totalAdvances = advances.reduce((sum, a) => sum + a.remaining_amount, 0);
    const calculatedWage = calculateWages();
    const unpaidDaysCount = getUnpaidDaysInPeriod(periodStart, periodEnd).length;

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Payment Management - {employee?.name}</DialogTitle>
                    <DialogDescription>
                        Total Employee Cost: {formatPKR(totalEmployeeCost)} | Outstanding Advances: {formatPKR(totalAdvances)}
                        {isMonthlyEmployee && ` | Outstanding Salaries: ${formatPKR(totalSalariesOutstanding)}`}
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        {!isMonthlyEmployee && <TabsTrigger value="wages">💰 Pay Wages</TabsTrigger>}
                        {isMonthlyEmployee && <TabsTrigger value="salary">📊 Salary Management</TabsTrigger>}
                        <TabsTrigger value="advances">📝 Advances / Debit</TabsTrigger>
                        <TabsTrigger value="history">📜 Payment History</TabsTrigger>
                        <TabsTrigger value="extrawork">⏰ Extra Work</TabsTrigger>
                    </TabsList>

                    {/* SALARY MANAGEMENT TAB - For Monthly Employees */}
                    {isMonthlyEmployee && (
                        <TabsContent value="salary" className="space-y-4">
                            {/* Salary Summary Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Monthly Salary</p><p className="text-2xl font-bold text-blue-600">{formatPKR(employee?.salary || 0)}</p><p className="text-xs text-muted-foreground">Base salary per month</p></CardContent></Card>
                                <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Paid</p><p className="text-2xl font-bold text-green-600">{formatPKR(totalSalariesPaid)}</p><p className="text-xs text-muted-foreground">All completed salaries</p></CardContent></Card>
                                <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Outstanding</p><p className="text-2xl font-bold text-yellow-600">{formatPKR(totalSalariesOutstanding)}</p><p className="text-xs text-muted-foreground">Pending payments</p></CardContent></Card>
                            </div>

                            {/* Create/Update Salary Form */}
                            <Card>
                                <CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" />Create/Update Salary Record</CardTitle><CardDescription>Record monthly salary with bonuses and deductions</CardDescription></CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <Label>Salary Month</Label>
                                            <Input type="month" value={salaryMonth} onChange={(e) => setSalaryMonth(e.target.value)} />
                                        </div>
                                        <div>
                                            <Label>Basic Salary</Label>
                                            <Input type="number" value={employee?.salary || 0} disabled className="bg-muted" />
                                        </div>
                                        <div>
                                            <Label>Bonuses (+)</Label>
                                            <Input type="number" value={salaryBonuses} onChange={(e) => setSalaryBonuses(parseFloat(e.target.value) || 0)} placeholder="0" />
                                            <p className="text-xs text-muted-foreground mt-1">Include overtime, performance bonus, etc.</p>
                                        </div>
                                        <div>
                                            <Label>Deductions (-)</Label>
                                            <Input type="number" value={salaryDeductions} onChange={(e) => setSalaryDeductions(parseFloat(e.target.value) || 0)} placeholder="0" />
                                            <p className="text-xs text-muted-foreground mt-1">Include advance deductions, penalties, etc.</p>
                                        </div>
                                        <div>
                                            <Label>Status</Label>
                                            <Select value={salaryStatus} onValueChange={(value: any) => setSalaryStatus(value)}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="pending">Pending</SelectItem>
                                                    <SelectItem value="paid">Paid</SelectItem>
                                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>Notes (Optional)</Label>
                                            <Input value={salaryNotes} onChange={(e) => setSalaryNotes(e.target.value)} placeholder="Additional notes..." />
                                        </div>
                                    </div>

                                    <div className="bg-primary/10 rounded-lg p-4 mb-4">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Net Salary Calculation</p>
                                                <p className="text-lg font-semibold">
                                                    {formatPKR(employee?.salary || 0)} + {formatPKR(salaryBonuses)} - {formatPKR(salaryDeductions)} = 
                                                    <span className="text-secondary ml-2">{formatPKR(netSalaryCalculation)}</span>
                                                </p>
                                            </div>
                                            <Button onClick={handleCreateSalary} disabled={createSalaryMutation.isPending}>
                                                {createSalaryMutation.isPending ? "Processing..." : "Save Salary Record"}
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Salary History */}
                            <Card>
                                <CardHeader><CardTitle>Salary History</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-4 mb-6">
                                        <div>
                                            <Label>Filter by Month</Label>
                                            <Input type="month" value={salaryFilterMonth} onChange={(e) => setSalaryFilterMonth(e.target.value)} className="w-48" />
                                        </div>
                                    </div>

                                    {filteredSalaries.length === 0 ? (
                                        <div className="text-center py-8"><Banknote className="h-12 w-12 mx-auto mb-2" /><p>No salary records for {salaryFilterMonth}</p></div>
                                    ) : (
                                        <div className="space-y-3">
                                            {paginatedSalaries.map((salary) => (
                                                <div key={salary.id} className="flex flex-col sm:flex-row justify-between p-4 border rounded-lg">
                                                    <div>
                                                        <p className="font-medium">{format(new Date(salary.year, parseInt(salary.month) - 1, 1), "MMMM yyyy")}</p>
                                                        <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground mt-1">
                                                            <span>Basic: {formatPKR(salary.basicSalary)}</span>
                                                            <span>Bonus: {formatPKR(salary.bonuses)}</span>
                                                            <span>Deduction: {formatPKR(salary.deductions)}</span>
                                                        </div>
                                                        {salary.notes && <p className="text-xs text-muted-foreground mt-1">Note: {salary.notes}</p>}
                                                    </div>
                                                    <div className="text-right mt-2 sm:mt-0">
                                                        <p className="text-lg font-bold text-secondary">{formatPKR(salary.netSalary)}</p>
                                                        <Badge className={salary.status === "paid" ? "bg-green-100 text-green-800" : salary.status === "cancelled" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}>
                                                            {salary.status.toUpperCase()}
                                                        </Badge>
                                                        {salary.paymentDate && (
                                                            <p className="text-xs text-muted-foreground mt-1">Paid: {format(new Date(salary.paymentDate), 'dd/MM/yyyy')}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {totalSalaryPages > 1 && (
                                        <div className="flex justify-between items-center mt-4">
                                            <div className="text-sm text-muted-foreground">
                                                Showing {((salaryPage - 1) * salaryPageSize) + 1} to {Math.min(salaryPage * salaryPageSize, filteredSalaries.length)} of {filteredSalaries.length}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" onClick={() => setSalaryPage(p => Math.max(1, p - 1))} disabled={salaryPage === 1}>Previous</Button>
                                                <span className="px-4 text-sm">Page {salaryPage} of {totalSalaryPages}</span>
                                                <Button variant="outline" size="sm" onClick={() => setSalaryPage(p => Math.min(totalSalaryPages, p + 1))} disabled={salaryPage === totalSalaryPages}>Next</Button>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    )}

                    {/* WAGES TAB - For non-monthly employees */}
                    {!isMonthlyEmployee && (
                        <TabsContent value="wages" className="space-y-4">
                            {/* Employee Info Card */}
                            <Card>
            <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground">Payment Type</p>
                        <p className="font-medium capitalize">
                            {employee?.payment_type === 'contract' ? 'Contractor' : employee?.payment_type}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Rate</p>
                        <p className="font-medium">
                            {employee?.payment_type === 'contract' && formatPKR(employee?.contract_amount || 0) + ' total'}
                            {employee?.payment_type === 'fixed' && formatPKR(employee?.salary || 0) + '/month'}
                            {employee?.payment_type === 'daily' && formatPKR(employee?.daily_rate || 0) + '/day'}
                            {employee?.payment_type === 'weekly' && formatPKR(employee?.weekly_rate || 0) + '/week'}
                            {employee?.payment_type === 'hourly' && formatPKR(employee?.hourly_rate || 0) + '/hour'}
                        </p>
                        {employee?.payment_type === 'contract' && employee.contract_start_date && employee.contract_end_date && (
                            <p className="text-xs text-muted-foreground">
                                {format(new Date(employee.contract_start_date), 'dd/MM/yyyy')} - {format(new Date(employee.contract_end_date), 'dd/MM/yyyy')}
                            </p>
                        )}
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Total Paid</p>
                        <p className="font-medium text-green-600">{formatPKR(totalPaidWages)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Outstanding Advances</p>
                        <p className="font-medium text-red-600">{formatPKR(totalAdvances)}</p>
                    </div>
                </div>
            </CardContent>
        </Card>

                            {/* Period Selection */}
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><Label>Period Start</Label><Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} /></div>
                                    <div><Label>Period End</Label><Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} /></div>
                                </div>

                                {/* Already Paid Dates Summary */}
                                {paidDates.length > 0 && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                        <p className="text-sm text-blue-700 font-medium mb-2">📅 Already Paid Dates:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {paidDates.slice(0, 10).map((date, idx) => (<Badge key={idx} variant="outline" className="bg-blue-100">{format(new Date(date), 'dd/MM/yyyy')}</Badge>))}
                                            {paidDates.length > 10 && (<Badge variant="outline">+{paidDates.length - 10} more</Badge>)}
                                        </div>
                                    </div>
                                )}

                                {/* Paid Days Warning */}
                                {(() => {
                                    const paidDaysInSelected = getPaidDaysInPeriod(periodStart, periodEnd);
                                    const totalDays = getDaysInPeriod(periodStart, periodEnd);
                                    if (paidDaysInSelected.length > 0) {
                                        return (<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3"><div className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" /><div><p className="text-sm font-medium text-yellow-800">⚠️ Already Paid: {paidDaysInSelected.length} of {totalDays} days</p><p className="text-xs text-yellow-700 mt-1">Dates: {paidDaysInSelected.map(d => format(new Date(d), 'dd/MM')).join(', ')}</p><p className="text-sm text-green-700 mt-2">✅ Will pay for: {unpaidDaysCount} unpaid day(s)</p></div></div></div>);
                                    }
                                    return null;
                                })()}

                                {/* Period Fully Paid Warning */}
                                {unpaidDaysCount === 0 && periodStart && periodEnd && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3"><div className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" /><div><p className="text-sm font-medium text-red-800">❌ This entire period has already been paid!</p><p className="text-xs text-red-600 mt-1">Select a different date range to make additional payments.</p></div></div></div>
                                )}
                            </div>

                            {/* Calculated Amount Card */}
                            <Card className="bg-blue-50">
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-center">
                                        <div><p className="text-sm text-muted-foreground">Calculated Wages</p><p className="text-2xl font-bold text-blue-600">{formatPKR(calculatedWage)}</p><p className="text-xs text-muted-foreground">Based on {employee?.payment_type} rate for {unpaidDaysCount} unpaid day(s)</p></div>
                                        <Button onClick={() => setPaymentAmount(calculatedWage)} variant="outline" disabled={unpaidDaysCount === 0}>Use Calculated Amount</Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Payment Form */}
                            <div className="space-y-4">
                                <div><Label>Payment Amount</Label><Input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)} placeholder="Enter amount to pay" /></div>
                                <div><Label>Payment Method</Label><Select value={paymentMethod} onValueChange={setPaymentMethod}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">💵 Cash</SelectItem><SelectItem value="card">💳 Card</SelectItem><SelectItem value="easypaisa">📱 EasyPaisa</SelectItem><SelectItem value="jazzcash">📱 JazzCash</SelectItem><SelectItem value="bank">🏦 Bank Transfer</SelectItem></SelectContent></Select></div>
                                <div><Label>Notes (Optional)</Label><Textarea value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} placeholder="Add payment notes..." rows={2} /></div>
                                <Button onClick={handlePayWages} disabled={isSubmitting || paymentAmount <= 0 || unpaidDaysCount === 0} className="w-full">{isSubmitting ? "Processing..." : `Pay ${formatPKR(paymentAmount)} for ${unpaidDaysCount} day(s)`}</Button>
                            </div>
                        </TabsContent>
                    )}

                    {/* Advances Tab */}
                    <TabsContent value="advances" className="space-y-6">
                        {/* Scheduled Deductions Section */}
                        {salaryDeductionsData.filter((d: SalaryDeduction) => d.status !== 'completed' && d.status !== 'cancelled').length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-lg">📅 Scheduled Salary Deductions</h3><Button variant="outline" size="sm" onClick={() => setShowScheduleList(true)}>View All ({salaryDeductionsData.filter((d: SalaryDeduction) => d.status !== 'completed' && d.status !== 'cancelled').length})</Button></div>
                                {deductionAlert && (<div className={`mb-4 p-3 rounded-lg ${deductionAlert.type === 'warning' ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' : deductionAlert.type === 'info' ? 'bg-blue-50 border border-blue-200 text-blue-800' : 'bg-green-50 border border-green-200 text-green-800'}`}>{deductionAlert.message}</div>)}
                                <div className="space-y-2">
                                    {salaryDeductionsData.filter((d: SalaryDeduction) => d.status !== 'completed' && d.status !== 'cancelled').slice(0, 3).map((deduction: SalaryDeduction) => {
                                        const isOverdue = deduction.deduction_month && new Date(deduction.deduction_month) < new Date();
                                        return (<div key={deduction.id} className={`border rounded-lg p-3 ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}><div className="flex justify-between items-start"><div><p className="font-medium">{deduction.deduction_type === 'installments' ? `Installment ${Math.floor(deduction.deducted_so_far / (deduction.monthly_amount || 1)) + 1}/${deduction.total_months}` : 'One-time Deduction'}</p><p className="text-sm">Amount: {formatPKR(deduction.deduction_type === 'installments' ? deduction.monthly_amount : deduction.amount)}</p>{deduction.deduction_month && (<p className="text-xs text-muted-foreground">Deduction Month: {format(new Date(deduction.deduction_month), 'MMMM yyyy')}{isOverdue && <span className="text-red-600 ml-2">(Overdue!)</span>}</p>)}</div><Badge className={isOverdue ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}>{isOverdue ? 'Overdue' : 'Scheduled'}</Badge></div></div>);
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Active Advances Section */}
                        <div>
                            <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-lg">💰 Active Advances</h3><Badge className="bg-yellow-100 text-yellow-800">Total Outstanding: {formatPKR(advances.filter(a => a.status !== 'completed').reduce((sum, a) => sum + a.remaining_amount, 0))}</Badge></div>
                            {advances.filter(a => a.status !== 'completed').length === 0 ? (<div className="text-center py-8 bg-muted/30 rounded-lg"><CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" /><p className="text-muted-foreground">No active advances</p><p className="text-xs text-muted-foreground">Record a new advance using the form below</p></div>) : (
                                <div className="space-y-3">
                                    {advances.filter(a => a.status !== 'completed').map((advance) => (<div key={advance.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow"><div className="flex justify-between items-start flex-wrap gap-3"><div className="flex-1"><div className="flex items-center gap-2 flex-wrap"><p className="font-medium">{advance.reason}</p>{advance.expected_deduction_date && new Date(advance.expected_deduction_date) < new Date() && (<Badge variant="destructive" className="text-xs">Overdue</Badge>)}</div><p className="text-sm text-muted-foreground mt-1">📅 Taken on: {format(new Date(advance.advance_date), 'dd/MM/yyyy')}</p>{advance.expected_deduction_date && (<p className="text-sm text-muted-foreground">📅 Expected Deduction: {format(new Date(advance.expected_deduction_date), 'dd/MM/yyyy')}</p>)}{advance.paid_amount > 0 && (<p className="text-sm text-green-600 mt-1">Already Paid: {formatPKR(advance.paid_amount)}</p>)}</div><div className="text-right"><p className="text-2xl font-bold text-red-600">{formatPKR(advance.remaining_amount)}</p><Badge className={advance.status === 'pending' ? 'bg-red-100 text-red-800' : advance.status === 'partially_paid' ? 'bg-yellow-100 text-yellow-800' : advance.status === 'scheduled_deduction' ? 'bg-blue-100 text-blue-800' : advance.status === 'scheduled_installments' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}>{advance.status === 'pending' ? 'Pending' : advance.status === 'partially_paid' ? 'Partially Paid' : advance.status === 'scheduled_deduction' ? 'Scheduled Deduction' : advance.status === 'scheduled_installments' ? 'Installment Plan' : 'Completed'}</Badge></div></div><div className="flex gap-2 mt-4 pt-3 border-t"><Button size="sm" variant="outline" onClick={() => { setSelectedAdvance(advance); setShowDeductFromSalary(true); }} className="flex-1">💰 Deduct from Salary</Button><Button size="sm" variant="outline" onClick={() => { setSelectedAdvance(advance); setShowRecordRepayment(true); setRepaymentAmount(advance.remaining_amount); }} className="flex-1">💵 Record Repayment</Button></div></div>))}
                                </div>
                            )}
                        </div>

                        {/* New Advance Form */}
                        <Card>
                            <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" />Record New Advance / Debit</CardTitle><CardDescription>Record money taken by employee as advance. This will be deducted from future salary or repaid separately.</CardDescription></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><Label className="text-sm font-medium">Advance Amount *</Label><Input type="number" value={newAdvanceAmount} onChange={(e) => setNewAdvanceAmount(parseFloat(e.target.value) || 0)} placeholder="Enter amount" className="mt-1" /></div><div><Label className="text-sm font-medium">Expected Deduction Date (Optional)</Label><Input type="date" value={newAdvanceExpectedDate} onChange={(e) => setNewAdvanceExpectedDate(e.target.value)} className="mt-1" /><p className="text-xs text-muted-foreground mt-1">When this advance should be deducted from salary</p></div></div>
                                <div><Label className="text-sm font-medium">Reason / Purpose *</Label><Textarea value={newAdvanceReason} onChange={(e) => setNewAdvanceReason(e.target.value)} placeholder="e.g., Medical emergency, Family function, Advance salary, Tool purchase" rows={2} className="mt-1" /></div>
                                <div><Label className="text-sm font-medium">Notes (Optional)</Label><Input value={newAdvanceNotes} onChange={(e) => setNewAdvanceNotes(e.target.value)} placeholder="Additional notes..." className="mt-1" /></div>
                                <Button onClick={handleCreateAdvance} disabled={isSubmitting || newAdvanceAmount <= 0 || !newAdvanceReason} className="w-full">{isSubmitting ? "Processing..." : `Record Advance of ${formatPKR(newAdvanceAmount)}`}</Button>
                            </CardContent>
                        </Card>

                        {/* Advance History */}
                        <div><div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-lg">📜 Repayment History</h3><Badge variant="outline">Total Settled: {formatPKR(advances.filter(a => a.status === 'completed').reduce((sum, a) => sum + a.amount, 0))}</Badge></div>{advances.filter(a => a.status === 'completed').length === 0 ? (<div className="text-center py-8 bg-muted/30 rounded-lg"><p className="text-muted-foreground">No repayment history</p><p className="text-xs text-muted-foreground">Settled advances will appear here</p></div>) : (<div className="space-y-2">{advances.filter(a => a.status === 'completed').map((advance) => (<div key={advance.id} className="border rounded-lg p-3 bg-green-50/30"><div className="flex justify-between items-start flex-wrap gap-2"><div><p className="font-medium">{advance.reason}</p><p className="text-xs text-muted-foreground">Taken: {format(new Date(advance.advance_date), 'dd/MM/yyyy')}</p>{advance.paid_amount > 0 && (<p className="text-xs text-green-600">Repaid: {formatPKR(advance.paid_amount)}</p>)}</div><div className="text-right"><p className="font-bold text-green-600">{formatPKR(advance.amount)}</p><Badge className="bg-green-100 text-green-800">Settled</Badge></div></div></div>))}</div>)}</div>

                        {/* Deduct from Salary Dialog */}
                        <Dialog open={showDeductFromSalary} onOpenChange={setShowDeductFromSalary}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>💰 Deduct from Salary</DialogTitle><DialogDescription>Choose how this advance should be deducted from salary.</DialogDescription></DialogHeader>{selectedAdvance && (<div className="space-y-4"><div className="bg-yellow-50 p-4 rounded-lg"><p className="text-sm text-yellow-800">Advance Details:</p><p className="font-semibold">{selectedAdvance.reason}</p><p className="text-sm">Outstanding: {formatPKR(selectedAdvance.remaining_amount)}</p><p className="text-xs text-muted-foreground">Taken on: {format(new Date(selectedAdvance.advance_date), 'dd/MM/yyyy')}</p></div><div><Label>Deduction Type</Label><Select value={deductionType} onValueChange={setDeductionType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="current_month">Current Month Salary</SelectItem><SelectItem value="next_month">Next Month Salary</SelectItem><SelectItem value="specific_month">Specific Month</SelectItem><SelectItem value="installments">Monthly Installments</SelectItem></SelectContent></Select></div>{deductionType === 'specific_month' && (<div><Label>Select Month</Label><Input type="month" value={deductionMonth} onChange={(e) => setDeductionMonth(e.target.value)} /><p className="text-xs text-muted-foreground mt-1">Advance will be deducted in this month's salary</p></div>)}{deductionType === 'installments' && (<div className="grid grid-cols-2 gap-4"><div><Label>Amount per Month</Label><Input type="number" value={installmentAmount} onChange={(e) => setInstallmentAmount(parseFloat(e.target.value) || 0)} /></div><div><Label>Number of Months</Label><Input type="number" value={installmentMonths} onChange={(e) => setInstallmentMonths(parseInt(e.target.value) || 1)} /></div><div className="col-span-2"><p className="text-xs text-muted-foreground">Will deduct {formatPKR(installmentAmount)} for {installmentMonths} month(s)</p><p className="text-xs text-green-600">Total: {formatPKR(installmentAmount * installmentMonths)}</p></div></div>)}<div><Label>Notes (Optional)</Label><Textarea value={deductionNotes} onChange={(e) => setDeductionNotes(e.target.value)} placeholder="e.g., Deduct from January 2025 salary" rows={2} /></div></div>)}<DialogFooter><Button variant="outline" onClick={() => setShowDeductFromSalary(false)}>Cancel</Button><Button onClick={handleScheduleDeduction} className="bg-yellow-600 hover:bg-yellow-700">Schedule Deduction</Button></DialogFooter></DialogContent></Dialog>

                        {/* Record Repayment Dialog */}
                        <Dialog open={showRecordRepayment} onOpenChange={setShowRecordRepayment}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>💵 Record Repayment</DialogTitle><DialogDescription>Record cash repayment from employee for this advance.</DialogDescription></DialogHeader>{selectedAdvance && (<div className="space-y-4"><div className="bg-green-50 p-4 rounded-lg"><p className="text-sm text-green-800">Outstanding Amount: {formatPKR(selectedAdvance.remaining_amount)}</p><p className="text-xs text-muted-foreground">Reason: {selectedAdvance.reason}</p></div><div><Label>Repayment Amount *</Label><Input type="number" value={repaymentAmount} onChange={(e) => setRepaymentAmount(Math.min(parseFloat(e.target.value) || 0, selectedAdvance.remaining_amount))} max={selectedAdvance.remaining_amount} className="mt-1" /><p className="text-xs text-muted-foreground mt-1">Maximum: {formatPKR(selectedAdvance.remaining_amount)}</p></div><div><Label>Payment Method</Label><Select value={repaymentMethod} onValueChange={setRepaymentMethod}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">💵 Cash</SelectItem><SelectItem value="easypaisa">📱 EasyPaisa</SelectItem><SelectItem value="jazzcash">📱 JazzCash</SelectItem><SelectItem value="bank">🏦 Bank Transfer</SelectItem></SelectContent></Select></div><div><Label>Notes (Optional)</Label><Textarea value={repaymentNotes} onChange={(e) => setRepaymentNotes(e.target.value)} placeholder="Add notes about this repayment..." rows={2} /></div></div>)}<DialogFooter><Button variant="outline" onClick={() => setShowRecordRepayment(false)}>Cancel</Button><Button onClick={handleRecordRepayment} disabled={repaymentAmount <= 0}>Record Repayment of {formatPKR(repaymentAmount)}</Button></DialogFooter></DialogContent></Dialog>

                        {/* Schedule List Dialog - Keep existing code */}
                        <Dialog open={showScheduleList} onOpenChange={setShowScheduleList}><DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>Salary Deduction Schedule</DialogTitle><DialogDescription>Scheduled deductions from {employee?.name}'s salary</DialogDescription></DialogHeader><div className="space-y-4">{salaryDeductionsData.filter((d: SalaryDeduction) => d.status !== 'cancelled').length === 0 ? (<div className="text-center py-8"><CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" /><p>No active deduction schedules</p></div>) : (salaryDeductionsData.filter((d: SalaryDeduction) => d.status !== 'cancelled').map((deduction: SalaryDeduction) => { const isOverdue = deduction.deduction_month && new Date(deduction.deduction_month) < new Date(); const progress = deduction.total_months > 0 ? (deduction.deducted_so_far / deduction.amount) * 100 : (deduction.status === 'completed' ? 100 : 0); return (<div key={deduction.id} className={`border rounded-lg p-4 ${isOverdue ? 'bg-red-50' : 'bg-white'}`}><div className="flex justify-between items-start mb-3"><div><div className="flex items-center gap-2"><p className="font-semibold">{deduction.deduction_type === 'installments' ? `Installment Plan (${deduction.total_months} months)` : 'One-time Deduction'}</p><Badge className={deduction.status === 'completed' ? 'bg-green-500' : isOverdue ? 'bg-red-500' : deduction.status === 'active' ? 'bg-blue-500' : 'bg-yellow-500'}>{deduction.status === 'completed' ? 'Completed' : isOverdue ? 'Overdue' : deduction.status === 'active' ? 'Active' : 'Scheduled'}</Badge></div><p className="text-sm text-muted-foreground mt-1">{deduction.notes || 'No additional notes'}</p></div><div className="flex gap-2"><Button size="sm" variant="ghost" onClick={() => { setEditingSchedule(deduction); setShowEditSchedule(true); }}><Edit className="h-4 w-4" /></Button><Button size="sm" variant="ghost" className="text-red-500" onClick={() => { setSelectedSchedule(deduction); setShowDeleteConfirm(true); }}><Trash2 className="h-4 w-4" /></Button></div></div><div className="grid grid-cols-2 gap-4 text-sm mb-3"><div><p className="text-muted-foreground">Amount</p><p className="font-medium">{formatPKR(deduction.amount)}</p></div>{deduction.deduction_month && (<div><p className="text-muted-foreground">Deduction Month</p><p className={`font-medium ${isOverdue ? 'text-red-600' : ''}`}>{format(new Date(deduction.deduction_month), 'MMMM yyyy')}{isOverdue && ' (Overdue)'}</p></div>)}{deduction.monthly_amount > 0 && (<><div><p className="text-muted-foreground">Monthly Amount</p><p className="font-medium">{formatPKR(deduction.monthly_amount)}</p></div><div><p className="text-muted-foreground">Progress</p><div className="w-full bg-gray-200 rounded-full h-2 mt-1"><div className="bg-green-500 rounded-full h-2 transition-all" style={{ width: `${progress}%` }} /></div><p className="text-xs mt-1">{Math.round(progress)}% completed</p></div></>)}</div>{deduction.status !== 'completed' && deduction.status !== 'cancelled' && (<div className="flex gap-2 pt-3 border-t"><Button size="sm" variant="outline" className="flex-1" onClick={() => { setSelectedSchedule(deduction); setShowMarkAsDeducted(true); }}>Mark as Deducted This Month</Button><Button size="sm" variant="outline" className="flex-1" onClick={() => { setSelectedSchedule(deduction); setShowCancelSchedule(true); }}>Cancel Schedule</Button></div>)}</div>); }))}</div><DialogFooter><Button variant="outline" onClick={() => setShowScheduleList(false)}>Close</Button></DialogFooter></DialogContent></Dialog>

                        {/* Edit Schedule Dialog */}
                        <Dialog open={showEditSchedule} onOpenChange={setShowEditSchedule}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Edit Deduction Schedule</DialogTitle></DialogHeader>{editingSchedule && (<div className="space-y-4"><div><Label>Deduction Month</Label><Input type="month" value={editingSchedule.deduction_month || ''} onChange={(e) => setEditingSchedule({ ...editingSchedule, deduction_month: e.target.value })} /></div>{editingSchedule.deduction_type === 'installments' && (<><div><Label>Monthly Amount</Label><Input type="number" value={editingSchedule.monthly_amount} onChange={(e) => setEditingSchedule({ ...editingSchedule, monthly_amount: parseFloat(e.target.value) || 0 })} /></div><div><Label>Total Months</Label><Input type="number" value={editingSchedule.total_months} onChange={(e) => setEditingSchedule({ ...editingSchedule, total_months: parseInt(e.target.value) || 1 })} /></div></>)}<div><Label>Status</Label><Select value={editingSchedule.status} onValueChange={(value) => setEditingSchedule({ ...editingSchedule, status: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="paused">Paused</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent></Select></div><div><Label>Notes</Label><Textarea value={editingSchedule.notes || ''} onChange={(e) => setEditingSchedule({ ...editingSchedule, notes: e.target.value })} rows={2} /></div></div>)}<DialogFooter><Button variant="outline" onClick={() => setShowEditSchedule(false)}>Cancel</Button><Button onClick={handleUpdateSchedule}>Save Changes</Button></DialogFooter></DialogContent></Dialog>

                        {/* Mark as Deducted Dialog */}
                        <Dialog open={showMarkAsDeducted} onOpenChange={setShowMarkAsDeducted}><DialogContent><DialogHeader><DialogTitle>Mark as Deducted</DialogTitle></DialogHeader><p>Confirm that this amount has been deducted from the employee's salary?</p><DialogFooter><Button variant="outline" onClick={() => setShowMarkAsDeducted(false)}>Cancel</Button><Button onClick={handleMarkAsDeducted}>Confirm Deduction</Button></DialogFooter></DialogContent></Dialog>

                        {/* Cancel Schedule Dialog */}
                        <Dialog open={showCancelSchedule} onOpenChange={setShowCancelSchedule}><DialogContent><DialogHeader><DialogTitle>Cancel Deduction Schedule</DialogTitle></DialogHeader><p>Are you sure you want to cancel this deduction schedule? The advance will remain pending.</p><DialogFooter><Button variant="outline" onClick={() => setShowCancelSchedule(false)}>No, Keep It</Button><Button variant="destructive" onClick={handleCancelSchedule}>Yes, Cancel Schedule</Button></DialogFooter></DialogContent></Dialog>

                        {/* Delete Confirm Dialog */}
                        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}><DialogContent><DialogHeader><DialogTitle>Delete Schedule</DialogTitle></DialogHeader><p>Are you sure you want to delete this schedule? This action cannot be undone.</p><DialogFooter><Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button><Button variant="destructive" onClick={handleDeleteSchedule}>Delete</Button></DialogFooter></DialogContent></Dialog>
                    </TabsContent>

                    {/* Payment History Tab */}
                    <TabsContent value="history" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <Card className="bg-green-50"><CardContent className="p-4"><p className="text-sm text-muted-foreground">💰 Total Salaries Paid</p><p className="text-2xl font-bold text-green-600">{formatPKR(totalSalariesPaid)}</p></CardContent></Card>
                            <Card className="bg-blue-50"><CardContent className="p-4"><p className="text-sm text-muted-foreground">⏰ Total Wages & Extra Work</p><p className="text-2xl font-bold text-blue-600">{formatPKR(totalPaidWages)}</p></CardContent></Card>
                            <Card className="bg-purple-50"><CardContent className="p-4"><p className="text-sm text-muted-foreground">📊 Total Employee Cost</p><p className="text-2xl font-bold text-purple-600">{formatPKR(totalEmployeeCost)}</p></CardContent></Card>
                        </div>

                        {/* Filters */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <div className="relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by notes..." value={paymentHistorySearch} onChange={(e) => { setPaymentHistorySearch(e.target.value); setPaymentHistoryPage(1); }} className="pl-10" /></div>
                            <Select value={paymentHistoryFilter} onValueChange={(v) => { setPaymentHistoryFilter(v); setPaymentHistoryPage(1); }}><SelectTrigger><SelectValue placeholder="Filter by type" /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="salary">Salary</SelectItem><SelectItem value="daily">Daily Wages</SelectItem><SelectItem value="weekly">Weekly Wages</SelectItem><SelectItem value="extra_work">Extra Work</SelectItem><SelectItem value="advance_repayment">Advance Repayment</SelectItem></SelectContent></Select>
                            <Input type="date" placeholder="From Date" value={paymentHistoryDateFrom} onChange={(e) => { setPaymentHistoryDateFrom(e.target.value); setPaymentHistoryPage(1); }} />
                            <Input type="date" placeholder="To Date" value={paymentHistoryDateTo} onChange={(e) => { setPaymentHistoryDateTo(e.target.value); setPaymentHistoryPage(1); }} />
                        </div>
                        
                        {filteredPayments.length === 0 ? (
                            <div className="text-center py-8"><Banknote className="h-12 w-12 mx-auto mb-2" /><p>No payment records found</p></div>
                        ) : (
                            <div className="space-y-3">
                                {paginatedPayments.map((payment) => {
                                    let displayDate = "Date not set";
                                    if (payment.payment_date) {
                                        try {
                                            const date = new Date(payment.payment_date);
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
                                                        {payment.payment_type === 'salary' ? '📅 Monthly Salary' :
                                                         payment.payment_type === 'daily' ? '📆 Daily Wages' :
                                                         payment.payment_type === 'weekly' ? '📆 Weekly Wages' :
                                                         payment.payment_type === 'extra_work' ? '⏰ Extra Work' :
                                                         payment.payment_type === 'advance_repayment' ? '💰 Advance Repayment' : '💰 Payment'}
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

                        {totalPaymentPages > 1 && (<div className="flex items-center justify-between mt-4"><div className="text-sm text-muted-foreground">Showing {((paymentHistoryPage - 1) * itemsPerPage) + 1} to {Math.min(paymentHistoryPage * itemsPerPage, filteredPayments.length)} of {filteredPayments.length} records</div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setPaymentHistoryPage(p => Math.max(1, p - 1))} disabled={paymentHistoryPage === 1}><ChevronLeft className="h-4 w-4" /> Previous</Button><span className="flex items-center px-4 text-sm">Page {paymentHistoryPage} of {totalPaymentPages}</span><Button variant="outline" size="sm" onClick={() => setPaymentHistoryPage(p => Math.min(totalPaymentPages, p + 1))} disabled={paymentHistoryPage === totalPaymentPages}>Next <ChevronRight className="h-4 w-4" /></Button></div></div>)}
                    </TabsContent>

                    {/* Extra Work Tab */}
                    <TabsContent value="extrawork" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Clock className="h-5 w-5" />
                                    Extra Work / Overtime
                                </CardTitle>
                                <CardDescription>Record extra hours or additional work beyond regular schedule</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div>
                                        <Label>Extra Date</Label>
                                        <Input type="date" value={extraWorkDate} onChange={(e) => setExtraWorkDate(e.target.value)} />
                                    </div>
                                    <div>
                                        <Label>Extra Hours</Label>
                                        <Input type="number" step="0.5" value={extraHours} onChange={(e) => setExtraHours(parseFloat(e.target.value) || 0)} placeholder="e.g., 2.5 hours" />
                                        <p className="text-xs text-muted-foreground mt-1">Rate: {formatPKR(hourlyRate)}/hour</p>
                                    </div>
                                    <div>
                                        <Label>Extra Amount</Label>
                                        <Input type="number" value={extraAmount} onChange={(e) => setExtraAmount(parseFloat(e.target.value) || 0)} placeholder="Or enter amount directly" />
                                    </div>
                                </div>
                                <div>
                                    <Label>Reason for Extra Work</Label>
                                    <Input value={extraWorkReason} onChange={(e) => setExtraWorkReason(e.target.value)} placeholder="e.g., Overtime, Holiday work, Special project" className="mb-3" />
                                </div>
                                <div>
                                    <Label>Payment Method</Label>
                                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="cash">💵 Cash</SelectItem>
                                            <SelectItem value="card">💳 Card</SelectItem>
                                            <SelectItem value="easypaisa">📱 EasyPaisa</SelectItem>
                                            <SelectItem value="jazzcash">📱 JazzCash</SelectItem>
                                            <SelectItem value="bank">🏦 Bank Transfer</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button onClick={handleAddExtraWork} disabled={isSubmitting || (extraHours <= 0 && extraAmount <= 0)} className="w-full mt-4">
                                    + Add Extra Work for {format(new Date(extraWorkDate), 'dd/MM/yyyy')}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Recent Extra Work List */}
                        {extraWorkRecords.length > 0 && (
                            <div>
                                <h4 className="font-medium mb-2">Recent Extra Work Records</h4>
                                <div className="space-y-2">
                                    {extraWorkRecords.map((record) => (
                                        <div key={record.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                                            <div>
                                                <p className="font-medium">{record.description || 'Extra Work'}</p>
                                                <p className="text-xs text-muted-foreground">{record.payment_date ? format(new Date(record.payment_date), 'dd/MM/yyyy') : 'Date not set'} • {record.hours || '-'} hours</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold text-green-600">{formatPKR(record.amount)}</p>
                                                <div className="flex gap-1 mt-1">
                                                    <Button size="sm" variant="ghost" onClick={() => handleEditExtraWork(record)}><Edit className="h-3 w-3" /></Button>
                                                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDeleteExtraWork(record.id)}><Trash2 className="h-3 w-3" /></Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>

            {/* Edit Extra Work Dialog */}
            <Dialog open={showEditExtraWork} onOpenChange={setShowEditExtraWork}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Edit Extra Work</DialogTitle></DialogHeader>
                    {editingExtraWork && (
                        <div className="space-y-4">
                            <div><Label>Date</Label><Input type="date" value={editingExtraWork.payment_date ? editingExtraWork.payment_date.split('T')[0] : ''} onChange={(e) => setEditingExtraWork({ ...editingExtraWork, payment_date: e.target.value })} /></div>
                            <div><Label>Amount</Label><Input type="number" value={editingExtraWork.amount || 0} onChange={(e) => setEditingExtraWork({ ...editingExtraWork, amount: parseFloat(e.target.value) || 0 })} /></div>
                            <div><Label>Description / Reason</Label><Textarea value={editingExtraWork.description || ''} onChange={(e) => setEditingExtraWork({ ...editingExtraWork, description: e.target.value })} rows={2} /></div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditExtraWork(false)}>Cancel</Button>
                        <Button onClick={handleUpdateExtraWork}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
}