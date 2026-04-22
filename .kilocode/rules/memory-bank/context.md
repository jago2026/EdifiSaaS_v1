# Active Context: EdifiSaaS_v1 - Building Management SaaS

## Current State

**Project Status**: In Development

EdifiSaaS is a web application for managing condominium finances. Users can register buildings with admin credentials from La Ideal C.A. and similar systems, scrape financial data (receipts, expenses, balance), and view synced data in a dashboard.

## Recently Completed

- [x] Fix Recibo display - added sorting and intermediate totals to match admin website format
- [x] Fix Fonfo de Reserva ordering - moved from beginning to after regular expenses
- [x] Add intermediate totals - TOTAL GASTOS COMUNES, TOTAL FONDOS, TOTAL FONDOS Y GASTOS COMUNES
- [x] Fix Ingresos tab - now reads from pagos_recibos table (detected payments from sync comparison)
- [x] Fix Movimientos tab - now shows all types (pagos, egresos, gastos) from movimientos_dia
- [x] Fix Alertas tab - now saves sync logs to sincronizaciones table after each sync
- [x] Add alicuotas validation - checks sum is between 99.5%-100%, shows warning if not
- [x] Save detected payments to pagos_recibos table in sync route
- [x] Fix Gastos regex extraction - extracts 12 expenses correctly from HTML
- [x] Fix Balance display - shows all fields matching administrator website
- [x] Fix KPI "Monto del recibo por Unidad (USD)" - changed calculation to Gastos facturados / number of apartments
- [x] Fix Flujo de caja diario - now uses cashFlow data correctly with ingresos and egresos by day
- [x] Add tooltips to Resumen ejecutivo - brief explanations for all cards, charts, and indicators

## Currently Working On

All major fixes implemented. System now:
- Displays receipt data matching admin website format with correct ordering
- Shows intermediate totals (TOTAL GASTOS COMUNES, TOTAL FONDOS, TOTAL FONDOS Y GASTOS COMUNES)
- Saves detected payments to pagos_recibos table
- Reads payments from pagos_recibos for Ingresos tab
- Shows all movement types in Movimientos tab
- Saves sync logs to sincronizaciones table
- Validates alicuotas sum and shows warning if outside 99.5%-100%
- KPIs show correct "gastos por unidad" calculation
- Daily cash flow shows proper income/expense data
- Resumen ejecutivo has explanatory tooltips on hover

## Next Steps (for next session)

1. Test new KPI calculation - verify Gastos por Unidad shows reasonable USD values
2. Test flow caja daily data - verify ingresos/egresos display correctly with new cashFlow source
3. Test tooltips in Resumen - verify explanations appear on hover

## Session History

| Date | Changes |
|------|---------|
| 2026-04-22 | Fixed KPI calculation - now uses Gastos facturados/unidades. Fixed cash flow data source. Added tooltips. |
| 2026-04-19 | Fixed receipt display - added sorting and intermediate totals to match admin website format |
| 2026-04-18 | Fixed Ingresos, Movimientos, Alertas tabs and added alicuotas validation |
| 2026-04-18 | Added payment detection logic - compares previous sync with current to detect payments |
| 2026-04-13 | Fixed KPIs charts - normalizeMonth() for chronological sorting, added new financial charts |
| 2026-04-13 | Fixed build error - undefined totalInserted replaced with nuevosMovimientos in sync/route.ts |