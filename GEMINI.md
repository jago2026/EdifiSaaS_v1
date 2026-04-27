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

#### Módulo Servicios Públicos (NUEVO)
- [x] **Pestaña "🏛️ Servicios Públicos"** añadida al sidebar de navegación.
- [x] **Tab type** extendido con `"servicios-publicos"`.
- [x] **Interface Building** actualizada con campo `email_administradora`.
- [x] **editConfig state** añadido campo `email_administradora`.
- [x] **Campo config en pestaña Configuración**: "📬 Email(s) de la Administradora" para configurar a quién enviar notificaciones de servicios públicos.

##### Estado: Servicios soportados
- **CANTV** (📞): Hasta 2 N° de Línea. Sin portal de consulta directa → botón envía email de solicitud.
- **Hidrocapital** (💧): Hasta 2 N° de Contrato (NIC). Consulta saldo real en `pagoenlinea.hidrocapital.gob.ve`.
- **Corpoelec** (⚡): Hasta 3 N° de Cuenta Contrato (NCC). Consulta saldo real en `ov-capital.corpoelec.gob.ve`.

##### Funcionalidades implementadas en la UI
- Botón **"Consultar Saldo"** por servicio (manual, en cualquier momento).
- Botón **"Enviar Email ▾"** con dropdown: → A la Administradora / → A mí / → A la Junta.
- Resultado de consulta mostrado en tarjetas (N° Contrato, Recibos, Deuda para Hidrocapital; Titular, Cta.Contrato, Energía Vencida, Total a Pagar para Corpoelec).
- Mensajes de estado (✅/❌) visibles al usuario tras cada acción.
- Formulario para **agregar nuevos servicios** (tipo + identificador + alias + día del mes).
- Botón **eliminar** (solo para admins).
- Visualización de **última consulta** y **último monto** almacenado.

##### APIs modificadas/creadas
- **`/api/servicios-publicos/consultar/route.ts`** — Reescrito completo:
  - Console.log detallado en cada paso (HTTP status, bytes recibidos, datos extraídos).
  - Schema corregido: usa columnas `monto`, `detalle`, `exitoso`, `error` (sin `recibos_pendientes`, `estado`, `error_msg` que no existen en Supabase).
  - Mensajes de error descriptivos para el usuario.
- **`/api/email/route.ts`** — Nueva acción `"servicios_publicos_email"`:
  - Genera emails formales para CANTV, Hidrocapital y Corpoelec.
  - Incluye bloque de mensaje listo para copiar a WhatsApp.
  - Soporte de destinatario: administradora / usuario actual / junta / lista personalizada.

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
