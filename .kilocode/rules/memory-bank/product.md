# Product Context: EdifiSaaS_v1 - Building Management SaaS

## Why This Exists

EdifiSaaS solves the problem of building administrators needing to track and manage condominium finances. Administrator websites like La Ideal C.A. provide receipt and expense data but lack payment tracking. EdifiSaaS scrapes this data and provides a unified dashboard with payment detection.

## Problems It Solves

1. **Scattered Financial Data**: Receipts and expenses on different administrator pages
2. **No Payment Tracking**: Can't easily see which apartments paid since last sync
3. **Manual Reconciliation**: Building managers manually track payments
4. **Dashboard Display Issues**: Balance, Gastos, Ingresos tabs not showing all data

## How It Should Work (User Flow)

1. User registers building with admin credentials
2. System scrapes data from administrator website (recibos, egresos, gastos, balance)
3. Dashboard displays all financial data in tabs
4. Payment detection compares previous sync with current to find payments
5. User views detected payments in Ingresos tab

## Key User Experience Goals

- **Automatic Sync**: Data scraped from administrator on user request
- **Accurate Display**: All data from administrator shows in dashboard
- **Payment Detection**: Automatically detect which apartments paid
- **Real-time Updates**: Dashboard reflects current state after each sync

## What EdifiSaaS Provides

1. **Data Scraping**: Extract receipts, expenses, balance from administrator HTML
2. **Dashboard**: Tabs for Balance, Gastos, Ingresos with accurate data
3. **Payment Detection**: Compare previous receipts with new to find payments
4. **Supabase Storage**: Persistent storage for all financial data

## Current Issues Being Fixed

1. Gastos regex extraction - was missing some expenses
2. Balance display - was skipping "saldo" values from separator rows
3. Ingresos tab - was showing pending receipts instead of detected payments
4. Payment detection logic - comparing previous sync with current to find paid apartments