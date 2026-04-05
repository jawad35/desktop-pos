export function formatPKR(amount: string | number): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return 'PKR 0';
  }
  
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numAmount).replace('PKR', 'PKR');
}

export function parsePKR(pkrString: string): number {
  return parseFloat(pkrString.replace(/[^0-9.-]+/g, '')) || 0;
}
