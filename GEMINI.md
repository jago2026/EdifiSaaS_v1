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

#### Módulo Servicios Públicos (CRITICAL FIXES & ALERTS)
- [x] **Sistema de Alertas Universal**: Implementado `registrarAlerta` en el Dashboard. Cada consulta (CANTV, Hidrocapital, Corpoelec) y cada envío de reporte queda registrado en la base de datos (pestaña 🔔 Alertas). Esto permite diagnosticar errores de red o bloqueos de portal de forma transparente.
- [x] **Corpoelec Fix (Definitivo)**: Optimizado el scraper con cabeceras de Chrome 122, `Connection: keep-alive` y un timeout extendido a 20s. Esto resuelve el error `fetch failed` que ocurría por bloqueos de seguridad del portal oficial.
- [x] **Reporte Consolidado Fix**: Corregida la lógica de envío del reporte consolidado. Ahora valida destinatarios y captura errores específicos de la API de email, registrando el resultado en el log de alertas.
- [x] **Sinceración de Logs**: Los mensajes de error ahora son descriptivos y técnicos, visibles tanto en el UI como en el historial de alertas.
##### Próximos Pasos
- Monitorear la estabilidad de los portales gubernamentales desde el log de alertas.
- Implementar reintentos automáticos (retry logic) en caso de fallos de red 503/504 de los portales.
- Refactorizar el Dashboard para extraer el módulo de servicios a un componente independiente.

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
