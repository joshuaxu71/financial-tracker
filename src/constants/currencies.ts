export const BASE_CURRENCY = "JPY" as const;

export const CURRENCIES: readonly { code: string; name: string }[] = [
   { code: "JPY", name: "Japanese Yen" },
   { code: "USD", name: "US Dollar" },
   { code: "EUR", name: "Euro" },
   { code: "GBP", name: "British Pound" },
   { code: "AUD", name: "Australian Dollar" },
   { code: "CAD", name: "Canadian Dollar" },
   { code: "CHF", name: "Swiss Franc" },
   { code: "CNY", name: "Chinese Yuan" },
   { code: "HKD", name: "Hong Kong Dollar" },
   { code: "KRW", name: "Korean Won" },
   { code: "SGD", name: "Singapore Dollar" },
   { code: "TWD", name: "Taiwan Dollar" },
   { code: "THB", name: "Thai Baht" },
   { code: "INR", name: "Indian Rupee" },
];

export function currencyName(code: string): string {
   return CURRENCIES.find((c) => c.code === code)?.name ?? code;
}

export function formatCurrencyAmount(amount: number, currency: string): string {
   const noDecimals = currency === "JPY" || currency === "KRW";
   return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency,
      maximumFractionDigits: noDecimals ? 0 : 2,
      minimumFractionDigits: noDecimals ? 0 : 2,
   }).format(amount);
}
