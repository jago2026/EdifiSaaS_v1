# Active Context: EdifiSaaS_v1 - Building Management SaaS

## Current State

**Project Status**: In Development

EdifiSaaS is a web application for managing condominium finances. Users can register buildings with admin credentials from La Ideal C.A. and similar systems, scrape financial data (receipts, expenses, balance), and view synced data in a dashboard.

## Recently Completed

- [x] Fix Ingresos tab - now reads from pagos_recibos table (detected payments from sync comparison)
- [x] Fix Movimientos tab - now shows all types (pagos, egresos, gastos) from movimientos_dia
- [x] Fix Alertas tab - now saves sync logs to sincronizaciones table after each sync
- [x] Add alicuotas validation - checks sum is between 99.5%-100%, shows warning if not
- [x] Save detected payments to pagos_recibos table in sync route
- [x] Fix Gastos regex extraction - extracts 12 expenses correctly from HTML
- [x] Fix Balance display - shows all fields matching administrator website

## Currently Working On

All major fixes implemented. System now:
- Saves detected payments to pagos_recibos table
- Reads payments from pagos_recibos for Ingresos tab
- Shows all movement types in Movimientos tab
- Saves sync logs to sincronizaciones table
- Validates alicuotas sum and shows warning if outside 99.5%-100%

## Next Steps (for next session)

1. Test sync to verify pagos_recibos is populated correctly
2. Verify Ingresos tab shows detected payments
3. Verify Alertas tab shows sync logs

## Session History

| Date | Changes |
|------|---------|
| 2026-04-18 | Fixed Ingresos, Movimientos, Alertas tabs and added alicuotas validation |
| 2026-04-18 | Added payment detection logic - compares previous sync with current to detect payments |
| 2026-04-13 | Fixed KPIs charts - normalizeMonth() for chronological sorting, added new financial charts |
| 2026-04-13 | Fixed build error - undefined totalInserted replaced with nuevosMovimientos in sync/route.ts |