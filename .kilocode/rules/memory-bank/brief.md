# Project Brief: EdifiSaaS_v1 - Building Management SaaS

## Purpose

EdifiSaaS is a building (condominium) management SaaS that scrapes financial data from administrator websites (La Ideal C.A. and similar) and provides a dashboard to view receipts, expenses, balances, and detect payments.

## Target Users

- Building administrators managing multiple condominium complexes
- Condominium owners viewing building finances
- Property managers tracking payments and expenses

## Core Use Case

Users register their building with admin credentials, the system scrapes financial data (recibos, egresos, gastos, balance) and provides a dashboard with:
- Receipt/debt tracking per apartment
- Expenses (egresos/gastos) management
- Balance sheet from administrator
- Payment detection (comparing previous sync with current)

## Key Requirements

### Must Have

- Next.js 16 with App Router, TypeScript, Tailwind CSS 4
- Supabase for data storage
- Web scraping from administrator websites
- Dashboard with tabs: Balance, Gastos, Ingresos
- Payment detection logic

### Current Focus

1. Fix data extraction from La Ideal C.A. administrator website
2. Fix dashboard display (Balance, Gastos, Ingresos tabs)
3. Implement payment detection comparing previous sync with current

## Success Metrics

- All receipt data extracts correctly from administrator
- Dashboard displays all financial data accurately
- Payments detected when debt decreases between syncs

## Constraints

- Framework: Next.js 16 + React 19 + Tailwind CSS 4
- Package manager: Bun
- Database: Supabase
- Administrator: La Ideal C.A.