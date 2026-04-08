export function formatSalary(amount: number, currency?: string): string {
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    const formatted = millions % 1 === 0
      ? millions.toFixed(0)
      : millions.toFixed(1);
    return `${formatted} M${currency ? ` ${currency}` : ''}`;
  }
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: amount % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `${formatted}${currency ? ` ${currency}` : ''}`;
}

export function formatEmployeeRate(rate: number, currency?: string): { display: string; isContractor: boolean } {
  if (currency === 'USD' && rate > 0 && rate <= 100) {
    const monthly = rate * 160;
    return {
      display: `${rate} USD/hr → ${monthly.toLocaleString('en-US')} USD/mo`,
      isContractor: true,
    };
  }
  if (!rate || rate === 0) return { display: 'No salary info', isContractor: false };
  return { display: formatSalary(rate, currency), isContractor: false };
}
