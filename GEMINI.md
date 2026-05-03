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
    - Uso de `SUPABASE_SERVICE_ROLE_KEY` for backend.
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
- [x] **Sistema de Alertas Universal**: Implementado `registrarAlerta` en el Dashboard. Cada consulta (CANTV, Hidrocapital, Corpoelec) y cada envío de reporte queda registrado en la base de datos (pestaña 🔔 Alertas).
- [x] **Corpoelec Fix (Definitivo)**: Optimizado el scraper con cabeceras de Chrome 122 y un timeout extendido a 20s.
- [x] **Reporte Consolidado Fix**: Corregida la lógica de envío del reporte consolidado.

---

## Fecha: 28 de Abril, 2026

### Objetivo
Corregir error de despliegue en Vercel relacionado con la falta del cliente de Supabase en el Dashboard y centralizar la configuración de Supabase.

### Tareas Realizadas
- [x] **Fix de Despliegue (CRÍTICO)**: Corregido error `Type error: Cannot find name 'supabase'` en `src/app/dashboard/page.tsx`.
- [x] **Centralización de Cliente Supabase**:
    - Creado `src/lib/supabase.ts` para exportar el cliente configurado.
    - Importado `supabase` en `src/app/dashboard/page.tsx`.

---

## Fecha: 30 de Abril, 2026

### Objetivo
Asegurar la estabilidad del Cron Job automático, mejorar la visibilidad de errores en el panel de alertas y optimizar la ejecución de servicios públicos.

### Tareas Realizadas
- [x] **Frecuencia Horaria**: Se actualizó `vercel.json` para ejecutar el cron `/api/cron` cada hora.
- [x] **Integración de Servicios Públicos**: Se incluyó la ejecución automática del cron de Servicios Públicos dentro del flujo principal del cron diario.
- [x] **Eliminación de Errores de Red**: Se refactorizaron las llamadas en el cron de servicios públicos para usar importaciones directas.

---

## Fecha: 2026-05-02 (Gemini)

### Tareas Realizadas

#### 1. Corrección en Ingr/Egr Manual (Caja)
- **Problema:** El botón "+ Nuevo Registro" no realizaba ninguna acción visible (solo agregaba una fila vacía).
- **Solución Aplicada:** 
    - Se implementó un **Formulario Modal Premium** para el ingreso de datos (Fecha, Tipo, Moneda, Monto, Tasa y Descripción).
    - Se añadió soporte **multimoneda (Bs/USD)** con conversión automática.
    - Se mejoró el feedback al usuario con estados de carga y alertas.
- **Bug Fix:** Se corrigió el error "cookies is not defined" en la ruta API `/api/movimientos-manual` añadiendo el import de `next/headers`.

#### 2. Gestión de Miembros (Junta)
- **Mejora UI:** Se cambió la etiqueta de la columna "Email Cron" por **"Email Diario Informe"**.
- **Bug Fix (Persistencia):** Se corrigió el problema donde el cambio de preferencia de email (Sí/No) no se guardaba.
    - **Causa Raíz Final:** Además del cache y RLS, se detectó una validación `isAdmin` en el frontend que impedía la ejecución del clic si el usuario no cumplía con el rol exacto, bloqueando tanto la petición al servidor como los logs de diagnóstico.
    - **Solución Final:** 
        1. Se eliminó la restricción `if (!user?.isAdmin)` en el botón de toggle.
        2. Se mantuvo el uso de `SUPABASE_SERVICE_ROLE_KEY` en el backend para garantizar el éxito de la actualización.
        3. Se desactivó el cache (`cache: 'no-store'`) en la petición `GET`.
        4. Se implementaron logs de auditoría en la pestaña de **🔔 Alertas** para frontend y backend.

#### 4. Corrección de Duplicidad y Flujo de Caja (Actual)
- **Problema 1: Movimientos Duplicados:** Se detectaron múltiples entradas idénticas en el listado de "Movimientos Consolidados" y duplicidad en el "Flujo de Caja Diario".
    - **Causa Raíz:** El proceso de sincronización (`api/sync`) no verificaba la existencia previa de pagos detectados automáticamente antes de insertarlos. Además, el Dashboard (`loadMovimientosDia`) sumaba datos de la tabla de resumen (`movimientos_dia`) junto con las tablas especializadas (`pagos_recibos`, `egresos`, `gastos`), duplicando (o triplicando) los montos.
- **Solución Aplicada:**
    - **Sync API:** Se añadieron verificaciones de existencia (`existingPago`, `existingParcial`) antes de insertar registros en `pagos_recibos` y `movimientos_dia`.
    - **Movimientos-Dia API:** Se refactorizó la agregación para usar las tablas especializadas como fuente primaria y filtrar los registros redundantes de `movimientos_dia`.
    - **Frontend Dashboard:** Se corrigió la construcción del array `flujo` y el mapa `cashFlowMap` para evitar la duplicidad de registros y el doble conteo en las gráficas y casillas de totales.
- **Resultado:** Los totales de ingresos/egresos ahora reflejan la realidad del mes en curso sin acumulaciones erróneas y el listado de movimientos es único por operación.

#### 5. Mejoras en Pestaña Ingresos (Cobranza)
- **Problema:** El listado de cobranza no mostraba la fecha del pago y contenía registros duplicados.
- **Solución Aplicada:**
    - **Frontend Dashboard:** Se añadió la columna **"Fecha"** al listado de Pagos de Condominio por Unidad para mejorar la trazabilidad.
    - **Ingresos API:** Se implementó una lógica de **deduplicación en tiempo real** en `/api/ingresos` para asegurar que el usuario vea registros únicos, incluso si existen duplicados en la base de datos.
    - **Script de Limpieza SQL:** Se creó un script (`supabase/remove_duplicate_pagos.sql`) para que el usuario pueda eliminar permanentemente los registros duplicados de la tabla `pagos_recibos`.
- **Resultado:** Vista de cobranza más clara, profesional y con datos precisos sin repeticiones.

#### 6. Corrección Definitiva de Fechas en Sincronización
- **Problema:** Los egresos y gastos seguían apareciendo con fecha de "hoy" en el sistema aunque pertenecieran a meses pasados, debido a una lógica de asignación incorrecta durante la sincronización.
- **Solución Aplicada:**
    - **Mejora del Scraper:** Se actualizó `parseGastosTable` para extraer la fecha directamente de la tabla de la administradora (soporte para formato de 4 columnas).
    - **Prioridad de Fecha Real:** Se modificó la API de sincronización para que **Egresos** y **Gastos** usen obligatoriamente la fecha extraída de la fuente. Solo si el gasto no tiene fecha, se usa el fin de mes correspondiente.
    - **Movimientos del Día:** Se cambió el comportamiento de la tabla de "Movimientos de Hoy". Ahora, cualquier movimiento nuevo detectado se registra allí con su **fecha real original**, pero marcado como detectado hoy, permitiendo que aparezcan en el resumen diario sin alterar su fecha contable.
    - **Script SQL:** Se actualizó `supabase/limpiar_egresos_gastos_mayo.sql` para una limpieza profunda de registros mal fechados.
- **Resultado:** Reportes precisos con fechas contables correctas y visibilidad inmediata de nuevos hallazgos.

---

## Fecha: 2026-05-03 (Gemini)

### Objetivo
Corregir errores de sincronización y culminar el rediseño del Informe 2 (Premium) para convertirlo en una "Súper Plantilla" ejecutiva y visualmente atractiva.

### Tareas Realizadas

#### 1. Corrección de ReferenceError en Cron (`src/app/api/cron/route.ts`)
- **Problema:** Error `syncMovimientos is not defined` durante la ejecución del cron.
- **Solución:** Se corrigió el alcance de la variable, asegurando su definición en todos los flujos (exitoso y fallback).

#### 2. Rediseño del Informe 2 (Premium) - Súper Plantilla v1.2
- **Reordenamiento de Secciones:** Se movió el bloque de **Distribución de Morosidad** inmediatamente después del **Estado Financiero Actual**, mejorando el flujo lógico de la información financiera.
- **Resumen del Día Completo:** Se completó el bloque narrativo con los párrafos finales de exhortación al pago, instrucciones de consulta detallada y firma de la Junta de Condominio.
- **Mejoras de Formato:** Se añadieron etiquetas `<strong>` para resaltar datos clave y nombres de secciones en el resumen narrativo.

#### 3. Push a Repositorio
- Se sincronizaron las mejoras finales en el repositorio `jago2026/EdifiSaaS_v1`.
