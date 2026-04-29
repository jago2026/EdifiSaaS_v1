# Memoria Histórica de Trabajo - EdifiSaaS v1
## Agente: MiniMax Agent

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
