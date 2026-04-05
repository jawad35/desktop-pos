export const getPaymentMethodColor = (method: string) => {
  switch (method.toLowerCase()) {
    case 'cash':
      return 'bg-secondary/10 text-secondary';
    case 'card':
      return 'bg-primary/10 text-primary';
    case 'easypaisa':
    case 'jazzcash':
      return 'bg-accent/10 text-accent';
    case 'bank':
      return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
    case 'check':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    default:
      return 'bg-muted/10 text-muted-foreground';
  }
};
