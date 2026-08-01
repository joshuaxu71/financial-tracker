export const CURRENCY_CODE = 'JPY' as const;

export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: CURRENCY_CODE,
    maximumFractionDigits: 0,
  }).format(amount);
}
