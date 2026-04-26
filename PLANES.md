# Estrategia de Planes y Valor Agregado - EdifiSaaS

Este documento define la estructura de niveles (tiers) y las funcionalidades de soporte a la toma de decisiones para la Junta de Condominio.

## 1. Estructura de Planes (Bloqueos y Desbloqueos)

### Plan Básico: "El Vigilante"
*Enfocado en la transparencia operativa básica.*
- **Acceso:** Vista de Dashboard simplificada.
- **Limitación Temporal:** Consulta de movimientos de los últimos 90 días.
- **Reportes:** 1 reporte diario vía email a 1 solo destinatario.
- **Unidades:** Máximo 30.
- **Bloqueo:** No permite exportar datos ni ver KPIs de tendencia.

### Plan Profesional: "Gestión Activa"
*Herramientas para auditoría y control de la administradora.*
- **Acceso:** Dashboard completo con KPIs de Morosidad y Tendencia de Gastos.
- **Historial:** Acceso ilimitado a todos los movimientos históricos sincronizados.
- **Módulo de Alícuotas:** Comparativa automática entre el gasto real del mes y lo cobrado por alícuota.
- **Análisis Cambiario:** Acceso a la tasa BCV histórica vinculada a los movimientos.
- **Exportación:** Botones de descarga CSV/Excel habilitados en todas las tablas.

### Plan Empresarial: "Control Estratégico"
*Para edificios de alta complejidad y centros comerciales.*
- **Recibos Proyectados:** Generación de un borrador de recibo basado en gastos cargados (antes del cierre de la administradora).
- **Conciliación:** Herramienta de cruce entre movimientos bancarios y reportes de la administradora.
- **Multimoneda:** Flujo de caja con capacidad de switch instantáneo entre $ y Bs.
- **Edificios Mixtos:** Segmentación de gastos por zonas (Comercial vs Residencial).
- **Semáforos de Fondos:** Alertas visuales sobre el estado de los fondos de reserva y prestaciones.
- **Alertas WhatsApp:** Notificaciones críticas (ej. saldo de caja bajo o egreso inusual).

### Plan IA: "Inteligencia Predictiva"
*El consultor financiero virtual de la Junta.*
- **Asistente Virtual:** Chat interactivo para preguntas financieras (ej. "¿Podemos pagar el seguro en una sola cuota?").
- **Diferencial Cambiario 'Invisible':** Reporte de pérdida de poder adquisitivo por retraso en cobranza.
- **Predicciones:** Proyección de flujo de caja a 6 meses basada en estacionalidad de gastos.

---

## 2. Herramientas de Valor Agregado para la Junta

Para facilitar la gestión y toma de decisiones, el sistema implementará:

### A. Soporte a Decisiones Financieras
1. **Análisis de Variación de Gastos:** Comparativa porcentual mes a mes. Si un gasto fijo sube >15%, el sistema lo marca en rojo.
2. **Carga de Presupuestos:** Espacio para que la Junta suba presupuestos de obras y el sistema los "simule" en el flujo de caja futuro.
3. **Bitácora de Acuerdos:** Vinculación de comentarios de texto a gastos específicos (ej. "Gasto aprobado en Acta #45").

### B. Control de Edificios Mixtos
- Capacidad de asignar centros de costo a unidades específicas para que la Junta comercial no vea lo residencial y viceversa, manteniendo un flujo de caja consolidado para la administración general.

### C. Auditoría "Ready"
- Generación de un paquete de datos mensual que incluye: Conciliación, Resumen de Ingresos, Mayores analíticos y KPIs, listo para ser enviado a un auditor externo.

---
*Nota: La gestión de proveedores se maneja de forma externa en un sistema independiente.*
