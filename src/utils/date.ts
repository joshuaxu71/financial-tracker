export function toIsoDate(date: Date): string {
   const y = date.getFullYear();
   const m = String(date.getMonth() + 1).padStart(2, "0");
   const d = String(date.getDate()).padStart(2, "0");
   return `${y}-${m}-${d}`;
}

export function today(): string {
   return toIsoDate(new Date());
}

export function addDays(isoDate: string, delta: number): string {
   const date = new Date(isoDate + "T00:00:00");
   date.setDate(date.getDate() + delta);
   return toIsoDate(date);
}

export function formatDisplayDate(isoDate: string): string {
   const date = new Date(isoDate + "T00:00:00");
   return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function formatMonthYear(year: number, month: number): string {
   return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
   });
}

export function formatDayHeader(isoDate: string): string {
   const date = new Date(isoDate + "T00:00:00");
   return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

export function currentYearMonth(): { year: number; month: number } {
   const now = new Date();
   return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function prevMonth(year: number, month: number): { year: number; month: number } {
   return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

export function nextMonth(year: number, month: number): { year: number; month: number } {
   return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

export function shiftMonth(
   year: number,
   month: number,
   delta: number,
): { year: number; month: number } {
   const total = year * 12 + (month - 1) + delta;
   return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

export function formatMonthShort(year: number, month: number): string {
   return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "short" });
}

export function monthKey(year: number, month: number): number {
   return year * 12 + (month - 1);
}

export function fromMonthKey(key: number): { year: number; month: number } {
   return { year: Math.floor(key / 12), month: (key % 12) + 1 };
}
