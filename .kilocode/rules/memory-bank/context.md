# Active Context: CondominioSaaS - Condominium Finance Management

## Current State

**Project Status**: In Development

CondominioSaaS is a web application for managing condominium finances. Users can register buildings with admin credentials from RAScacielo-type systems, scrape financial data (receipts, expenses), and view synced data in a dashboard.

## Recently Completed

- [x] Add payment detection logic - compares previous sync receipts with current to detect which apartments paid
- [x] Fix Gastos regex extraction - extracts 12 expenses correctly from HTML
- [x] Fix Balance display - shows all fields matching administrator website (including saldo in separator rows)
- [x] Fix Egresos summary block - use `egresosSummary` instead of incorrect `gastosSummary`
- [x] Add TOTAL line at end of Gastos list in UI
- [x] Add missing columns to Supabase tables (hash, sincronizado, etc.)
- [x] Fix KPIs charts chronological order - added normalizeMonth() function to handle various month formats (1-2024, 01-2024, 2024-1)
- [x] Sort balances chronologically using normalized date (YYYY-MM format)
- [x] Format labels as 'Ene 2024', 'Feb 2024', etc.
- [x] Add new financial KPIs: total debt, units count, average alicuota
- [x] Updated charts with better formatting (Y-axis with M/K suffixes)
- [x] Added Egresos por Mes chart
- [x] Improved Fondo de Reserva chart
- [x] Added indicator cards: Deuda Total, Total Unidades, Alicuota Promedio

## Currently Working On

Payment detection logic added to sync route - compares previous receipts with new ones to find apartments where debt decreased.

## Next Steps (for next session)

1. Verify payment detection works - run sync and check if payments are saved to movimientos table
2. Test Ingresos tab displays detected payments correctly
3. Add more chart options (pie chart for expense categories)

## Session History

| Date | Changes |
|------|---------|
| 2026-04-18 | Added payment detection logic - compares previous sync with current to detect payments |
| 2026-04-13 | Fixed KPIs charts - normalizeMonth() for chronological sorting, added new financial charts |
| 2026-04-13 | Fixed build error - undefined totalInserted replaced with nuevosMovimientos in sync/route.ts |
| 2026-04-13 | Debug balance sync - added r=2 HTML logging, force save even if zeros to debug parsing |
| 2026-04-13 | Added more balance parsing debug (table counts), added UNIQUE constraint on balances(edificio_id, mes) |
