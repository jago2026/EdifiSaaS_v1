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
    - Actualizado el asunto del correo de bienvenida a miembros.

---

## Fecha: 27 de Abril, 2026

### Objetivo
Módulo de Proyección de Ingresos + Corrección cron + Módulo Servicios Públicos completo.

### Tareas Realizadas

#### Módulo Proyección de Ingresos
- [x] API `/api/proyeccion` para estimación basada en historial de 6 meses.
- [x] Pestaña "🔮 Proyección de Ingresos" con tabla de escenarios (Optimista/Conservador/Pesimista).
- [x] Proyección día por día y segmentación de deuda por recibos pendientes.

#### Corrección Cron (CRÍTICA)
- [x] **Bug raíz identificado**: `vercel.json` tenía `"schedule": "0 5 * * *"` = 5:00 AM UTC = 1:00 AM VET. Pero el sistema comparaba la hora VET con la hora configurada (05:00 VET) → nunca coincidían.
- [x] **Fix aplicado**: Cambiado a `"schedule": "0 9 * * *"` = 9:00 AM UTC = 5:00 AM VET (Venezuela UTC-4).
- [x] Eliminada la alerta de debug `⏱️ Verificación de Cron` que spam-eaba la tabla de alertas con mensajes de "Se saltó" en cada invocación del cron.

#### Módulo Servicios Públicos (CORREGIDO Y COMPLETADO)
- [x] **Pestaña "🏛️ Servicios Públicos"** añadida al sidebar de navegación.
- [x] **Reporte Consolidado (Carrito)**: Implementada lógica de acumulación de servicios. Ahora se pueden consultar múltiples servicios (ej: 2 contratos Corpoelec) y enviarlos todos en un único email HTML profesional con la sumatoria total de la deuda.
- [x] **Mejora Crítica Scraper Corpoelec**: Corregido el error `❌ fetch failed` mediante la optimización de cabeceras HTTP (User-Agent real, Origin, Referer) y aumento de timeout a 15s.
- [x] **Sinceración de Hidrocapital**: Corregido bug que devolvía deuda 0 en fallos de extracción. Ahora distingue explícitamente entre "Sin Deuda" y "Error de Portal".
- [x] **Botón "➕ Reporte"**: Añadido en cada tarjeta de servicio para facilitar la consolidación.
- [x] **Envío HTML Profesional**: El reporte consolidado utiliza una plantilla HTML con tablas y formato elegante para la administradora.
- [x] **Campo config en pestaña Configuración**: "📬 Email(s) de la Administradora" integrado.
##### Estado: Servicios soportados
- **CANTV** (📞): Envía email de solicitud (sin portal directo).
- **Hidrocapital** (💧): Consulta saldo real con scraping robusto.
- **Corpoelec** (⚡): Consulta saldo real con scraping optimizado (Fix headers).
##### APIs modificadas/creadas
- **`/api/servicios-publicos/consultar/route.ts`**: Reescrito para robustez y soporte de tipos unificado.
- **`/api/email/route.ts`**: Soporte para envíos de reportes personalizados HTML.
#### Próximos Pasos Sugeridos
- Implementar histórico visual de consultas por servicio en una sub-pestaña.
- Automatizar la consulta en el cron diario para que el reporte llegue solo al email de la junta cada mañana.
- Refactorizar `DashboardPage` (actualmente +6900 líneas) para mejorar el rendimiento de renderizado.

##### Schema Supabase de referencia
```sql
-- servicios_publicos_config
id, edificio_id, tipo (cantv|hidrocapital|corpoelec), identificador, alias, 
dia_consulta (int), ultima_consulta (timestamptz), ultimo_monto (numeric), created_at

-- servicios_publicos_consultas
id, config_id, edificio_id, monto (numeric), detalle (jsonb), 
exitoso (bool), error (text), fecha_consulta (timestamptz)
```

### Próximos Pasos Sugeridos
- Implementar consulta automática de servicios públicos en el cron diario (si el día del mes coincide con `dia_consulta`).
- Agregar campo `email_administradora` al schema de `edificios` en Supabase si no existe (ALTER TABLE edificios ADD COLUMN email_administradora TEXT).
- Agregar botón en el cron para enviar resumen consolidado de servicios al final del proceso.
- Refactorizar `DashboardPage` en sub-componentes para mejorar mantenibilidad (el archivo supera 6800 líneas).
