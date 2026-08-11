# Finance Tracker

# Background

Currently, I use Google Sheets. I technically have 4 workbooks

1. Budget (IDR)
2. Budget (JPY)
3. 2026
4. Portfolio

Inside Budget workbooks, I have the following sheets:

1. Budget Breakdown - Lists how much I earn monthly and how much each sheet gets at the start of the month (these sheets have their value rolled over to the next month)
2. Dates - Funds for dates
3. Personal - Funds for personal purchases
4. Personal Big Purchases - Funds for pricier personal purchases
5. Holiday - Funds for holidays
6. Savings
7. Lease - Money set aside for paying rent
8. Residence Tax - Money set aside for paying residence tax
9. Emergency - Remaining surplus money at the end of the year’s reconciliation that gets added into the Emergency funds instead of the Savings sheet

Inside the 2026 workbook, I have a sheet for every month. These are for day-to-day living with the following categories:

1. House - Expenses for housing (cleaning supplies, maintenance, etc)
2. Food - Groceries and eating out
3. Needs - Utilities (e.g. wifi, electricity, gas, water, mobile)
4. Transportation
5. Miscellaneous - Everything else (e.g. medicine, amazon subscription, google one, wise transaction fees)

Inside the Portfolio workbook, I have sheets for equities, bonds, and cash-like instruments.

# Problems

1. Multi-currency Financial Tracker and Budgeting
    1. Managing IDR and JPY funds is difficult, especially since monthly budgets are set in JPY but spending can happen in IDR due to payment method restrictions
2. Manual Intervention for Updating Wealth
    1. Portfolio needs to be updated periodically because values change (gold price, bond valuation, stock prices, forex exchange rate, etc)
3. App Experience is Clunky
    1. Adding expenses in most apps is tiring because each item must be entered one at a time — even with voice input, entering 13 grocery items individually is enough friction to stop using the app
4. Budgeting Flexibility
    1. Day-to-day living expenses are tracked separately from the Budget workbooks, so conventional budgeting (a fixed budget per category like food, transportation, etc.) doesn't fit — a budget needs to be able to span multiple categories flexibly

# Requirements

1. Multi-currency Financial Tracker and Budgeting
    1. **Decision:** separate the financial tracker from the budgeting. The tracker records actual money earned/spent in its real currency. The budget lives in a single reference currency. This creates a reconciliation gap from FX movement, but since the budget isn't real money, that gap can be reconciled periodically rather than in real time.
    2. **Alternative considered:** track everything in one currency using daily FX rates. Rejected — adds constant noise from rate fluctuations and doesn't reflect how budgets are actually allocated.
2. Manual Intervention for Updating Wealth
    1. **Decision:** portfolio valuation (stocks, bonds, gold, forex) stays manual — live ticker data requires a paid license or scraping, neither of which is worth pursuing for personal use.
    2. **Decision:** expense capture can eventually integrate with tools like Splitwise/Spliiit or bank apps (BCA, OCBC), but this depends on each provider's API/OAuth access and is deferred past v1.
    3. **Alternative considered:** bank statement CSV import as a lower-effort middle ground before live API integration.
3. App Experience is Clunky
    1. **Decision (v1):** spreadsheet-style rapid entry — input price, move to next row, input price, and so on — is core to the MVP.
    2. **Decision (deferred):** receipt scanning/OCR is a Phase 2 feature, not required for launch. The data model for expense entries should stay OCR-compatible so it can be added later without rework.
    3. **Alternative considered for OCR when built:** on-device OCR (e.g. native Apple/Google text recognition — free, less accurate) vs. a paid vision API (more accurate, per-call cost) — to be decided when Phase 2 starts.
4. Budgeting Flexibility
    1. **Decision:** a budget can be scoped to a single category, a group of categories, or overall monthly spend — budgets are a separate, configurable entity rather than a fixed field on each category.

# Non-goals / Deferred

- Automated market data feeds for portfolio valuation (confirmed not viable — paid license or scraping required)
- Receipt scanning / OCR (Phase 2)
- Third-party expense integrations — Splitwise, Spliiit, bank apps (Phase 2+, dependent on provider API access)