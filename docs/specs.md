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
    1. Managing IDR and JPY funds are difficult, especially since I set my monthly budgets using JPY and can still spend IDR because of payment method restrictions
2. Manual Intervention for Updating Wealth
    1. Portfolio needs to be updated periodically because values change (gold price, bond evaluation, stock prices, forex exchange rate, etc)
        1. I don’t think there’s a solution for this because getting those tickers requires a paid license. Most we can do is update manually
3. App Experience is Clunky
    1. Adding expenses in most apps can be tiring because you need to add them one by one, even with voice input
4. Budgeting Flexibility
    1. Since my day-to-day living expenses are separate from the Budget workbooks, conventional budgeting methods where I need to set budget for my food, transportation, etc separately does not fit my criteria because I’d like a more flexible budget that spans across multiple categories

# Requirements

1. Multi-currency Financial Tracker and Budgeting
    1. I think this can be resolved by separating the actual financial tracker and the budgeting. The financial tracker part records how much money is actually earned and spent. The budgeting part can be in one currency. If we do this, here will be a difference in the money spent and the budget remaining because there’s currency exchange, but it can be reconciled in the future since this budget does not represent real money.
2. Manual Intervention for Updating Wealth
    1. From my research, getting new values from tickers is impossible unless we scrape sites or subscribe to a license, which is illegal or not worth it. I think this still needs to stay as manual work. However, for expenses, maybe we can integrate with apps like splitwise, spliiit, or maybe official banking apps like BCA or OCBC
3. App Experience is Clunky
    1. Using apps are slow when inputting a lot of things, for example, going to a grocery store and purchasing 13 items. If the app requires you to add something, input name and price, click add, rinse and repeat 13 times, I will stop using the app. It needs the following features:
        1. A spreadsheet-like editing method so I can input price > down > input price > down and so on
        2. Scan a receipt and automatically input them
4. Budgeting Flexibility
    1. Ability to set budgets based on a category, groups of categories, month in general, etc