export function formatExpenseLogType(type: string): string {
  // Handle expense operations
  if (type.startsWith('expense_')) {
    switch (type) {
      case "expense_delete":
        return "Expense Deleted";
      case "expense_update":
        return "Expense Updated";
      case "expense_create":
        return "Expense Created";
      default:
        return "Expense Operation";
    }
  }

  // Handle purchase operations
  if (type.startsWith('purchase_')) {
    switch (type) {
      case "purchase_delete":
        return "Purchase Deleted";
      case "purchase_update":
        return "Purchase Updated";
      case "purchase_create":
        return "Purchase Created";
      default:
        return "Purchase Operation";
    }
  }

  // Handle basic transaction types
  switch (type) {
    case "sale":
      return "Sale";
    case "purchase":
      return "Purchase";
    case "expense":
      return "Expense";
    case "return":
      return "Return";
    default:
      // Convert snake_case to Title Case for any unknown types
      return type.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
  }
}

// Color mapping function for transaction types
export function getTransactionTypeColor(type: string): string {
  // Handle expense operations - Orange/Amber
  if (type.startsWith('expense_')) {
    return 'bg-orange-100 text-orange-800 border-orange-200';
  }

  // Handle purchase operations - Red/Destructive
  if (type.startsWith('purchase_')) {
    return 'bg-red-100 text-red-800 border-red-200';
  }

  // Handle basic transaction types
  switch (type) {
    case "sale":
      return 'bg-green-100 text-green-800 border-green-200'; // Green for sales (positive)
    case "purchase":
      return 'bg-red-100 text-red-800 border-red-200'; // Red for purchases (outflow)
    case "expense":
      return 'bg-orange-100 text-orange-800 border-orange-200'; // Orange for expenses
    case "return":
      return 'bg-blue-100 text-blue-800 border-blue-200'; // Blue for returns
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'; // Gray for unknown
  }
}

// Alternative version using your existing color system if you prefer:
export function getTransactionTypeColorAlt(type: string): string {
  switch (type) {
    case "sale":
    case "sale_create":
      return 'bg-secondary/10 text-secondary border-secondary/20';
    case "purchase":
    case "purchase_create":
    case "purchase_update": 
    case "purchase_delete":
      return 'bg-destructive/10 text-destructive border-destructive/20';
    case "expense":
    case "expense_create":
    case "expense_update":
    case "expense_delete":
      return 'bg-accent/10 text-accent border-accent/20';
    case "return":
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-muted/10 text-muted-foreground border-muted/20';
  }
}