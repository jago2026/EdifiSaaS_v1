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
