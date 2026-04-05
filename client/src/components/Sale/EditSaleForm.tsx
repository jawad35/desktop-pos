import { useState, useEffect } from "react";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { api } from "../../services/electron-api";

// ─── Local PaymentStatus enum ────────────────────────────────────────────────
export enum PaymentStatus {
  PENDING   = "pending",
  COMPLETED = "completed",
  PARTIAL   = "partial",
  REFUNDED  = "refunded",
  CANCELLED = "cancelled",
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface EditSaleFormProps {
  saleId: string;
  currentEmployeeId?: string;
  currentPaymentStatus?: string;
  onClose?: () => void;
  onRefresh?: () => void;  // Add this
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function EditSaleForm({
  saleId,
  currentEmployeeId,
  currentPaymentStatus,
  onClose,
  onRefresh
}: EditSaleFormProps) {
  const [employeeId, setEmployeeId]       = useState(currentEmployeeId || "");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    (currentPaymentStatus as PaymentStatus) || PaymentStatus.COMPLETED
  );
  const [salesman, setSalesman]   = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ─── Fetch salesmen via api service ──────────────────────────────────────────
  useEffect(() => {
    const fetchSalesmen = async () => {
      try {
        const result = await api.getEmployees({ employeeType: "salesman" });
        
        // Handle different response formats
        let employees = [];
        if (Array.isArray(result)) {
          employees = result;
        } else if (result?.success && Array.isArray(result.data)) {
          employees = result.data;
        } else if (result?.data && Array.isArray(result.data)) {
          employees = result.data;
        } else {
          employees = [];
        }
        
        // Filter salesmen if needed, or use all employees
        const salesmenOnly = employees.filter(
          (emp: any) =>
            emp.employee_type === "salesman" ||
            emp.role?.toLowerCase() === "salesman" ||
            emp.position?.toLowerCase() === "salesman"
        );
        
        setSalesman(salesmenOnly.length > 0 ? salesmenOnly : employees);
      } catch (err: any) {
        console.error("Failed to fetch salesmen:", err);
        setSalesman([]);
      }
    };

    fetchSalesmen();
  }, []);

  // ─── Submit handler via api service ──────────────────────────────────────────
 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);

  try {
    const result = await api.updateSale(saleId, { 
      employeeId: employeeId || null, 
      paymentStatus 
    });
    
    // Check if update was successful
    if (result === true || result?.success === true) {
      toast({
        description: "Sale has been updated successfully",
      });
      
      // Reload the page like web version
      if (onRefresh) onRefresh();
      
      if (onClose) onClose();
    } else {
      throw new Error(result?.error || "Failed to update sale");
    }
  } catch (error: any) {
    toast({
      description: error.message,
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
};

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">

        {/* Salesman Select */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Salesman
          </label>
          <Select value={employeeId} onValueChange={setEmployeeId}>
            <SelectTrigger>
              <SelectValue placeholder="Select Salesman" />
            </SelectTrigger>
            <SelectContent>
              {salesman.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Payment Status Select */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Payment Status
          </label>
          <Select
            value={paymentStatus}
            onValueChange={(val) => setPaymentStatus(val as PaymentStatus)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Payment Status" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(PaymentStatus).map((status) => (
                <SelectItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Submit Button */}
        <div className="mt-4 md:mt-0">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Updating..." : "Update Sale"}
          </Button>
        </div>

      </div>
    </form>
  );
}