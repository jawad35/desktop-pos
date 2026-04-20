import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatPKR } from "@/lib/currency";
import { format } from "date-fns";
import { Users, Plus, Eye, Edit, Trash2, Phone, Banknote, Share } from "lucide-react";
import { useHeader } from "@/contexts/HeaderContext";
import { useToast } from "@/hooks/use-toast";
import { api } from "../../services/electron-api";

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
    const [filters, setFilters] = useState({
        search: "",
        employeeType: "",
        shift: "",
        status: "",
    });
    const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);
    const { toast } = useToast();

    const { data: employees = [], isLoading, refetch } = useQuery<any[]>({
        queryKey: ["employees", filters.search, filters.employeeType, filters.shift, filters.status],
        queryFn: async () => {
            // Send filters with correct parameter names
            const filterParams: any = {};

            if (filters.search) filterParams.search = filters.search;
            if (filters.employeeType && filters.employeeType !== 'all') filterParams.employeeType = filters.employeeType;
            if (filters.shift && filters.shift !== 'all') filterParams.shift = filters.shift;
            if (filters.status && filters.status !== 'all') filterParams.status = filters.status;

            console.log('Sending filters to API:', filterParams);
            const result = await api.getEmployees(filterParams);
            console.log('API response:', result);

            if (Array.isArray(result)) return result;
            if (result?.success && Array.isArray(result.data)) return result.data;
            return [];
        },
    });

    const deleteEmployeeMutation = useMutation({
        mutationFn: async (employeeId: string) => {
            const result = await api.deleteEmployee(employeeId);
            console.log('Delete result:', result);
            return result === true || result?.success === true;
        },
        onSuccess: () => {
            toast({ title: "Success", description: "Employee deleted successfully" });
            setIsDeleteDialogOpen(false);
            setEmployeeToDelete(null);
            refetch(); // Refresh the list
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    // Replace the delete mutation with this:
    const toggleEmployeeStatusMutation = useMutation({
        mutationFn: async ({ employeeId, isActive }: { employeeId: string; isActive: boolean }) => {
            // Update the employee's is_active status
            const result = await api.updateEmployee(employeeId, { is_active: isActive ? 1 : 0 });
            console.log('Toggle status result:', result);
            return result;
        },
        onSuccess: (_, variables) => {
            const newStatus = variables.isActive ? 'activated' : 'deactivated';
            toast({
                title: "Success",
                description: `Employee ${newStatus} successfully`
            });
            setIsDeleteDialogOpen(false);
            setEmployeeToDelete(null);
            refetch(); // Refresh the list
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    // Replace handleDelete with this:
    const handleToggleStatus = (employee: any) => {
        setEmployeeToDelete(employee);
        setIsDeleteDialogOpen(true);
    };

    // Replace confirmDelete with this:
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

    const handleViewDetails = (employeeId: string) => {
        // window.location.href = `/employees/${employeeId}`;
        window.history.pushState({}, '', `/employees/${employeeId}`);
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
            label: 'Salary',
            render: (value: number, row: any) => (
                <div>
                    <p className="font-semibold">{formatPKR(value || 0)}</p>
                    <p className="text-xs text-muted-foreground capitalize">{row.salary_type || '-'}</p>
                </div>
            ),
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
    const activeEmployees = employees.filter((emp: any) => emp.is_active === 1);
    const totalMonthlySalary = activeEmployees.reduce((sum: number, emp: any) => sum + (emp.salary_type === 'monthly' ? emp.salary : emp.salary * 4), 0);

    const { setTitle, setSubtitle } = useHeader();

    useEffect(() => {
        setTitle("Employees");
        setSubtitle("Manage employees, attendance and salaries");
    }, [setTitle, setSubtitle]);

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <main className="flex-1 overflow-auto p-6">
                {/* Summary Cards */}
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
    {/* Total Employees Card */}
    <Card>
        <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Total Employees</p>
                    <p className="text-xl sm:text-2xl font-bold">{employees.length}</p>
                </div>
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
        </CardContent>
    </Card>

    {/* Active Employees Card */}
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

    {/* Monthly Salary Card */}
    <Card>
        <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Monthly Salary</p>
                    <p className="text-lg sm:text-2xl font-bold text-secondary break-words">
                        {formatPKR(totalMonthlySalary)}
                    </p>
                </div>
                <Banknote className="h-5 w-5 sm:h-6 sm:w-6 text-secondary flex-shrink-0" />
            </div>
        </CardContent>
    </Card>

    {/* Managers Card */}
    <Card>
        <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Managers</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-600">
                        {employees.filter((emp: any) => emp.employee_type === 'manager').length}
                    </p>
                </div>
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            </div>
        </CardContent>
    </Card>
</div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Employees List</CardTitle>
                            <Button onClick={handleAddNew}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Employee
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Filters */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <Input
                                placeholder="Search employees..."
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

                        {/* Data Table */}
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                <span className="ml-2 text-muted-foreground">Loading employees...</span>
                            </div>
                        ) : (
                            <DataTable
                                data={employees}
                                columns={columns}
                                searchPlaceholder="Search employees..."
                            />
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

                {/* Delete Confirmation Dialog */}
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
        </div>
    );
}

// Employee Form Modal Component
function EmployeeFormModal({ isOpen, onClose, employee, onRefresh }: { isOpen: boolean; onClose: () => void; employee: any; onRefresh: () => void }) {
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        salary: "",
        salary_type: "monthly",
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
                salary: employee.salary?.toString() || "",
                salary_type: employee.salary_type || "monthly",
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
                salary: "",
                salary_type: "monthly",
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
                salary: parseFloat(data.salary),
                salary_type: data.salary_type,
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

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{employee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Full Name</label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Phone Number</label>
                            <Input
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Salary</label>
                            <Input
                                type="number"
                                value={formData.salary}
                                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Salary Type</label>
                            <Select value={formData.salary_type} onValueChange={(value) => setFormData({ ...formData, salary_type: value })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Payment Method</label>
                            <Select value={formData.payment_method} onValueChange={(value) => setFormData({ ...formData, payment_method: value })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cash">Cash</SelectItem>
                                    <SelectItem value="card">Card</SelectItem>
                                    <SelectItem value="easypaisa">EasyPaisa</SelectItem>
                                    <SelectItem value="jazzcash">JazzCash</SelectItem>
                                    <SelectItem value="bank">Bank</SelectItem>
                                    <SelectItem value="check">Check</SelectItem>
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
                                    <SelectItem value="day">Day Shift</SelectItem>
                                    <SelectItem value="night">Night Shift</SelectItem>
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
                                    <SelectItem value="manager">Manager</SelectItem>
                                    <SelectItem value="cashier">Cashier</SelectItem>
                                    <SelectItem value="labor">Labor</SelectItem>
                                    <SelectItem value="salesman">Sales Man</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
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