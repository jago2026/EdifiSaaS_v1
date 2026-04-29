# CLAUDE.md — Bitácora de trabajo de Claude (Anthropic)

## Propósito
Este archivo registra todo lo trabajado por Claude en el proyecto EdifiSaaS para mantener contexto entre sesiones.

---

## Sesión 3 — 2026-04-29 (gráfico barras mes anterior vs mes actual)

### Cambios aplicados

#### `src/app/api/analytics/morosidad/route.ts`
- Nueva query `snapshotsGrafico` con `lte("fecha", ayerStr)` — garantiza que hoy nunca se grafica.
- Nueva función `buildBarPoints()` que transforma snapshots en puntos con `dia`, `monto`, `montoUsd`, `porcentaje`.
- Nuevo array `barData`: une por día del mes los datos de `mesActualStr` y `mesAnteriorStr`, con claves `mesActual_monto`, `mesActual_montoUsd`, `mesActual_porcentaje`, `mesAnterior_monto`, `mesAnterior_montoUsd`, `mesAnterior_porcentaje`.
- El endpoint ahora devuelve también `barData`, `mesActualLabel`, `mesAnteriorLabel`.

#### `src/app/dashboard/SemaforoMorosidad.tsx`
- Reemplazado el `AreaChart` de evolución por un `BarChart` agrupado.
- Eje X = día del mes (1-31), barras grises = mes anterior, barras rojas = mes actual.
- Leyenda con los labels de mes (YYYY-MM) de cada barra.
- Tooltip muestra el mes completo y el valor formateado según el modo (Bs/USD/%).
- Limpiados imports no usados (`AreaChart`, `Area`, `LineChart`, `Line`).
- Eliminada variable `cleanEvolution` que ya no se necesita.



### Problema persistente
El gráfico "Evolución de la Morosidad" seguía mostrando un salto brusco a ~348% el día de hoy aunque las sesiones anteriores ya aplicaban filtros de fecha. El filtro `s.fecha < hoyVET` en el backend no era suficiente porque:
- La comparación de strings de fecha puede fallar si hay diferencias de formato.
- El filtro se aplicaba **después** de que Supabase ya devolvía todos los registros incluyendo hoy.

### Solución definitiva aplicada — `src/app/api/analytics/morosidad/route.ts`
**Dos queries separadas a Supabase:**

1. **Query KPIs** (`snapshots`): `lte("fecha", todayCaracas)` — incluye hoy, para mostrar los grupos de deudores actuales correctamente.
2. **Query gráfico** (`snapshotsGrafico`): `lte("fecha", ayerStr)` — **ayer** calculado en hora Venezuela (UTC-4), garantizando a nivel de SQL que hoy nunca llega al gráfico, sin importar ningún filtro de JS posterior.

Tabla y campos que usa el gráfico de Evolución de la Morosidad:
- **Tabla:** `historico_cobranza`
- **Campos graficados:**
  - `fecha` → eje X
  - `monto_pendiente_total` → modo "Bs." (monto total de deuda en Bolívares)
  - `monto_pendiente_total / tasa_cambio` → modo "USD"
  - `pct_pendiente` → modo "%" (porcentaje de deuda sobre total facturado)
- **Campos auxiliares:** `tasa_cambio`, `aptos_pendientes_total`

**Por qué el pico era tan alto (348%):** El campo `pct_pendiente` del snapshot del día de hoy contenía un valor incorrecto (probablemente calculado con datos incompletos durante el día, o con una tasa BCV distinta). Al ser el último punto del array, Recharts lo graficaba como el punto final de la línea, creando el salto visible.

### `src/app/dashboard/SemaforoMorosidad.tsx`
- Simplificado `cleanEvolution`: ya no necesita comparar fechas porque el backend garantiza el corte.
- Solo filtra `porcentaje === null || <= 0` cuando el modo activo es `"porcentaje"`.



### Archivos modificados

#### `src/app/api/analytics/morosidad/route.ts`
**Problema:** El gráfico de Evolución de la Morosidad mostraba un salto brusco y brutal el día en curso (ej: 28-abr subía hasta 348%). 
**Causa raíz identificada:**
1. El snapshot del día de hoy es **parcial** (el cron aún no terminó de correr al momento de consultar), lo que genera `pct_pendiente` con valores absurdos (>200%).
2. El campo `pct_pendiente` en `historico_cobranza` se calcula en el backend con datos aún incompletos durante el día.
3. La tasa de cambio puede variar durante el día, afectando el cálculo en USD.

**Corrección aplicada:**
- Se excluye **estrictamente** el día de hoy (`fecha < hoyVET`) del array `evolution` en el backend usando hora Venezuela (UTC-4).
- Se sanea `porcentaje`: si `pct_pendiente > 200` o `<= 0`, se guarda como `null` en lugar de propagarlo al gráfico.
- Se filtra también `monto > 0` para excluir snapshots vacíos.
- Se corrigió el `todayStr` para usar zona horaria `America/Caracas` (antes usaba UTC, que en Venezuela puede adelantar el día).

#### `src/app/dashboard/SemaforoMorosidad.tsx`
**Problema:** El gráfico de Evolución de la Morosidad había sido **eliminado** por otro AI (solo quedaban los botones de Bs/USD/% pero sin el `<AreaChart>`). Además los `dataKey` eran incorrectos (`viewMode` como dataKey pero los campos del objeto se llaman `monto`, `montoUsd`, `porcentaje`).

**Corrección aplicada:**
- Restaurado el bloque `<AreaChart>` con `data={cleanEvolution}`.
- Agregado filtro doble en el frontend: `e.fecha >= hoyCaracas` → excluido.
- Filtro adicional: si `viewMode === "porcentaje"` y `e.porcentaje === null || > 200` → excluido.
- Corregido `dataKey` usando variable `activeDataKey` que mapea correctamente:
  - `"monto"` → campo `monto` (Bs.)
  - `"montoUsd"` → campo `montoUsd` (USD)
  - `"porcentaje"` → campo `porcentaje` (%)
- Agregado `connectNulls={false}` para que los puntos nulos no se conecten con línea.
- Agregado mensaje vacío cuando `cleanEvolution.length === 0`.

#### `src/app/api/analytics/cobranza/route.ts` (sesión anterior)
- Corregido `todayStr` para usar zona horaria Venezuela en lugar de UTC puro.

#### `src/app/dashboard/AnalisisCobranza.tsx` (sesión anterior)
- Reemplazado el algoritmo de `fullChartData` / `chartData` por uno que excluye estrictamente días futuros del array, usando `diaHoyNum` calculado en hora Caracas.
- Días posteriores al día de hoy no tienen la clave `"Mes Actual"` → Recharts no los grafica.

---

## Arquitectura del Proyecto (resumen)

- **Framework:** Next.js 14+ (App Router), TypeScript
- **Base de datos:** Supabase (PostgreSQL)
- **Deploy:** Vercel
- **Frontend principal:** `src/app/dashboard/page.tsx` (~7090 líneas)
- **Componentes analíticos:**
  - `AnalisisCobranza.tsx` — Curva comparativa de recaudación (mes actual vs anterior)
  - `SemaforoMorosidad.tsx` — Antigüedad de deuda + evolución histórica de morosidad
  - `SaludFinanciera.tsx` — KPIs de salud financiera
  - `SimuladorInversiones.tsx` — Simulador de fondos de reserva

## Tabla clave: `historico_cobranza`
Columnas relevantes para los gráficos de morosidad:
- `fecha` — fecha del snapshot (formato `YYYY-MM-DD`)
- `pct_pagado` — % pagado del mes (para curva de cobranza)
- `pct_pendiente` — % pendiente de cobro (para evolución de morosidad) ⚠️ puede ser > 100% si la tasa BCV varió
- `monto_pendiente_total` — monto total en mora en Bs.
- `tasa_cambio` — tasa BCV del día del snapshot
- `aptos_pendientes_total` — cantidad de apartamentos con deuda

## Zonas horarias
- **Venezuela = UTC-4** (sin horario de verano, siempre fijo)
- Todos los `todayStr` deben usar `'America/Caracas'` para no adelantar el día cuando ya es medianoche UTC pero son las 8pm en Venezuela.

---

## Pendiente / Mejoras sugeridas

1. **Columna `pct_pendiente`** debería ser calculada con validación en el cron: si es > 150%, loguear y no guardar ese valor hasta el día siguiente.
2. **Pestaña Ingr/Egr Manual:** Rediseño con modal popup y soporte Bs./USD (trabajado en sesión anterior, en revisión).
3. **Tabla `movimientos_manual`:** Agregar columna `moneda` ('bs' | 'usd') para poder registrar el tipo de moneda original del movimiento.
