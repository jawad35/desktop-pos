import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatPKR } from "@/lib/currency";
import { format } from "date-fns";
import { Users, Plus, Eye, Edit, Trash2, Phone, Banknote, Share, Keyboard, ChevronLeft, ChevronRight } from "lucide-react";
import { useHeader } from "@/contexts/HeaderContext";
import { useToast } from "@/hooks/use-toast";
import { api } from "../../services/electron-api";
import { KeyboardShortcutsModal } from "../../components/modals/KeyboardShortcutsModal";
import { useLocation } from "wouter";
import { useNavigation } from "../../App";

// Storage keys
const STORAGE_KEYS = {
    EMPLOYEES_PAGE: 'employees_current_page',
    EMPLOYEES_FILTERS: 'employees_filters',
    EMPLOYEES_SCROLL_POSITION: 'employees_scroll_position'
};

interface Employee {
    id: string;
    name: string;
    phone: string;
    salary: number;
    salary_type: 'monthly' | 'weekly';
    payment_method: 'cash' | 'easypaisa' | 'bank' | 'jazzcash' | "card" | 'check';
    shift: 'day' | 'night';
    employee_type: 'manager' | 'labor' | 'cashier' | 'salesman' | 'other';
    join_date: string;
    leave_date?: string;
    is_active: number;
}

export default function Employees() {
    const pageSize = 50;
    const [location] = useLocation();
    const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);
    const [showShortcuts, setShowShortcuts] = useState(false);
    const { toast } = useToast();

    // Load saved state
    const loadSavedPage = () => {
        try {
            const savedPage = localStorage.getItem(STORAGE_KEYS.EMPLOYEES_PAGE);
            const page = savedPage ? parseInt(savedPage, 10) : 1;
            return isNaN(page) ? 1 : Math.max(1, page);
        } catch (error) {
            return 1;
        }
    };

    const loadSavedFilters = () => {
        try {
            const savedFilters = localStorage.getItem(STORAGE_KEYS.EMPLOYEES_FILTERS);
            if (savedFilters) {
                const parsed = JSON.parse(savedFilters);
                return {
                    search: parsed.search || "",
                    employeeType: parsed.employeeType || "",
                    shift: parsed.shift || "",
                    status: parsed.status || "",
                };
            }
        } catch (error) { }
        return {
            search: "",
            employeeType: "",
            shift: "",
            status: "",
        };
    };

    const [filters, setFilters] = useState(loadSavedFilters);
    const [currentPage, setCurrentPage] = useState(loadSavedPage);
    const [allEmployeesData, setAllEmployeesData] = useState<Employee[]>([]);
    const [renderKey, setRenderKey] = useState(0);

    const mainContentRef = useRef<HTMLDivElement>(null);
    const isFirstLoadRef = useRef(true);

    // Fetch employees
    const { isLoading, refetch } = useQuery<Employee[]>({
        queryKey: ["employees", location],
        queryFn: async () => {
            const result = await api.getEmployees();
            let allEmployees: Employee[] = [];

            if (Array.isArray(result)) {
                allEmployees = result;
            } else if (result?.success && Array.isArray(result.data)) {
                allEmployees = result.data;
            }

            allEmployees.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setAllEmployeesData(allEmployees);
            setRenderKey(prev => prev + 1);
            return allEmployees;
        },
        refetchOnMount: true,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        staleTime: 0,
        cacheTime: 0,
    });

    // Apply filters
    const filteredData = useMemo(() => {
        if (allEmployeesData.length === 0) return [];

        let filtered = [...allEmployeesData];

        if (filters.search) {
            const search = filters.search.toLowerCase();
            filtered = filtered.filter(emp =>
                emp.name?.toLowerCase().includes(search) ||
                emp.phone?.toLowerCase().includes(search)
            );
        }

        if (filters.employeeType && filters.employeeType !== 'all') {
            filtered = filtered.filter(emp => emp.employee_type === filters.employeeType);
        }

        if (filters.shift && filters.shift !== 'all') {
            filtered = filtered.filter(emp => emp.shift === filters.shift);
        }

        if (filters.status && filters.status !== 'all') {
            filtered = filtered.filter(emp =>
                filters.status === 'active' ? emp.is_active === 1 : emp.is_active === 0
            );
        }

        return filtered;
    }, [allEmployeesData, filters]);

    // Apply pagination
    const paginatedData = useMemo(() => {
        if (filteredData.length === 0) return [];
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        return filteredData.slice(start, end);
    }, [filteredData, currentPage]);

    const totalPages = Math.ceil(filteredData.length / pageSize);
    const startIndex = filteredData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0;
    const endIndex = Math.min(currentPage * pageSize, filteredData.length);
    const totalCount = filteredData.length;

    // Page validation
    useEffect(() => {
        if (filteredData.length > 0) {
            const totalPagesCount = Math.ceil(filteredData.length / pageSize);
            if (isFirstLoadRef.current) {
                const savedPage = loadSavedPage();
                let validPage = savedPage;
                if (validPage > totalPagesCount) validPage = totalPagesCount;
                if (validPage < 1) validPage = 1;
                if (validPage !== currentPage) setCurrentPage(validPage);
                isFirstLoadRef.current = false;
            } else if (currentPage > totalPagesCount) {
                setCurrentPage(totalPagesCount);
            } else if (currentPage < 1) {
                setCurrentPage(1);
            }
        } else {
            if (currentPage !== 1) setCurrentPage(1);
        }
    }, [filteredData]);

    // Save to localStorage
    useEffect(() => {
        if (!isFirstLoadRef.current) {
            localStorage.setItem(STORAGE_KEYS.EMPLOYEES_PAGE, currentPage.toString());
            localStorage.setItem(STORAGE_KEYS.EMPLOYEES_FILTERS, JSON.stringify(filters));
        }
    }, [currentPage, filters]);

    // Restore scroll position
    useEffect(() => {
        if (!isLoading && paginatedData.length > 0 && mainContentRef.current && !isFirstLoadRef.current) {
            const savedScrollPosition = localStorage.getItem(STORAGE_KEYS.EMPLOYEES_SCROLL_POSITION);
            if (savedScrollPosition) {
                setTimeout(() => {
                    if (mainContentRef.current) {
                        mainContentRef.current.scrollTo({
                            top: parseInt(savedScrollPosition, 10),
                            behavior: 'auto'
                        });
                    }
                }, 100);
            }
        }
    }, [isLoading, paginatedData]);

    const handleScroll = useCallback(() => {
        if (mainContentRef.current && !isFirstLoadRef.current) {
            localStorage.setItem(STORAGE_KEYS.EMPLOYEES_SCROLL_POSITION, mainContentRef.current.scrollTop.toString());
        }
    }, []);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleShortcuts = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

            // Ctrl + A - Add Employee
            if (e.ctrlKey && e.key === 'a') {
                e.preventDefault();
                e.stopPropagation();
                setSelectedEmployee(null);
                setIsEmployeeModalOpen(true);
                return;
            }

            // Ctrl + C - Clear Filters
            if (e.ctrlKey && e.key === 'c') {
                e.preventDefault();
                e.stopPropagation();
                setFilters({ search: "", employeeType: "", shift: "", status: "" });
                setCurrentPage(1);
                toast({ title: "Filters Cleared", description: "All filters have been reset" });
                return;
            }

            // Ctrl + F - Focus Search
            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                e.stopPropagation();
                const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
                if (searchInput) {
                    searchInput.focus();
                }
                return;
            }

            // Arrow Left - Previous Page
            if (e.key === 'ArrowLeft' && currentPage > 1) {
                e.preventDefault();
                setCurrentPage(p => p - 1);
                return;
            }

            // Arrow Right - Next Page
            if (e.key === 'ArrowRight' && currentPage < totalPages) {
                e.preventDefault();
                setCurrentPage(p => p + 1);
                return;
            }
        };

        window.addEventListener('keydown', handleShortcuts);
        return () => window.removeEventListener('keydown', handleShortcuts);
    }, [currentPage, totalPages]);

    const deleteEmployeeMutation = useMutation({
        mutationFn: async (employeeId: string) => {
            const result = await api.deleteEmployee(employeeId);
            return result === true || result?.success === true;
        },
        onSuccess: () => {
            toast({ title: "Success", description: "Employee deleted successfully" });
            setIsDeleteDialogOpen(false);
            setEmployeeToDelete(null);
            refetch();
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const toggleEmployeeStatusMutation = useMutation({
        mutationFn: async ({ employeeId, isActive }: { employeeId: string; isActive: boolean }) => {
            const result = await api.updateEmployee(employeeId, { is_active: isActive ? 1 : 0 });
            return result;
        },
        onSuccess: (_, variables) => {
            const newStatus = variables.isActive ? 'activated' : 'deactivated';
            toast({ title: "Success", description: `Employee ${newStatus} successfully` });
            setIsDeleteDialogOpen(false);
            setEmployeeToDelete(null);
            refetch();
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const handleToggleStatus = (employee: any) => {
        setEmployeeToDelete(employee);
        setIsDeleteDialogOpen(true);
    };

    const confirmToggleStatus = () => {
        if (employeeToDelete) {
            const newStatus = employeeToDelete.is_active === 1 ? false : true;
            toggleEmployeeStatusMutation.mutate({
                employeeId: employeeToDelete.id,
                isActive: newStatus
            });
        }
    };

    const handleEdit = (employee: any) => {
        setSelectedEmployee(employee);
        setIsEmployeeModalOpen(true);
    };

    const handleAddNew = () => {
        setSelectedEmployee(null);
        setIsEmployeeModalOpen(true);
    };
    const { navigateTo } = useNavigation();

    const handleViewDetails = (employeeId: string) => {
        console.log(employeeId, 'baka9s9s')
        navigateTo(`/employees/${employeeId}`);
        // window.history.pushState({}, '', `/employees/${employeeId}`);
    };

    const handleShareWhatsApp = (employee: any) => {
        const message = `*Employee Details*%0A%0A` +
            `Name: ${employee.name}%0A` +
            `Phone: ${employee.phone}%0A` +
            `Salary: ${formatPKR(employee.salary)}%0A` +
            `Type: ${employee.employee_type}%0A` +
            `Shift: ${employee.shift}%0A` +
            `Status: ${employee.is_active === 1 ? 'Active' : 'Inactive'}`;

        const whatsappUrl = `https://wa.me/+92${employee.phone.replace(/\D/g, '').replace(/^0/, '')}?text=${message}`;
        window.open(whatsappUrl, '_blank');
    };

    const columns = [
        {
            key: 'name' as const,
            label: 'Employee',
            render: (value: string, row: any) => (
                <div>
                    <p className="font-medium">{value}</p>
                    <p className="text-xs text-muted-foreground flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        {row.phone}
                    </p>
                </div>
            ),
        },
        {
            key: 'employee_type' as const,
            label: 'Type',
            render: (value: string) => (
                <Badge variant="outline" className="capitalize">
                    {value || '-'}
                </Badge>
            ),
        },
        {
            key: 'shift' as const,
            label: 'Shift',
            render: (value: string) => (
                <Badge variant="secondary" className="capitalize">
                    {value || '-'}
                </Badge>
            ),
        },
        {
            key: 'salary' as const,
            label: 'Salary/Rate',
            render: (value: number, row: any) => {
                // Get the correct rate based on payment_type
                let rate = 0;
                let unit = '';

                if (row.payment_type === 'hourly') {
                    rate = row.hourly_rate || 0;
                    unit = '/hour';
                } else if (row.payment_type === 'daily') {
                    rate = row.daily_rate || 0;
                    unit = '/day';
                } else if (row.payment_type === 'weekly') {
                    rate = row.weekly_rate || 0;
                    unit = '/week';
                } else if (row.payment_type === 'contract') {
                    rate = row.contract_amount || 0;
                    unit = ' total';
                } else {
                    // Fixed monthly salary
                    rate = value || 0;
                    unit = '/month';
                }

                return (
                    <div>
                        <p className="font-semibold">
                            {formatPKR(rate)}{unit}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                            {row.payment_type || row.salary_type || 'fixed'}
                        </p>
                    </div>
                );
            },
        },
        {
            key: 'join_date' as const,
            label: 'Join Date',
            render: (value: string) => {
                if (!value) return '-';
                const date = new Date(value);
                if (isNaN(date.getTime())) return '-';
                return format(date, 'dd/MM/yyyy');
            },
        },
        {
            key: 'is_active' as const,
            label: 'Status',
            render: (value: number) => (
                <Badge className={value === 1 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {value === 1 ? 'Active' : 'Inactive'}
                </Badge>
            ),
        },
        {
            key: 'id' as const,
            label: 'Actions',
            render: (value: string, row: any) => (
                <div className="flex space-x-2">
                    <Button size="sm" variant="ghost" onClick={() => handleViewDetails(value)}>
                        <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(row)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleShareWhatsApp(row)}>
                        <Share className="h-4 w-4" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleStatus(row)}
                        className={row.is_active === 1 ? "text-red-500 hover:text-red-700" : "text-green-500 hover:text-green-700"}
                    >
                        {row.is_active === 1 ? 'Deactivate' : 'Activate'}
                    </Button>
                </div>
            ),
        },
    ];

    // Calculate summary stats
    const activeEmployees = filteredData.filter((emp: any) => emp.is_active === 1);
    // Calculate total monthly salary cost (for monthly fixed employees only)
    const totalMonthlySalary = activeEmployees.reduce((sum: number, emp: any) => {
        if (emp.payment_type === 'fixed' || emp.salary_type === 'monthly') {
            return sum + (emp.salary || 0);
        }
        // For hourly/daily/weekly, don't include in monthly salary total
        // They will be counted in wages separately
        return sum;
    }, 0);

    const { setTitle, setSubtitle } = useHeader();

    useEffect(() => {
        setTitle("Employees");
        setSubtitle("Manage employees, attendance and salaries");
    }, []);

    return (
        <div className="flex-1 flex flex-col overflow-hidden" key={renderKey}>
            <main
                ref={mainContentRef}
                className="flex-1 overflow-auto p-6"
                onScroll={handleScroll}
            >
                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
                    <Card>
                        <CardContent className="p-4 sm:p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs sm:text-sm text-muted-foreground">Total Employees</p>
                                    <p className="text-xl sm:text-2xl font-bold">{totalCount}</p>
                                </div>
                                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4 sm:p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs sm:text-sm text-muted-foreground">Active Employees</p>
                                    <p className="text-xl sm:text-2xl font-bold text-green-600">{activeEmployees.length}</p>
                                </div>
                                <Badge className="bg-green-100 text-green-800 text-xs sm:text-sm px-2 py-1">
                                    Active
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                  <Card>
    <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Monthly Salary Cost</p>
                <p className="text-lg sm:text-2xl font-bold text-secondary break-words">
                    {formatPKR(totalMonthlySalary)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                    From {activeEmployees.filter(e => e.payment_type === 'fixed' || e.salary_type === 'monthly').length} monthly employees
                </p>
            </div>
            <Banknote className="h-5 w-5 sm:h-6 sm:w-6 text-secondary flex-shrink-0" />
        </div>
    </CardContent>
</Card>
                    <Card>
                        <CardContent className="p-4 sm:p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs sm:text-sm text-muted-foreground">Managers</p>
                                    <p className="text-xl sm:text-2xl font-bold text-blue-600">
                                        {filteredData.filter((emp: any) => emp.employee_type === 'manager').length}
                                    </p>
                                </div>
                                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-2">
                                <CardTitle>Employees List</CardTitle>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowShortcuts(true)}
                                    className="h-8 w-8"
                                    title="Keyboard Shortcuts"
                                >
                                    <Keyboard className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="flex space-x-2">
                                <Button
                                    onClick={() => {
                                        localStorage.removeItem(STORAGE_KEYS.EMPLOYEES_PAGE);
                                        localStorage.removeItem(STORAGE_KEYS.EMPLOYEES_FILTERS);
                                        localStorage.removeItem(STORAGE_KEYS.EMPLOYEES_SCROLL_POSITION);
                                        setFilters({ search: "", employeeType: "", shift: "", status: "" });
                                        setCurrentPage(1);
                                        isFirstLoadRef.current = true;
                                        setRenderKey(prev => prev + 1);
                                        toast({ title: "Reset", description: "All filters and pagination have been reset" });
                                        refetch();
                                    }}
                                    variant="outline"
                                    size="sm"
                                >
                                    Reset All
                                </Button>
                                <Button onClick={handleAddNew}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Employee
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Filters */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <Input
                                placeholder="Search employees... (Ctrl+F)"
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            />
                            <Select
                                value={filters.employeeType || "all"}
                                onValueChange={(value) => setFilters({ ...filters, employeeType: value === "all" ? "" : value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Employee Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="manager">Manager</SelectItem>
                                    <SelectItem value="cashier">Cashier</SelectItem>
                                    <SelectItem value="labor">Labor</SelectItem>
                                    <SelectItem value="salesman">Sales Man</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={filters.shift || "all"}
                                onValueChange={(value) => setFilters({ ...filters, shift: value === "all" ? "" : value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Shift" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Shifts</SelectItem>
                                    <SelectItem value="day">Day</SelectItem>
                                    <SelectItem value="night">Night</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={filters.status || "all"}
                                onValueChange={(value) => setFilters({ ...filters, status: value === "all" ? "" : value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Results count */}
                        <div className="mb-4 text-sm text-muted-foreground">
                            {totalCount > 0 ? (
                                `Showing ${startIndex} to ${endIndex} of ${totalCount} employees`
                            ) : (
                                !isLoading && "No employees found"
                            )}
                        </div>

                        {/* Data Table */}
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                <span className="ml-2 text-muted-foreground">Loading employees...</span>
                            </div>
                        ) : (
                            <>
                                <div className="border rounded-lg overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-muted/50 border-b">
                                                <tr>
                                                    {columns.map((column) => (
                                                        <th key={column.key} className="text-left p-3 font-medium text-sm">
                                                            {column.label}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {paginatedData.length > 0 ? (
                                                    paginatedData.map((employee: any, index: number) => (
                                                        <tr key={employee.id} className={`border-b hover:bg-muted/30 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
                                                            {columns.map((column) => (
                                                                <td key={column.key} className="p-3">
                                                                    {column.render(employee[column.key], employee)}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={columns.length} className="text-center p-8 text-muted-foreground">
                                                            No employees found.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Pagination Controls */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                        <div className="text-sm text-muted-foreground">
                                            Page {currentPage} of {totalPages}
                                        </div>
                                        <div className="flex space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                            >
                                                <ChevronLeft className="h-4 w-4 mr-1" />
                                                Previous
                                            </Button>
                                            <div className="flex space-x-1">
                                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                    let pageNum;
                                                    if (totalPages <= 5) {
                                                        pageNum = i + 1;
                                                    } else if (currentPage <= 3) {
                                                        pageNum = i + 1;
                                                    } else if (currentPage >= totalPages - 2) {
                                                        pageNum = totalPages - 4 + i;
                                                    } else {
                                                        pageNum = currentPage - 2 + i;
                                                    }
                                                    return (
                                                        <Button
                                                            key={pageNum}
                                                            variant={currentPage === pageNum ? "default" : "outline"}
                                                            size="sm"
                                                            onClick={() => setCurrentPage(pageNum)}
                                                            className="w-10"
                                                        >
                                                            {pageNum}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                disabled={currentPage === totalPages}
                                            >
                                                Next
                                                <ChevronRight className="h-4 w-4 ml-1" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Employee Form Modal */}
                <EmployeeFormModal
                    isOpen={isEmployeeModalOpen}
                    onClose={() => setIsEmployeeModalOpen(false)}
                    employee={selectedEmployee}
                    onRefresh={refetch}
                />

                {/* Status Change Confirmation Dialog */}
                <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {employeeToDelete?.is_active === 1 ? 'Deactivate Employee' : 'Activate Employee'}
                            </DialogTitle>
                        </DialogHeader>
                        <p>
                            Are you sure you want to {employeeToDelete?.is_active === 1 ? 'deactivate' : 'activate'}
                            <strong className="font-semibold"> {employeeToDelete?.name}</strong>?
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {employeeToDelete?.is_active === 1
                                ? 'Deactivated employees will not appear in active lists but their data will be preserved.'
                                : 'Activated employees will be able to work and receive salaries.'}
                        </p>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                variant={employeeToDelete?.is_active === 1 ? "destructive" : "default"}
                                onClick={confirmToggleStatus}
                            >
                                {employeeToDelete?.is_active === 1 ? 'Deactivate' : 'Activate'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </main>

            <KeyboardShortcutsModal
                open={showShortcuts}
                onOpenChange={setShowShortcuts}
                title="Employees Page Shortcuts"
                shortcuts={[
                    { key: "Ctrl + A", description: "Add New Employee" },
                    { key: "Ctrl + C", description: "Clear All Filters" },
                    { key: "Ctrl + F", description: "Focus Search Bar" },
                    { key: "←", description: "Previous Page" },
                    { key: "→", description: "Next Page" },
                ]}
            />
        </div>
    );
}

// EmployeeFormModal.tsx - Updated version
function EmployeeFormModal({ isOpen, onClose, employee, onRefresh }: { isOpen: boolean; onClose: () => void; employee: any; onRefresh: () => void }) {
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        payment_type: "fixed", // fixed, daily, weekly, contract, hourly
        salary: "",
        daily_rate: "",
        weekly_rate: "",
        hourly_rate: "",
        contract_amount: "",
        contract_start_date: "",
        contract_end_date: "",
        payment_method: "cash",
        shift: "day",
        employee_type: "labor",
        join_date: format(new Date(), 'yyyy-MM-dd'),
        is_active: true,
    });
    const { toast } = useToast();

    useEffect(() => {
        if (employee) {
            let joinDateValue = '';
            if (employee.join_date) {
                const date = new Date(employee.join_date);
                if (!isNaN(date.getTime())) {
                    joinDateValue = date.toISOString().split('T')[0];
                }
            }
            setFormData({
                name: employee.name || "",
                phone: employee.phone || "",
                payment_type: employee.payment_type || "fixed",
                salary: employee.salary?.toString() || "",
                daily_rate: employee.daily_rate?.toString() || "",
                weekly_rate: employee.weekly_rate?.toString() || "",
                hourly_rate: employee.hourly_rate?.toString() || "",
                contract_amount: employee.contract_amount?.toString() || "",
                contract_start_date: employee.contract_start_date?.split('T')[0] || "",
                contract_end_date: employee.contract_end_date?.split('T')[0] || "",
                payment_method: employee.payment_method || "cash",
                shift: employee.shift || "day",
                employee_type: employee.employee_type || "labor",
                join_date: joinDateValue || format(new Date(), 'yyyy-MM-dd'),
                is_active: employee.is_active === 1,
            });
        } else {
            setFormData({
                name: "",
                phone: "",
                payment_type: "fixed",
                salary: "",
                daily_rate: "",
                weekly_rate: "",
                hourly_rate: "",
                contract_amount: "",
                contract_start_date: "",
                contract_end_date: "",
                payment_method: "cash",
                shift: "day",
                employee_type: "labor",
                join_date: format(new Date(), 'yyyy-MM-dd'),
                is_active: true,
            });
        }
    }, [employee]);

    const saveEmployeeMutation = useMutation({
        mutationFn: async (data: any) => {
            const employeeData = {
                name: data.name,
                phone: data.phone,
                payment_type: data.payment_type,
                salary: data.payment_type === 'fixed' ? parseFloat(data.salary) : 0,
                daily_rate: data.payment_type === 'daily' ? parseFloat(data.daily_rate) : 0,
                weekly_rate: data.payment_type === 'weekly' ? parseFloat(data.weekly_rate) : 0,
                hourly_rate: data.payment_type === 'hourly' ? parseFloat(data.hourly_rate) : 0,
                contract_amount: data.payment_type === 'contract' ? parseFloat(data.contract_amount) : 0,
                contract_start_date: data.payment_type === 'contract' ? data.contract_start_date : null,
                contract_end_date: data.payment_type === 'contract' ? data.contract_end_date : null,
                payment_method: data.payment_method,
                shift: data.shift,
                employee_type: data.employee_type,
                join_date: data.join_date,
                is_active: data.is_active ? 1 : 0,
                user_id: 'system',
                shop_id: 'default'
            };

            if (employee) {
                const result = await api.updateEmployee(employee.id, employeeData);
                return result;
            } else {
                const result = await api.createEmployee(employeeData);
                return result;
            }
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: employee ? "Employee updated successfully" : "Employee added successfully"
            });
            onRefresh();
            onClose();
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        saveEmployeeMutation.mutate(formData);
    };

    // Get salary info based on payment type
    const getSalaryInfo = () => {
        switch (formData.payment_type) {
            case 'fixed':
                return { label: 'Monthly Salary', value: formData.salary, placeholder: 'Enter monthly salary' };
            case 'daily':
                return { label: 'Daily Rate', value: formData.daily_rate, placeholder: 'Enter daily wage (e.g., 800/day)' };
            case 'weekly':
                return { label: 'Weekly Rate', value: formData.weekly_rate, placeholder: 'Enter weekly wage (e.g., 5000/week)' };
            case 'hourly':
                return { label: 'Hourly Rate', value: formData.hourly_rate, placeholder: 'Enter hourly rate (e.g., 200/hour)' };
            case 'contract':
                return { label: 'Contract Amount', value: formData.contract_amount, placeholder: 'Enter total contract amount' };
            default:
                return { label: 'Salary', value: formData.salary, placeholder: 'Enter salary amount' };
        }
    };

    const salaryInfo = getSalaryInfo();

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{employee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Full Name *</label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Phone Number *</label>
                            <Input
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Payment Type</label>
                            <Select value={formData.payment_type} onValueChange={(value) => setFormData({ ...formData, payment_type: value })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="fixed">📅 Monthly Fixed Salary</SelectItem>
                                    <SelectItem value="daily">📆 Daily Wages</SelectItem>
                                    <SelectItem value="weekly">📆 Weekly Wages</SelectItem>
                                    <SelectItem value="hourly">⏰ Hourly Rate</SelectItem>
                                    <SelectItem value="contract">📄 Contract Based</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">{salaryInfo.label}</label>
                            <Input
                                type="number"
                                value={salaryInfo.value}
                                onChange={(e) => {
                                    const key = formData.payment_type === 'fixed' ? 'salary' :
                                        formData.payment_type === 'daily' ? 'daily_rate' :
                                            formData.payment_type === 'weekly' ? 'weekly_rate' :
                                                formData.payment_type === 'hourly' ? 'hourly_rate' : 'contract_amount';
                                    setFormData({ ...formData, [key]: e.target.value });
                                }}
                                placeholder={salaryInfo.placeholder}
                                required={formData.payment_type !== 'contract' || (formData.payment_type === 'contract' && !formData.contract_amount)}
                            />
                        </div>
                    </div>

                    {/* Contract Dates (only show for contract type) */}
                    {formData.payment_type === 'contract' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium">Contract Start Date</label>
                                <Input
                                    type="date"
                                    value={formData.contract_start_date}
                                    onChange={(e) => setFormData({ ...formData, contract_start_date: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Contract End Date</label>
                                <Input
                                    type="date"
                                    value={formData.contract_end_date}
                                    onChange={(e) => setFormData({ ...formData, contract_end_date: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Payment Method</label>
                            <Select value={formData.payment_method} onValueChange={(value) => setFormData({ ...formData, payment_method: value })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cash">💵 Cash</SelectItem>
                                    <SelectItem value="card">💳 Card</SelectItem>
                                    <SelectItem value="easypaisa">📱 EasyPaisa</SelectItem>
                                    <SelectItem value="jazzcash">📱 JazzCash</SelectItem>
                                    <SelectItem value="bank">🏦 Bank</SelectItem>
                                    <SelectItem value="check">📝 Check</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Shift</label>
                            <Select value={formData.shift} onValueChange={(value) => setFormData({ ...formData, shift: value })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="day">🌞 Day Shift</SelectItem>
                                    <SelectItem value="night">🌙 Night Shift</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Employee Type</label>
                            <Select value={formData.employee_type} onValueChange={(value) => setFormData({ ...formData, employee_type: value })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="manager">👔 Manager</SelectItem>
                                    <SelectItem value="cashier">💰 Cashier</SelectItem>
                                    <SelectItem value="labor">🔧 Labor</SelectItem>
                                    <SelectItem value="salesman">📦 Sales Man</SelectItem>
                                    <SelectItem value="other">📋 Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Join Date</label>
                            <Input
                                type="date"
                                value={formData.join_date}
                                onChange={(e) => setFormData({ ...formData, join_date: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                className="rounded border-gray-300"
                            />
                            <span className="text-sm font-medium">Active Employee</span>
                        </label>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saveEmployeeMutation.isPending}>
                            {saveEmployeeMutation.isPending ? 'Saving...' : employee ? 'Update Employee' : 'Add Employee'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}