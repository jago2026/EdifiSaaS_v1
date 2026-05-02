# Memoria Histórica de Trabajo - EdifiSaaS v1 (Manus)

## Fecha: 29 de Abril, 2026

### Objetivo
Corregir la visualización de datos futuros en gráficos analíticos y mejorar la gestión multimoneda de movimientos manuales.

### Tareas Realizadas

#### 📊 Corrección de Gráficos Analíticos
- [x] **Análisis de Cobranza**: Se modificó `AnalisisCobranza.tsx` para evitar que la curva del "Mes Actual" grafique puntos desde el día en curso hasta fin de mes. Ahora la línea se corta estrictamente en el día anterior al actual, evitando caídas a cero o saltos incorrectos.
- [x] **Semáforo de Morosidad**: Se ajustó el filtro de `cleanEvolution` en `SemaforoMorosidad.tsx` para asegurar que el gráfico de tendencia histórica no incluya datos del día actual o futuros, eliminando inconsistencias visuales en el cierre de la gráfica.

#### 📝 Mejora de Ingresos/Egresos Manuales
- [x] **Soporte Multimoneda (Bs. / USD)**: Se actualizó la tabla de movimientos manuales para mostrar todos los montos (Saldo Inicial, Egresos, Ingresos, Saldo Final y Saldo Acumulado) tanto en Bolívares (Bs.) como en Dólares (USD), utilizando la tasa BCV del registro.
- [x] **Formulario Popup (Modal)**: Se reemplazó la creación directa de registros vacíos por un formulario modal premium. El usuario ahora puede:
    - Seleccionar fecha, tipo (Ingreso/Egreso) y moneda de entrada (Bs. o USD).
    - Ver la conversión en tiempo real según la tasa BCV antes de guardar.
    - Ingresar descripción obligatoria antes de registrar.
- [x] **Visualización Mejorada**: La tabla ahora tiene un diseño más limpio con doble línea por celda para mostrar ambas monedas, y totales en el pie de página también convertidos.

#### 🛠️ Mantenimiento Técnico
- [x] **Gestión de Estados**: Implementación de estados `showManualForm` y `manualForm` en el Dashboard para manejar la lógica del modal.
- [x] **Lógica de Cálculos**: Se actualizó `createMovimientoManual` para calcular automáticamente el equivalente en Bs. si la entrada es en USD, asegurando la integridad de la base de datos que opera principalmente en moneda local.

### Próximos Pasos Sugeridos
- Implementar la edición de registros existentes también a través de un modal para mantener la consistencia con la creación.
- Añadir un gráfico de torta en la pestaña manual para ver la proporción de Ingresos vs Egresos del mes.
- Exportación de la tabla de movimientos manuales a PDF/Excel.

---

## Fecha: 02 de Mayo, 2026

### Objetivo
Corregir 5 bugs reportados en el sistema de email diario del Cron, detección de pagos parciales, y resumen mensual de ingresos.

### Tareas Realizadas

#### 1. 📧 Configuración de Destinatarios del Email Diario (Cron)
- [x] **`src/app/api/junta/route.ts`**: Se agregó el campo `recibe_email_cron: true` por defecto al insertar nuevos miembros de junta.
- [x] **`src/app/api/junta/route.ts`**: Se agregó el import de `cookies` desde `next/headers` (faltaba).
- [x] **`src/app/api/junta/route.ts`**: Se agregó endpoint `PATCH` para actualizar el campo `recibe_email_cron` de un miembro individualmente.
- [x] **`src/app/api/email/route.ts`**: La query de miembros de junta ahora filtra por `recibe_email_cron != false` (retrocompatible: null/undefined = sí recibe). Solo los miembros con esa casilla activa recibirán el email diario del Cron.
- [x] **`src/app/dashboard/page.tsx`**: Se agregó columna "Email Cron" con toggle en la tabla de miembros de junta, permitiendo activar/desactivar el envío del email diario por miembro.

#### 2. 🧹 Quitar Franja de Saldo Manual del Inicio del Email
- [x] **`src/app/api/email/route.ts`**: Se eliminó el bloque HTML que mostraba "Saldo Manual del Día: X Bs | Y USD" al inicio del cuerpo del email, ya que esa información ya aparece en las tablas del cuerpo.

#### 3. 💰 Detección de Pagos Parciales en Sync
- [x] **`src/app/api/sync/route.ts`**: Se agregó lógica para detectar pagos parciales: cuando una unidad sigue en la lista de deudores pero con deuda menor a la anterior, se calcula el abono (`deudaAnterior - deudaActual`) y se registra en `pagos_recibos` (con `source: 'deteccion_parcial'`), `movimientos`, y `movimientos_dia` (con `tipo: 'recibo'` para que aparezca en el email).
- [x] **`src/app/api/sync/route.ts`**: Los pagos totales también se registran ahora en `movimientos_dia` con `tipo: 'recibo'`, `unidad_apartamento` y `propietario` para mejor trazabilidad.
- [x] Se genera alerta de tipo `ingreso` con emoji 💰 para abonos parciales detectados.

#### 4. 📋 Completar Información en el Cuerpo del Email
- [x] **`src/app/api/email/route.ts`**: La tabla de "Recibos Pagados (Ingresos)" ahora muestra columnas: Apartamento, Propietario, Tipo (🟡 Abono Parcial / ✅ Pago Total), Monto USD, Monto Bs.
- [x] **`src/app/api/email/route.ts`**: La query de egresos ahora filtra por `mes = currentMes` (en lugar de solo los últimos 10 sin filtro de fecha), asegurando que se muestren todos los egresos del mes actual.
- [x] **`src/app/api/email/route.ts`**: Se agregó sección "🧧 Gastos Registrados Hoy" al cuerpo del email, con tabla de Código, Descripción y Monto (Bs) consultando la tabla `gastos` filtrada por mes actual.

#### 5. 📊 Corrección del Resumen Mensual de Ingresos
- [x] **`src/app/api/email/route.ts`**: Se agregó query a `pagos_recibos` para obtener los ingresos reales agrupados por mes (`ingresosPorMes`).
- [x] **`src/app/api/email/route.ts`**: La tabla de Resumen Mensual ahora usa `ingresosPorMes[mesKey]` como fuente de ingresos (suma real de pagos recibidos), con fallback a `cobranza_mes` del balance si no hay datos en `pagos_recibos`. Esto evita que se inflen los ingresos con datos acumulados del balance.

### Notas Técnicas
- La columna `recibe_email_cron` debe existir en la tabla `junta` de Supabase. Si no existe, ejecutar: `ALTER TABLE junta ADD COLUMN IF NOT EXISTS recibe_email_cron BOOLEAN DEFAULT TRUE;`
- Los campos `unidad_apartamento` y `propietario` deben existir en `movimientos_dia`. Si no existen: `ALTER TABLE movimientos_dia ADD COLUMN IF NOT EXISTS unidad_apartamento TEXT; ALTER TABLE movimientos_dia ADD COLUMN IF NOT EXISTS propietario TEXT;`

### Próximos Pasos Sugeridos
- Considerar agregar un campo `num_recibos` al registro de pagos parciales para mayor trazabilidad.
- Revisar si la tabla `gastos` tiene el campo `created_at` indexado para optimizar la query del email.

---

## Fecha: 02 de Mayo, 2026 (Segunda Intervención)

### Objetivo
Corregir el bug de persistencia en la pestaña de Junta donde el campo "Recibe Email" no mantenía su estado visual tras navegar, y asegurar la trazabilidad de los cambios en el backend.

### Tareas Realizadas

#### 1. 🛠️ Corrección de Persistencia en Pestaña Junta
- [x] **`src/app/dashboard/page.tsx`**: Se optimizó la lógica de actualización del estado local en el toggle de "Email Diario Informe". Ahora se asegura que el estado `junta` se actualice correctamente con una copia inmutable del array de miembros.
- [x] **`src/app/dashboard/page.tsx`**: Se agregó el envío del `edificio_id` en el cuerpo de la petición `PATCH` hacia `/api/junta`. Esto permite que el backend registre correctamente las alertas de auditoría asociadas al edificio.
- [x] **`src/app/api/junta/route.ts`**: Se actualizó el endpoint `PATCH` para recibir y procesar el `edificio_id`, mejorando el registro de alertas de tipo `debug` en la base de datos cada vez que se cambia una preferencia de email.

#### 2. 🔍 Auditoría y Mejoras de UX
- [x] Se verificó que la carga de la junta (`loadJunta`) incluya cabeceras de control de caché (`no-store`, `no-cache`) para evitar que el navegador muestre datos obsoletos al volver a la pestaña.
- [x] Se mejoró el mensaje de éxito al actualizar la preferencia para incluir el nombre del miembro y el nuevo estado (SÍ/NO), brindando mejor feedback al usuario.

### Notas Técnicas
- El bug de "pérdida de estado" visual ocurría principalmente por una actualización de estado que no forzaba correctamente el re-render en todos los casos y por la falta de vinculación del log de auditoría con el edificio correcto en el backend.
- Se mantiene la retrocompatibilidad: si `recibe_email_cron` es `null` o `undefined`, el sistema lo interpreta como `true` (Sí recibe).

### Próximos Pasos Sugeridos
- Implementar un sistema de "Undo" (Deshacer) rápido tras cambiar la preferencia de email.
- Agregar un log visual de auditoría en la pestaña de configuración para que el administrador vea quién cambió qué preferencia y cuándo.
- Validar que los correos electrónicos de la junta no estén rebotando (bounce rate) antes de intentar el envío diario.
