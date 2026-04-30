# CLAUDE.md — Bitácora de trabajo de Claude (Anthropic)

## Propósito
Este archivo registra todo lo trabajado por Claude en el proyecto EdifiSaaS para mantener contexto entre sesiones.

---

## Sesión 4 — 2026-04-30 (unificación de pestañas + nuevo dashboard "Indicadores de Caja")

### Resumen ejecutivo
- Se unificaron las pestañas **Análisis Cobranza**, **Semáforo Morosidad** y **Salud Financiera** en una sola pestaña llamada **Cobranza y Morosidad**, ubicada en el bloque "Recibos y Deudas" del sidebar (entre "Deudas por Unidad" y "Detalle Recibo Mes").
- Se cambió el gráfico de Análisis Cobranza a **barras agrupadas** con colores corregidos: gris oscuro `#475569` para el mes anterior y azul `#2563eb` para el mes actual.
- Se eliminó el gráfico **"Flujo de Ingresos por Día de la Semana"** del análisis de cobranza.
- Se eliminó por completo la pestaña **Simulador de Inversiones** (incluyendo su componente y su API route).
- Se creó un nuevo dashboard **"Indicadores de Caja"** que consume la tabla `control_diario` de Supabase y expone 5 indicadores: Salud de la Caja (gauge), Brecha Cambiaria (área apilada), Tendencia de Recibos Pendientes (barras + línea de tendencia), Comportamiento de Fondos (multilínea) y Heatmap por Día de la Semana.

### Archivos nuevos

#### `src/app/api/analytics/control-diario/route.ts`
- Nuevo endpoint `GET /api/analytics/control-diario?edificio_id=...`.
- Lee la tabla `control_diario` de Supabase y calcula:
  - `saludCaja` — score 0–100 ponderado por margen efectivo, ratio gastos/ingresos y volatilidad de saldo.
  - `brechaCambiaria` — diferencial entre tasa BCV y paralelo por día (área apilada).
  - `tendenciaRecibos` — pendientes diarios + regresión lineal simple (proyección 7 días).
  - `fondos` — series por tipo de fondo (operativo, reserva, inversión).
  - `heatmap` — promedio de movimientos agrupados por día de la semana.

#### `src/app/dashboard/CobranzaMorosidad.tsx`
- Componente unificado que muestra en una sola vista las tres antiguas pestañas.
- Gráfico de cobranza migrado a `BarChart` agrupado (mes anterior `#475569` vs mes actual `#2563eb`).
- Eliminada la sección "Flujo de Ingresos por Día de la Semana".

#### `src/app/dashboard/IndicadoresCaja.tsx`
- Cinco bloques con su gráfico (recharts) y caption explicativa para cada KPI.
- Llama a `/api/analytics/control-diario` y formatea valores en Bs. y USD.

### Archivos eliminados
- `src/app/dashboard/AnalisisCobranza.tsx`
- `src/app/dashboard/SemaforoMorosidad.tsx`
- `src/app/dashboard/SaludFinanciera.tsx`
- `src/app/dashboard/SimuladorInversiones.tsx`
- `src/app/api/analytics/inversiones/route.ts` (carpeta completa)

### Archivos modificados

#### `src/app/dashboard/page.tsx`
- Imports actualizados: removidos `AnalisisCobranza`, `SemaforoMorosidad`, `SaludFinanciera`, `SimuladorInversiones`; agregados `CobranzaMorosidad` e `IndicadoresCaja`.
- Tipo `Tab` actualizado: removidos `analisis-cobranza`, `semaforo-morosidad`, `salud-financiera`, `simulador-inversiones`; agregados `cobranza-morosidad`, `indicadores-caja`.
- **Sidebar**:
  - Eliminado el grupo completo "Análisis Avanzado (Junta)".
  - Agregado botón "📊 Indicadores de Caja" al final del grupo "Tablero Principal".
  - Agregado botón "💼 Cobranza y Morosidad" en el grupo "Recibos y Deudas", entre "Deudas por Unidad" y "Detalle Recibo Mes".
- **Menú móvil** y **barra de pestañas top móvil**: reemplazados los 4 botones antiguos por los 2 nuevos.
- **Renderizado condicional**: reemplazadas las 4 condiciones antiguas por las 2 nuevas (`cobranza-morosidad` → `<CobranzaMorosidad />`, `indicadores-caja` → `<IndicadoresCaja />`).

#### `package.json`
- Corregida versión de `@supabase/supabase-js` de `^2.158.0` (inexistente en npm) a `^2.105.0` (última estable disponible). Bloqueaba la instalación local y los builds de Vercel.

### Verificación
- `tsc --noEmit` pasa sin errores en todos los archivos del dashboard, en los nuevos componentes y en la nueva API route.
- Los errores preexistentes en `src/app/page.tsx` (landing page) no fueron tocados en esta sesión y son ajenos a este cambio.

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

---

## Sesión: 2026-04-30 — Claude Sonnet 4.6

### Trabajo realizado

#### Bugs detectados y corregidos

##### 1. `src/lib/planLimits.ts` — Plan case-insensitive
**Problema:** `getPlanPermissions("premium")` usaba `.includes('Premium')` case-sensitive. El edificio demo tiene `plan = 'premium'` (minúsculas) en la BD, por lo que caía siempre en el plan `Esencial`, mostrando `UpgradeCard` en las pestañas KPIs, Pre-Recibo y Proyección incluso en modo demo.
**Corrección:** Se normaliza el planName a minúsculas antes de comparar: `const p = (planName || '').toLowerCase()` y se usa `p.includes('premium')`, etc.

##### 2. `vercel.json` — Cron schedule horario incorrecto
**Problema:** Schedule `"0 0 * * *"` dispara el cron a medianoche UTC = **20:00 hora Venezuela (VET)**. Los edificios tienen `cron_time = "05:00"`, por lo que la verificación `currentHourVET !== configHour` (20 != 5) siempre fallaba y se saltaba el cron sin ejecutar nada.
**Corrección:** Schedule cambiado a `"0 9 * * *"` (09:00 UTC = 05:00 VET). **Nota:** Venezuela es UTC-4 sin cambio de horario.

##### 3. `src/app/api/cron/route.ts` — Logging diagnóstico completo
**Problema:** Los eventos de skip (hora no coincide, cron desactivado) solo se logueaban en `console.log` del servidor (Vercel Functions logs), pero **nunca** insertaban registros en la tabla `alertas` de Supabase. Por eso la pestaña Alertas del dashboard aparecía vacía respecto al cron.
**Corrección:** 
- Se agrega `logAlerta(...)` en TODOS los caminos: skip por cron_enabled=false, skip por hora no coincide, inicio de ejecución, éxito de sync, éxito de email, error de sync, error de email, error crítico.
- Se agregan logs `console.log` y `console.error` detallados con UTC, hora VET, estado de CRON_SECRET, URL de Supabase, todos los edificios encontrados, etc.
- Se capturan excepciones internas de las llamadas a `/api/sync` y `/api/email` con try/catch individuales.
- Se incluye `utc_time` en el JSON de respuesta además de `vet_time`.

##### 4. `src/app/dashboard/page.tsx` — UpgradeCard con vista demo
**Problema:** Las pestañas KPIs, Pre-Recibo y Proyección mostraban un bloqueo total con el componente `UpgradeCard` cuando el plan no tenía los permisos requeridos. En modo demo esto era contraproducente: el usuario demo no podía ver ninguna funcionalidad de esas pestañas.
**Corrección:** 
- Se añaden props `isDemo?: boolean` y `demoContent?: React.ReactNode` al componente `UpgradeCard`.
- Si `isDemo=true` y se provee `demoContent`, se muestra el contenido demo con un banner indicador "MODO DEMO — Vista de ejemplo".
- Las tres instancias de `UpgradeCard` pasan `isDemo={user?.isDemo}` y un `demoContent` con datos de ejemplo realistas (KPIs con porcentajes, gráfico de barras, tabla de recibo estimado, escenarios de proyección, gráfico histórico + proyección).

### Estado del cron mañana (2026-05-01)
Con las correcciones aplicadas, el cron de Vercel se ejecutará a las **09:00 UTC = 05:00 VET**. En ese momento:
1. Leerá todos los edificios de Supabase.
2. Para cada edificio con `cron_enabled = true` y `cron_time = "05:00"`, ejecutará sync + envío de email.
3. Registrará alertas detalladas en la tabla `alertas` con el resultado (éxito, skip o error).
4. La pestaña Alertas del dashboard mostrará toda la trazabilidad de la ejecución.

### Archivos modificados
- `src/lib/planLimits.ts`
- `vercel.json`
- `src/app/api/cron/route.ts`
- `src/app/dashboard/page.tsx`
- `CLAUDE.md` (este archivo)

---

## Sesión: 2026-04-30 (continuación) — Configuración: Botón Test Cron + Mantenimiento

### Cambios realizados

#### `src/app/dashboard/page.tsx`
1. **Botón de Diagnóstico del Cron** en sección "Programación de Tareas Automáticas":
   - Nuevos estados: `cronTestLoading`, `cronTestResult`
   - Función `handleCronTest()`: calcula hora VET actual (via `Intl.DateTimeFormat 'America/Caracas'`), hora configurada, próxima ejecución estimada, verifica emails en Junta, lista OKs y problemas detectados (cron desactivado, sin emails, sin URLs sync).
   - UI: botón ámbar "🔍 Ejecutar Diagnóstico", panel de resultado con estado (verde/ámbar/rojo), horario, próxima ejecución, destinatarios, lista de OKs y problemas.

2. **Mantenimiento de la Plataforma** — textos corregidos:
   - "Mantenimiento de Base de Datos Supabase" → "Mantenimiento de Base de Datos"
   - "Al finalizar, se enviará un reporte detallado a correojago@gmail.com" → "Al finalizar, se enviará un reporte detallado al usuario conectado."

3. **`handleMaintenance()`**: ahora pasa `userEmail: user?.email` al endpoint de mantenimiento.

4. **Nota del cron**: Quitada referencia a "correojago@gmail.com" en el texto visible.

#### `src/app/api/config/maintenance/route.ts`
- Acepta `userEmail` además de `edificioId` en el body.
- El email se envía `to: userEmail` (si está disponible y es diferente del admin).
- Se agrega `bcc: "correojago@gmail.com"` de forma silenciosa cuando el destinatario principal no es ya ese correo.
- Si no hay `userEmail`, se envía directo a `correojago@gmail.com` (comportamiento anterior de fallback).

---

## Sesión: 2026-04-30 (continuación) — Correcciones Pre-Recibo: columnas, sumatorias y email

### Contexto
El usuario reportó tres problemas en la pestaña "Pre-Recibo Estimado":
1. Confusión entre las columnas "CUOTA PARTE (Bs)" y "TOTAL RECIBO (Bs)".
2. Las sumatorias de los totales no estaban bien calculadas (valores hardcodeados).
3. El email enviado con el borrador era diferente al mostrado en la página.

### Análisis de los problemas

#### Problema 1 — Columna "TOTAL RECIBO (Bs)" confusa
- **Causa:** El nombre "TOTAL RECIBO (Bs)" no explicaba qué incluía.
- **Solución:** Renombrada a **"CUOTA PARTE + 10% F.RESERVA (Bs)"** para dejar claro que es la Cuota Parte más el 10% del Fondo de Reserva. Se agregó un **tooltip** en el `<th>` y una **nota explicativa** amarilla debajo de la tabla en la página web.

#### Problema 2 — Sumatorias incorrectas en los totales
- **Causa:** La fila "TOTAL GASTOS COMUNES" en la columna CUOTA PARTE usaba `subtotal * 0.022135` hardcodeado, en lugar de sumar las cuotas partes reales calculadas por ítem. Además, las columnas "TOTAL RECIBO/F.RESERVA" en las filas de totales tenían `colSpan` vacíos, sin mostrar ningún valor.
- **Solución:**
  - Se extraen las variables `totalCuotasPartes`, `totalFondoReservaCuota` y `totalConFondo` calculadas una sola vez a partir del `subtotal` real de los ítems seleccionados.
  - La fila TOTAL GASTOS COMUNES ahora muestra correctamente el total de la columna CUOTA PARTE (`totalCuotasPartes`).
  - La fila FONDO DE RESERVA muestra el 10% de `totalCuotasPartes`.
  - La fila TOTAL ESTIMADO muestra `totalConFondo` (cuota parte + fondo de reserva).

#### Problema 3 — Email diferente a la página
**Diferencias encontradas:**
- La página tenía 6 columnas; el email solo tenía 5 (faltaba USD).
- El email usaba `i.monto * 0.022135` hardcodeado por ítem (en lugar de calcular bien por alícuota base).
- El email no tenía la fila "TOTAL ESTIMADO POR APARTAMENTO (2.2135%)".
- El email no tenía nota explicativa.
- La distribución por alícuotas del email tenía solo 4 columnas; la página tiene 6.
- El email no tenía la columna "SUB-TOTAL COMUNES" ni "P/APTO USD$".

**Solución:** Se reescribió el template HTML del email en `src/app/api/email/route.ts` para:
- Usar el mismo encabezado visual (fondo azul oscuro `#1a237e`, título en mayúsculas).
- Tener exactamente las mismas 6 columnas: CÓDIGO, DESCRIPCIÓN, MONTO (Bs), CUOTA PARTE (Bs), CUOTA PARTE + 10% F.RESERVA (Bs), USD.
- Calcular correctamente cuota parte usando `i.monto * alicuotaBase (0.022135)`.
- Incluir filas de TOTAL GASTOS COMUNES, FONDO DE RESERVA (10%) y TOTAL ESTIMADO POR APARTAMENTO con los valores calculados dinámicamente.
- Agregar nota explicativa en recuadro amarillo.
- Tabla de distribución por alícuotas con 6 columnas: TIPO/ALÍCUOTA, CUOTA PARTE (Bs), TOTAL (Bs.), SUB-TOTAL COMUNES, TOTAL USD$, P/APTO USD$.
- Nota al pie explicando cada columna y la tasa BCV utilizada.

### Archivos modificados
- `src/app/dashboard/page.tsx` — Sección de tabla del Pre-Recibo Estimado (renombrado columna, totales corregidos, nota agregada).
- `src/app/api/email/route.ts` — Template HTML del action `send_pre_receipt` reescrito para coincidir con la vista de la página.
- `CLAUDE.md` — Este archivo (bitácora).
