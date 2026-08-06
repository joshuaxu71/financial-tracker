import { BASE_CURRENCY, formatCurrencyAmount } from "@/constants/currencies";

/** Format an amount in the app's base currency (JPY). */
export function formatAmount(amount: number): string {
   return formatCurrencyAmount(amount, BASE_CURRENCY);
}
