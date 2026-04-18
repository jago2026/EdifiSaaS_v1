# Active Context: CondominioSaaS - Condominium Finance Management

## Current State

**Project Status**: In Development

CondominioSaaS is a web application for managing condominium finances. Users can register buildings with admin credentials from RAScacielo-type systems, scrape financial data (receipts, expenses), and view synced data in a dashboard.

## Recently Completed

- [x] Fix KPIs charts chronological order - added normalizeMonth() function to handle various month formats (1-2024, 01-2024, 2024-1)
- [x] Sort balances chronologically using normalized date (YYYY-MM format)
- [x] Format labels as 'Ene 2024', 'Feb 2024', etc.
- [x] Add new financial KPIs: total debt, units count, average alicuota
- [x] Updated charts with better formatting (Y-axis with M/K suffixes)
- [x] Added Egresos por Mes chart
- [x] Improved Fondo de Reserva chart
- [x] Added indicator cards: Deuda Total, Total Unidades, Alicuota Promedio

## Currently Working On

KPIs tab shows financial charts for the condominium. Fixed the chronological sorting issue where months were out of order.

## Next Steps (for next session)

1. Add more chart options (pie chart for expense categories)
2. Export to Excel/PDF functionality
3. Add email notifications for alerts

## Session History

| Date | Changes |
|------|---------|
| 2026-04-13 | Fixed KPIs charts - normalizeMonth() for chronological sorting, added new financial charts |
| 2026-04-13 | Fixed build error - undefined totalInserted replaced with nuevosMovimientos in sync/route.ts |
| 2026-04-13 | Debug balance sync - added r=2 HTML logging, force save even if zeros to debug parsing |
| 2026-04-13 | Added more balance parsing debug (table counts), added UNIQUE constraint on balances(edificio_id, mes) |
