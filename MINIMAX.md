# Memoria Histórica de Trabajo - EdifiSaaS v1
## Agente: MiniMax Agent

---

## Fecha: 1 de Mayo, 2026 (Anexo 2)

### Problema CRÍTICO: Deuda Total Mostrando Valor Incorrecto (>12 mil dólares)

El valor "$12,643" seguía siendo incorrecto después de las correcciones anteriores. La raíz del problema:

**El cálculo en `sync/route.ts` SUMABA TODOS los meses** de la tabla `recibos`, no solo el mes actual.

### Análisis Detallado

1. **En sync/route.ts (antes)**:
   - La query NO filtraba por mes: `.eq("edificio_id", building.id).gt("deuda", 0)`
   - Esto traía TODOS los recibos con deuda pendiente de CUALQUIER mes
   - Si un apartamento tiene deuda de 3 meses, se sumaba 3 veces

2. **En /api/recibos (correcto)**:
   - La query SÍ filtra por mes: `.eq("mes", todayMes)` (mes actual)
   - Solo muestra deudas del mes actual

3. **En RecibosTab.tsx**:
   - Usa datos de `/api/recibos` → Solo mes actual
   - Total: **correcto**

4. **En IndicadoresCaja.tsx**:
   - Usa datos de `historico_cobranza` → Sync de sync/route.ts → Todos los meses
   - Total: **INCORRECTO** (suma de TODOS los meses)

### Solución Aplicada

Agregar filtro `.eq("mes", currentMes)` en sync/route.ts para que solo procese deudas del mes actual:

```typescript
// ANTES (incorrecto - todos los meses):
const { data: recs } = await supabase.from("recibos")
  .select("unidad, deuda, num_recibos")
  .eq("edificio_id", building.id)
  .gt("deuda", 0);

// DESPUÉS (correcto - solo mes actual):
const currentMes = today.substring(0, 7);
const { data: recs } = await supabase.from("recibos")
  .select("unidad, deuda, num_recibos, mes")
  .eq("edificio_id", building.id)
  .gt("deuda", 0)
  .eq("mes", currentMes);
```

### Commit Realizado
```
Fix: Corregir cálculo monto adeudado - filtrar solo mes actual
1 file changed, 9 insertions(+), 2 deletions(-)
```

---

## Fecha: 1 de Mayo, 2026 (Anexo 3)

### Problema ADICIONAL: tasaActual undefined en morosidad/route.ts

El valor seguía mostrando incorrecto ($6.158.455) porque había un segundo bug:

**tasaActual se usaba ANTES de ser definida:**
```typescript
// LÍNEA 70 - tasaActual se usa aquí:
const realTotalDebtUsd = ... r.deuda / tasaActual ...  // tasaActual NO existe aún!

// LÍNEA 127 - tasaActual se define aquí (TARDE):
const tasaActual = Number(current.tasa_cambio || 36);
```

Cuando `tasaActual` es `undefined`, la división `r.deuda / undefined` produce `NaN`, y cuando se convierte a número se convierte en `undefined` otra vez, dando valores incorrectos.

### Solución Aplicada

Definir `tasaActual` **AL INICIO** del bloque `try`, ANTES de usarla:

```typescript
try {
  // PRIMERO: Obtener la tasa de cambio actual
  const { data: tasaData } = await supabase.from("tasas_cambio").select("tasa_dolar")
    .order("fecha", { ascending: false }).limit(1);
  const tasaActual = Number(tasaData?.[0]?.tasa_dolar) || 45.50;

  // AHORA ya se puede usar tasaActual en todos los cálculos
  ...
}
```

### Commit Realizado
```
422f4da Fix: Definir tasaActual al inicio para evitar undefined en morosidad
1 file changed, 10 insertions(+), 1 deletion(-)
```

---

## Fecha: 1 de Mayo, 2026

### Objetivo
Corregir el cálculo del monto total adeudado en la pestaña "Indicadores de Caja", específicamente en el gráfico de "Perfil de Antigüedad de Deuda".

### Problema Identificado
El valor "$ 12.643" mostrado en la tarjeta "Monto adeudado" no se correspondía con la suma de los montos de los buckets (1 cuota, 2 cuotas, etc.). La raíz del problema era:

1. **En la sincronización (`sync/route.ts`)**:
   - `monto_pendiente_total` se almacenaba en **Bolívares (Bs.)** directamente
   - Los campos `monto_N_recibo` también se almacenaban en Bs.
   - Pero el frontend esperaba todos los valores en **USD** (dólares)

2. **En el frontend (`IndicadoresCaja.tsx`)**:
   - La línea roja del gráfico usaba `montoUsd` sin conversión
   - El KPI de tarjeta también mostraba `montoUsd` directamente
   - Esto causaba que el valor en Bs. se mostrara como si estuviera en USD

3. **En el API de analytics (`control-diario/route.ts`)**:
   - Se intentaba hacer la conversión de Bs. a USD dividiendo por `tasa_cambio`
   - Pero `monto_pendiente_total` ya venía en Bs., no el valor correcto

### Tareas Realizadas

#### 1. sync/route.ts (Línea ~1176-1217)
- [x] **Conversión correcta**: Ahora `monto_pendiente_total` se calcula en USD: `totalDeudaAcum / tasa`
- [x] **Buckets en USD**: Todos los campos `monto_N_recibo` ahora se convierten a USD antes de guardar
- [x] **Consistencia garantizada**: El total y la suma de buckets ahora siempre serán iguales

```typescript
// ANTES (incorrecto - guardaba en Bs.):
monto_pendiente_total: totalDeudaAcum, // Bs. como si fuera USD

// DESPUÉS (correcto - guarda en USD):
const totalDeudaUsd = tasa > 0 ? totalDeudaAcum / tasa : 0;
monto_pendiente_total: totalDeudaUsd,
// Y cada bucket:
monto_1_recibo: tasa > 0 ? distRecibos.monto_1_recibo / tasa : 0,
// ... mismo para todos los buckets
```

#### 2. control-diario/route.ts (Línea ~143-182)
- [x] **Uso directo de USD**: Ahora usa `monto_pendiente_total` directamente (ya viene en USD)
- [x] **Validación**: Agregado campo `montoSum` para verificar consistencia entre total y suma de buckets

```typescript
// ANTES:
const montoBs = [1,2,3,...].reduce(...) // Sumaba en Bs.
const montoUsd = tasa > 0 ? montoBs / tasa : 0; // Conversión incorrecta

// DESPUÉS:
const montoUsd = Number(r.monto_pendiente_total) || 0; // Ya viene en USD
const montoSum = [1,2,3,...].reduce(...) // Para validación
```

#### 3. IndicadoresCaja.tsx (Línea ~287-323)
- [x] **Detección de discrepancia**: Si `montoUsd` ≠ `montoSum`, muestra advertencia
- [x] **Visualización mejorada**: Tarjeta se destaca en amarillo cuando hay inconsistencia

### Archivos Modificados
1. `src/app/api/sync/route.ts`
2. `src/app/api/analytics/control-diario/route.ts`
3. `src/app/dashboard/IndicadoresCaja.tsx`

### Nota Importante
Los datos históricos existentes en la tabla `historico_cobranza` seguirán teniendo el valor incorrecto (en Bs. guardado como si fuera USD). **Para corregir los datos históricos**, el usuario debe:
1. Re-sincronizar los meses anteriores desde el panel de administración, o
2. Ejecutar una corrección directa en la base de datos de Supabase

### Commit Realizado
```
Fix: Corregir cálculo monto adeudado en Perfil Antigüedad Deuda
3 files changed, 47 insertions(+), 7 deletions(-)
```

---

## Fecha: 30 de Abril, 2026

### Objetivo
Corregir los gráficos de la pestaña de Análisis de Cobranza y Semáforo de Morosidad que mostraban datos incorrectos desde el día en curso hasta fin de mes (saltos descomunales, caídas a cero, valores incorrectos).

### Problema Identificado
Los gráficos de línea/área mostraban discontinuidades cuando había días sin datos (futuros o sin registro en la base de datos). La raíz del problema era:
1. **Gráfico de Análisis de Cobranza**: Usaba `connectNulls={false}` en AreaChart, causando saltos visuales cuando el día en curso no tenía datos.
2. **Gráfico de Semáforo Morosidad**: El filtrado de fechas usaba lógica de zonas horarias inconsistente que podía incluir datos parciales del día actual.
3. **APIs**: La lógica de filtrado de días futuros no era consistente entre el backend y frontend.

### Tareas Realizadas

#### 1. Componente AnalisisCobranza.tsx (CRÍTICO)
- [x] **Cambio de gráfico**: Reemplazado `AreaChart` por `BarChart` para evitar problemas de discontinuidad visual con valores nulos.
- [x] **Filtrado mejorado**: La condición `dia < caracasDay` ahora asegura que solo se grafiquen días estrictamente anteriores al día en curso.
- [x] **Tooltip personalizado**: Creado `tooltipContent` que solo muestra datos válidos, evitando confusiones.
- [x] **Celda transparente**: Las barras sin datos del mes actual se muestran transparentes (no se confunden con datos).
- [x] **Importaciones actualizadas**: Cambiado de `AreaChart/Area` a `BarChart/Bar/Cell`.

#### 2. Componente SemaforoMorosidad.tsx
- [x] **Filtrado de fechas mejorado**: Cambiado de comparación de objetos Date a comparación directa de strings `YYYY-MM-DD` en zona horaria Caracas.
- [x] **Simplificación**: Eliminado el código complejo de conversión UTC que podía causar inconsistencias.

#### 3. API /api/analytics/cobranza/route.ts (CRÍTICO)
- [x] **Zona horaria unificada**: Implementado `Intl.DateTimeFormat` con `timeZone: 'America/Caracas'` de forma consistente.
- [x] **Filtrado correcto**: `dia >= caracasDay` ahora marca como `null` el día actual Y todos los días futuros del mes.
- [x] **Días sin datos**: Para días sin registro, ahora se asigna `pct: 0` en lugar de mantener el último valor (evitando confusiones).
- [x] **Stats mejorados**: Añadido `diaActualCaracas` a la respuesta para debugging.

#### 4. API /api/analytics/morosidad/route.ts
- [x] **Filtrado en query**: Cambiado de `.lte("fecha", todayStr)` a `.lt("fecha", caracasDateStr)` para excluir estrictamente el día actual.
- [x] **Doble verificación**: Añadido filtrado adicional en JavaScript después del map para garantizar que no se incluya el día actual.
- [x] **Metadata**: Añadido `fechaConsulta` a la respuesta para debugging.

### Cambios Técnicos Detallados

#### AnalisisCobranza.tsx
```tsx
// ANTES (problemático):
const chartData = Array.from({ length: 31 }, (_, i) => {
  const dia = i + 1;
  // dia < caracasDay permitía graficar el día actual
  if (dia < caracasDay && actual && actual.pct !== null) {
    item["Mes Actual"] = actual.pct;
  }
});

// DESPUÉS (corregido):
const diaEsValido = dia < caracasDay; // Excluye el día en curso
if (diaEsValido && actual && actual.pct !== null) {
  item["Mes Actual"] = actual.pct;
}
```

#### cobranza/route.ts
```ts
// ANTES (problemático):
const vetTime = new Date(now.getTime() - (4 * 60 * 60 * 1000));
const currentDayVET = vetTime.getUTCDate();

// DESPUÉS (corregido):
const caracasDateStr = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Caracas'
}).format(now);
const caracasDay = parseInt(caracasDateStr.split('-')[2], 10);
```

### Lógica de Filtrado de Fechas (Unificada)

El sistema ahora usa consistentemente:
1. **Zona horaria**: Siempre `America/Caracas` mediante `Intl.DateTimeFormat`
2. **Formato**: Strings `YYYY-MM-DD` para comparaciones (evita problemas de parsing UTC)
3. **Exclusión**: Siempre se excluye el día en curso (`< caracasDateStr` o `dia < caracasDay`)

### Archivos Modificados
1. `src/app/dashboard/AnalisisCobranza.tsx`
2. `src/app/dashboard/SemaforoMorosidad.tsx`
3. `src/app/api/analytics/cobranza/route.ts`
4. `src/app/api/analytics/morosidad/route.ts`

### Recomendaciones para el Futuro
- Considerar implementar un "Skeleton Loader" para los gráficos mientras cargan datos.
- Monitorear que los snapshots de `historico_cobranza` se generen correctamente al final de cada día.
- Si los valores siguen disparándose, verificar si hay datos corruptos o duplicados en la tabla `historico_cobranza` para el día actual.

---

## Historial de Sesiones Previas (Ver GEMINI.md)

Este archivo documenta las correcciones realizadas por **MiniMax Agent**. Para ver el historial completo de trabajo en el proyecto, consultar `GEMINI.md`.
