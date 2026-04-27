# Memoria Histórica de Trabajo - EdifiSaaS v1

## Fecha: 26 de Abril, 2026

### Objetivo
Mejorar la página de ayuda (Manual de Usuario) y diagnosticar/corregir fallos en la ejecución del cron job automático de sincronización y envío de emails.

### Tareas Realizadas
- [x] Identificación del repositorio correcto (`jago2026/EdifiSaaS_v1`).
- [x] Creación de `ManualUsuario.tsx` con diseño premium y navegación corregida mediante `scrollIntoView`.
- [x] Restauración de todo el contenido original del manual sin resúmenes.
- [x] Mejora de `src/app/globals.css` con utilidades para scrollbars.
- [x] **Diagnóstico de Cron**: Identificada rigidez en validación horaria y URL base estática.
- [x] **Mejora de Cron (`src/app/api/cron/route.ts`)**:
    - Implementación de `BASE_URL` dinámica.
    - Añadido parámetro `force=true` para pruebas manuales.
    - Implementación de logs persistentes en la tabla de `alertas` para visibilidad en el UI.
    - Uso de `SUPABASE_SERVICE_ROLE_KEY` para backend.
- [x] **Mejora de Email (`src/app/api/email/route.ts`)**:
    - Añadido log de alerta al enviar correos con éxito para confirmar despacho.
    - Actualizado el asunto del correo de bienvenida a miembros para hacerlo más profesional: "📊 Bienvenido al Sistema de Control Financiero...".

### Resumen de Cambios Técnicos
- **Navegación Manual**: Se cambió a `scrollIntoView` para funcionar dentro del contenedor con scroll del dashboard.
- **Visibilidad de Procesos**: El usuario ahora podrá ver en la sección "Alertas" por qué el cron no se ejecutó (ej: "Hora no coincide") o confirmar que se ejecutó correctamente.

### Fecha: 27 de Abril, 2026

### Objetivo
Desarrollar un módulo de Proyección de Ingresos Diaria hasta fin de mes basado en patrones históricos y escenarios probabilísticos.

### Tareas Realizadas
- [x] **Módulo de Proyección de Ingresos**: Implementado el algoritmo de estimación basado en la especificación técnica (logic AppScript v3.6).
- [x] **API de Proyección (`/api/proyeccion`)**: Creada para extraer historial de pagos (6 meses) y deudas pendientes.
- [x] **Interfaz UI Premium**: Añadida la pestaña "🔮 Proyección de Ingresos" en el grupo de Finanzas.
    - Resumen Ejecutivo con KPIs (Días restantes, Techo de cobranza, Promedio por recibo).
    - Tabla de Escenarios (Optimista 1.3x, Conservador 1.0x, Pesimista 0.6x).
    - Proyección Detallada Día por Día con validación de historial.
    - Segmentación de Deuda por cantidad de recibos pendientes.
    - Recomendaciones automáticas basadas en IA/Lógica de negocio.
- [x] **Actualización de Tipos y Navegación**: Integrado el nuevo tab en el estado del Dashboard.

### Resumen de Cambios Técnicos
- **Lógica de Predicción**: El sistema ahora calcula el promedio de recibos cobrados por día del mes históricamente para predecir el comportamiento futuro.
- **Cálculo Monetario**: Se utiliza el "Promedio por Recibo" actual para convertir las probabilidades de cobro en montos financieros (Bs/USD).
- **Refuerzo de Plan**: Se asignó esta funcionalidad como parte de los planes Premium e IA para incentivar el upgrade.

### Fecha: 27 de Abril, 2026

### Objetivo
Desarrollar un módulo de consulta automática de deudas de servicios públicos (CANTV, Hidrocapital, Corpoelec) basado en portales web oficiales y programación mensual.

### Tareas Realizadas
- [x] **Módulo de Servicios Públicos**: Implementado el sistema de monitoreo de deudas operativas.
- [x] **Scrapers de Servicios**: Portada la lógica de AppScript a Next.js para consultar Hidrocapital (NIC) y Corpoelec (NIC/NCC).
- [x] **APIs de Gestión**:
    - `/api/servicios-publicos/config`: CRUD para configurar números de contrato y días de consulta.
    - `/api/servicios-publicos/consultar`: Ejecución manual y lógica de extracción de datos.
    - `/api/servicios-publicos/cron`: Proceso automático que corre según el día del mes configurado.
- [x] **Sistema de Notificaciones**: Integrada la acción `public_service_notification` en la API de email para informar a la junta sobre deudas detectadas.
- [x] **Interfaz de Usuario**:
    - Nueva pestaña "🚰 Servicios Públicos" en el Dashboard con resumen de deudas.
    - Sección de configuración en "Configuración" para gestionar hasta 2 CANTV, 2 Hidrocapital y 3 Corpoelec (Plan Profesional+).
- [x] **Base de Datos**: Creada migración SQL para las tablas `servicios_publicos_config` y `servicios_publicos_consultas`.

### Resumen de Cambios Técnicos
- **Automatización**: El cron job ahora verifica diariamente si hay consultas de servicios programadas para el día actual del mes.
- **Seguridad**: Implementado RLS en Supabase para proteger las configuraciones de cada edificio.
- **Portabilidad**: Se mantienen los mismos criterios de extracción (Regex e IDs de elementos) que los scripts originales de Google Apps Script.

### Próximos Pasos
- Monitorear posibles cambios en los HTML de las páginas gubernamentales que puedan romper los scrapers.
- Evaluar la integración directa con pasarelas de pago para estos servicios.
