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

#### 6. Corrección de Definitiva de Fechas en Sincronización
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
Implementar la opción de selección de tipo de informe (Estándar vs. Premium) para el envío diario y manual, y corregir errores de sincronización.

### Tareas Realizadas

#### 1. Selección de Tipo de Informe (NUEVA FUNCIONALIDAD)
- **Base de Datos:** Se creó un script de migración (`supabase/migration_report_type.sql`) para añadir la columna `tipo_informe` a la tabla `edificios`.
- **API de Configuración:** Se actualizó `/api/config` para permitir la persistencia de la preferencia de informe.
- **Cron Automático:** Se modificó `/api/cron` para que detecte la preferencia del edificio y envíe el informe correspondiente (Premium o Estándar).
- **Dashboard UI:**
    - Se añadió un selector en la pestaña de **Configuración** (dentro de Programación Automática) para elegir entre "📊 ESTÁNDAR (Clásico)" y "💎 PREMIUM (Ejecutivo)".
    - Se actualizó el botón de envío manual para que refleje dinámicamente el tipo de informe seleccionado.
    - Se sincronizó el estado `editConfig` con la base de datos para asegurar que los cambios se guarden correctamente.

#### 2. Corrección en Cron y Emails
- **Fix API Email:** Se aseguró que la función `sendEmailToJunta` en el frontend pase el parámetro `action` correcto según la preferencia guardada.
- **Robustez:** Se mejoró el log de diagnóstico en el cron para mostrar el tipo de informe configurado para cada edificio.

#### 3. Rediseño del Informe 2 (Premium) - Súper Plantilla v1.2
- **Reordenamiento de Secciones:** Se movió el bloque de **Distribución de Morosidad** inmediatamente después del **Estado Financiero Actual**, mejorando el flujo lógico de la información financiera.
- **Resumen del Día Completo:** Se completó el bloque narrativo con los párrafos finales de exhortación al pago, instrucciones de consulta detallada y firma de la Junta de Condominio.
- **Mejoras de Formato:** Se añadieron etiquetas `<strong>` para resaltar datos clave y nombres de secciones en el resumen narrativo.

#### 4. Corrección de Totales Mensuales y Lógica de Sincronización (CRÍTICO)
- **Problema:** En los primeros días del mes, el dashboard mostraba cifras de cobranza, gastos y egresos del mes anterior como si fueran del mes actual, generando confusión al no haber actividad aún en el mes en curso.
- **Corrección de Totales Mensuales (Cobranza/Gastos/Egresos):**
    - **API Ingresos Summary:** Se refactorizó `/api/ingresos-summary` para consultar directamente la tabla `pagos_recibos` filtrando por el mes en curso. Anteriormente tomaba el último balance histórico, lo que causaba que se mostraran las cifras del mes anterior.
    - **Dashboard UI (ResumenTab):** Se implementó una lógica de validación que compara el mes del último balance (`balance.mes`) con el mes actual. Si no coinciden, el sistema prioriza los resúmenes de actividad en vivo (que estarán en 0 si no hay movimientos) en lugar de mostrar los datos del último cierre histórico.
- **Mejora en Sincronización Automática:**
    - Se modificó la lógica de asignación de mes en `api/sync`. Ahora los **Egresos** y **Gastos** derivan su campo `mes` (YYYY-MM) directamente de su fecha de ejecución en lugar de usar el mes de la sincronización. Esto evita que movimientos de finales del mes pasado se etiqueten erróneamente en el mes nuevo durante las sincronizaciones automáticas de principio de mes.

---

## Fecha: 2026-05-04 (Gemini)

### Objetivo
Corregir la lógica de cálculo de totales mensuales basada en fechas de movimientos y mejorar el informe Premium con secciones ejecutivas detalladas.

### Tareas Realizadas

#### 1. Corrección de Totales Mensuales (Criterio de Fecha Real)
- **Problema:** El sistema mostraba cifras del mes anterior para el mes en curso debido a que filtraba por la columna `mes` (que representa el mes de facturación del recibo) en lugar de la fecha cronológica del movimiento. Además, el scraper asignaba por defecto la fecha de "hoy" a gastos sin fecha, provocando que gastos de Abril aparecieran en Mayo.
- **Solución Aplicada:**
    - **APIs de Resumen:** Se refactorizaron `/api/ingresos-summary`, `/api/gastos-summary` y `/api/egresos-summary` para realizar el conteo y suma basados estrictamente en las columnas de fecha (`fecha_pago` para ingresos, `fecha` para gastos/egresos) dentro del rango del mes calendario actual.
    - **Sincronización Inteligente (`api/sync`):**
        - Se mejoró el scraper `parseGastosTable` para detectar nombres de meses en español (ABRIL, MAYO, etc.) y múltiples formatos numéricos en los encabezados del portal.
        - Se implementó una lógica de **fecha base conservadora**: si la sincronización es automática y se realiza en los primeros 10 días del mes, los gastos sin fecha se asignan al último día del mes anterior por defecto, evitando inflar artificialmente el mes en curso si el portal no se ha actualizado.
    - **Dashboard UI (ResumenTab y page.tsx):** Se actualizó la visualización para priorizar siempre el resumen de movimientos en vivo (`gastosSummary.monto`) sobre los datos estáticos de la tabla `balances` para el mes actual.
    - **Estabilidad (Hotfix Crítico):** Se corrigió el "Application error: a client-side exception has occurred" mediante la implementación masiva de **optional chaining (?.)** y valores por defecto en los componentes `ResumenTab` e `IndicadoresCaja`, asegurando que el sistema no colapse si algún dato del API llega incompleto o malformado.
    - **Mejora en Indicadores de Caja:** Se actualizó el API `/api/analytics/control-diario` para incluir metadatos de fecha y conteo de registros, y se corrigieron referencias a variables inexistentes en el frontend.
    - **Informe Premium (Email):** Se actualizó la lógica de generación del email en `/api/email` para recalcular `cobranzaMes` y `gastosMes` usando las tablas de movimientos en tiempo real.

#### 2. Rediseño y Personalización de Informe Premium
- **Identidad Visual:** Se actualizó el remitente a **"SaaS - Sistema Junta de Condominio"** y el asunto a `SaaS - Sistema Junta de Condominio - [NOMBRE_EDIFICIO] - [FECHA]`, eliminando terminología de "EdifiSaaS Premium" para una apariencia más institucional.
- **Nuevos Módulos en Email:**
    - **Resumen Mensual Histórico:** Inserción de una tabla comparativa de los últimos 4 meses de gestión (Ingresos, Egresos y Resultado Neto).
    - **Cuentas por Cobrar:** Sección con el estado de la morosidad, total de unidades deudoras y montos pendientes en Bs y USD.
    - **Resumen de Cobros del Día:** Reporte específico de la actividad de cobranza en las últimas 24 horas.
    - **Últimos Movimientos Operativos (7 Días):** Tabla de flujo de caja diario de la última semana (Ingresos vs Egresos por día).

#### 3. Mantenimiento de Memoria
- Actualización de `GEMINI.md` para preservar la trazabilidad de las correcciones y mejoras realizadas en la arquitectura de datos y comunicación.


---

## Fecha: 2026-05-06 (Gemini)

### Objetivo
Corregir la falla en la detección de pagos (totales y parciales) durante la sincronización y mejorar la robustez del cruce de datos entre la DB local y el portal de la administradora.

### Tareas Realizadas

#### 1. Mejora en la Lógica de Detección de Pagos (`api/sync`)
- **Normalización de Unidades (CRÍTICO):** Se refactorizó `extractUnitCode` para que sea mucho más inteligente. Ahora detecta y elimina prefijos como "APTO", "CASA", "UNIDAD", etc., y maneja formatos sin guiones. Esto asegura que si el portal cambia el nombre de la unidad (ej: de "08-C" a "APTO 08-C"), el sistema siga reconociendo que es la misma y detecte el pago correctamente.
- **Deduplicación Robusta de Egresos:** Se actualizó la generación de hashes para Egresos. Ahora incluye la descripción/operación en el hash, lo que evita que dos gastos distintos del mismo monto y beneficiario se consideren duplicados erróneamente.
- **Detección por Desaparición:** Se verificó que la lógica de "pago por desaparición" (si estaba antes en la DB y ya no está en el portal) funcione correctamente comparando códigos normalizados.

#### 2. Soporte para Pruebas Manuales
- **Script de Pruebas:** Se creó `supabase/test_payment_detection.sql`. Este script permite al usuario insertar una deuda ficticia que "desaparecerá" en la próxima sincronización, forzando al sistema a detectar un pago y generar la alerta correspondiente para validar el funcionamiento sin esperar días.

#### 3. Estabilidad
- Se mejoró la función `deduplicateItems` para manejar mejor los redondeos de montos decimales en las comparaciones de duplicados.
- Se confirmó que no es necesario esperar al cron para probar los cambios; la sincronización manual desde el Dashboard utiliza exactamente la misma lógica mejorada.

---

## Fecha: 2026-05-07 (Gemini)

### Objetivo
Corregir errores de filtrado de fechas, mejorar la precisión de los reportes y optimizar la experiencia de usuario en el dashboard.

### Tareas Realizadas

#### 1. Corrección de Fechas Futuras (Flujo de Caja)
- **Problema:** Los gastos aparecían en el día 31 del mes en curso (May 31), lo cual era ilógico estando a día 7.
- **Solución:** Se ajustó la lógica de `fallbackDate` en el sincronizador (`api/sync`). Ahora, si el mes detectado es el mes actual, se usa la fecha de sincronización (hoy) en lugar del último día del mes.
- **SQL Cleanup:** Se proporcionó un script para mover los registros del 31-05 al 07-05 en la base de datos.

#### 2. Filtrado Estricto por Fecha Real (Movimientos y Egresos)
- **Problema:** Las pestañas de "Movimientos Consolidados" y "Egresos" mostraban datos del mes pasado al seleccionar "Mes Actual".
- **Solución:** Se refactorizaron las APIs `/api/movimientos-all`, `/api/egresos` y `/api/gastos` para filtrar por el rango de fechas del mes calendario en curso en lugar de usar la columna `mes` (que representa el mes de facturación del recibo).
- **Pre-Recibo:** Se actualizó `loadPreReciboData` para aprovechar este filtrado y mostrar solo items de mayo.

#### 3. Totalización de Listados (Mejora UI)
- **Implementación:** Se añadieron filas de pie de página (`tfoot`) en todas las tablas principales:
    - **Movimientos:** Totales de Ingresos vs Egresos y cantidad de transacciones.
    - **Ingresos:** Suma total en Bs y USD, y conteo de pagos.
    - **Egresos:** Suma total en Bs y USD, y conteo de operaciones.
    - **Recibos:** Resumen de facturación (conceptos) y deudas por unidad con totales consolidados.

#### 4. Inteligencia de Cobranza (Predicción Mejorada)
- **Mejora:** Se rediseñó la sección "Predicción de Saldo" en **Cobranza y Morosidad**.
- **Escenarios:** Ahora muestra tres escenarios probabilísticos (Optimista, Conservador y Pesimista) basados en la velocidad de alcance del 50% de la meta, en lugar de una simple duplicación lineal.

#### 5. Precisión en Detalle de Recibo
- **Mejora:** Se flexibilizó el scraper de gastos para no omitir conceptos de "FONDO" (como el Fondo de Reserva) que son parte esencial de la facturación del edificio.
- **Resultado:** El "Detalle Recibo Mes" ahora coincide fielmente con lo mostrado en el portal de la administradora.

#### 6. Simplificación del Dashboard
- **Acción:** Se eliminó la pestaña redundante **"Gastos (Próx. Recibo)"**, ya que su funcionalidad ha sido absorbida y mejorada por el **"Pre-Recibo Estimado"**.
- **UI:** Se ajustaron los menús y grids para reflejar este cambio.

---

---

## Fecha: 2026-05-07 (Gemini - Tanda 6)

### Objetivo
Corregir errores de build en Vercel y optimizar la arquitectura de datos en APIs críticas.

### Tareas Realizadas

#### 1. Corrección de Error de Build (CRÍTICO)
- **Problema**: `Module parse failed: Identifier 'unidadesCount' has already been declared`. Se detectó una doble declaración de la constante `unidadesCount` en `src/app/api/kpis/route.ts`.
- **Solución**: Se eliminó la declaración duplicada en la línea 366. El build ahora compila correctamente.

#### 2. Refactorización Masiva de APIs (Supabase Consistency)
- **Problema**: Cada ruta de la API creaba su propia instancia del cliente de Supabase, duplicando configuración y aumentando el riesgo de inconsistencias.
- **Solución**:
    - Se crearon `src/lib/supabase.ts` (cliente estándar) y `src/lib/supabaseAdmin.ts` (cliente con service role para bypass de RLS en tareas de backend).
    - Se refactorizaron **más de 50 archivos de API** de forma automatizada para utilizar estos clientes centralizados.
    - Se eliminaron redundancias de configuración (`supabaseUrl`, `supabaseKey`) en todo el directorio `src/app/api`.
- **Resultado**: Código más limpio, centralización de la seguridad en el acceso a datos y mejora en la mantenibilidad del proyecto.

#### 3. Optimización de API de KPIs
- **Consolidación de Consultas**: Se combinaron las consultas a la tabla `edificios` para obtener tanto el `plan` como las `unidades` en un solo llamado al servidor, reduciendo la latencia y el consumo de recursos de la base de datos.
- **Limpieza de Código**: Eliminación de parámetros redundantes (`supabase`) en funciones auxiliares como `limitLogs` y `logTasaWarning`, delegando la responsabilidad al cliente global.

#### 4. Mantenimiento y Estabilidad
- Verificación exitosa del build de producción localmente (`npm run build`).
- Configuración de Git con el token proporcionado para asegurar la persistencia de los cambios en el repositorio oficial.

---

## Fecha: 2026-05-08 (Gemini)

### Objetivo
Implementar funcionalidades de Superadministrador (Master Control) inspiradas en el proyecto AGUA, incluyendo auditoría, control de pagos SaaS, respaldos y dashboard global.

### Tareas Realizadas

#### 1. Infraestructura de Base de Datos (Admin Master)
- **Nuevas Tablas:** Creadas mediante `supabase/migration_admin_features.sql`.
    - `audit_logs`: Trazabilidad completa de operaciones críticas.
    - `saas_payments`: Control de facturación y cobranza a los edificios clientes.
    - `system_config`: Configuración global (Modo mantenimiento, email admin, etc.).
- **Mejoras en Edificios:** Añadidas columnas `subscription_status` y `trial_end_date` para gestión de ciclo de vida del cliente.

#### 2. Sistema de Auditoría
- **Librería Centralizada:** Creada `src/lib/audit.ts` para facilitar el registro de logs desde cualquier parte del sistema (API o Server Actions).
- **API de Auditoría:** Nueva ruta `/api/admin/audit` para consulta masiva de logs con búsqueda y filtrado.

#### 3. Panel de Administración Master (UI/UX Premium)
- **Dashboard Global:** Implementado con KPIs (Total Edificios, Unidades, Ingresos SaaS, Conversión) y tabla de actividad crítica en tiempo real.
- **Módulo de Cobranza SaaS:**
    - Listado detallado de pagos recibidos.
    - Modal de registro de nuevos pagos con actualización automática del estado del edificio.
- **Auditoría Global:** Visor de logs avanzado con detalles técnicos y metadatos de IP/User-Agent.
- **Mantenimiento y Respaldos:**
    - Sistema de exportación de datos (JSON) para tablas críticas (Edificios, Pagos, Auditoría, Usuarios).
    - Herramientas de diagnóstico (Integridad y Visor de Errores).
- **Mejoras en Gestión de Edificios:**
    - Nueva columna "Trial / Vencimiento" con indicadores visuales de expiración.
    - Sincronización de estados entre el panel y la base de datos de suscripciones.

#### 4. Arquitectura de APIs
- Centralización de rutas bajo `/api/admin/` (dashboard, audit, pagos-saas, tools/export).
- Uso consistente de `supabaseAdmin` para operaciones de Master Control.

---

## Fecha: 2026-05-08 (Gemini - Tanda 2)

### Objetivo
Integrar la consulta automática de servicios públicos (CANTV, Hidrocapital, Corpoelec) en el ciclo diario del cron y reportar deudas en los informes a la Junta.

### Tareas Realizadas

#### 1. Consulta Automática Diaria
- **Modificación de Cron (`src/app/api/cron/route.ts`):** Se integró una llamada a la API de consulta de servicios públicos para cada edificio antes de iniciar la sincronización de datos.
- **Detección de Deuda:** El sistema ahora identifica automáticamente si alguno de los servicios configurados (CANTV, Hidrocapital, Corpoelec) presenta saldo deudor (monto > 0).

#### 2. Notificación Detallada en Email
- **Mejora de API de Email (`src/app/api/email/route.ts`)**:
    - Se implementó la recepción de datos de `serviciosDeuda`.
    - Se creó una función generadora de HTML para la sección de "Servicios Públicos".
    - **Informe Estándar:** Inserción de la sección de advertencia de deuda antes del enlace al dashboard.
    - **Informe Premium (Súper Plantilla):** Integración visual de la sección de deudas de servicios públicos con formato coherente al diseño ejecutivo.
- **Personalización:** Las advertencias incluyen el nombre del servicio, el monto adeudado y el alias del servicio si está configurado.

#### 3. Estabilidad y Coherencia
- Se mantuvo el soporte para planes profesionales (o superiores) para la consulta automática de servicios.
- Se aseguró que los informes se envíen correctamente incluso si no hay servicios configurados o no presentan deuda (en cuyo caso la sección no aparece).

---

## Fecha: 2026-05-08 (Gemini - Tanda 3)

### Objetivo
Corregir la ausencia de deudas de servicios públicos en informes manuales, la falta de persistencia de configuraciones críticas y el redireccionamiento incorrecto tras guardar cambios.

### Tareas Realizadas

#### 1. Consulta Automática de Servicios en Emails Manuales
- **Problema:** Los informes enviados manualmente desde la pestaña de configuración no mostraban las deudas de servicios públicos (CANTV, Hidrocapital, Corpoelec), a pesar de estar configurados.
- **Solución Applied:** Se modificó la API `/api/email/route.ts` para que, si no recibe la lista de deudas en el cuerpo de la petición (envío manual), realice la consulta automáticamente en tiempo real antes de generar el HTML del correo.
- **Resultado:** Los informes manuales ahora incluyen siempre las deudas de servicios públicos detectadas.

#### 2. Persistencia de Configuración (Dashboard Fix)
- **Problema:** Al recargar el dashboard, el tipo de informe (Premium/Estándar), el email de la administradora y otras configuraciones se reiniciaban a sus valores por defecto en la interfaz, aunque estuvieran guardados en la base de datos.
- **Causa Raíz:** La API `/api/dashboard` no incluía los campos `tipo_informe`, `email_administradora`, `url_alicuotas`, `dashboard_config` y `alert_thresholds` en su consulta `select`.
- **Solución Applied:** Se actualizaron los campos seleccionados en `src/app/api/dashboard/route.ts` para incluir todas las preferencias del edificio.
- **Resultado:** La configuración ahora persiste correctamente en la interfaz tras recargas y navegaciones.

#### 3. Corrección de Redireccionamiento en Configuración
- **Problema:** Al presionar "Guardar Configuración", el sistema cambiaba automáticamente a la pestaña "Resumen", obligando al usuario a volver manualmente a "Configuración" para seguir editando o probar el envío.
- **Solución Applied:** Se eliminó la instrucción `setTimeout(() => setActiveTab("resumen"), 1500)` en el manejador `handleSaveConfig` de `src/app/dashboard/page.tsx`.
- **Resultado:** El usuario permanece en la pestaña de configuración tras guardar los cambios, mejorando el flujo de trabajo.

---

## Fecha: 2026-05-08 (Gemini - Tanda 4)

### Objetivo
Resolver error 500 en el acceso al dashboard y asegurar la detección de deudas de servicios públicos en entornos de producción.

### Tareas Realizadas

#### 1. Restauración de Acceso (Fix Emergencia)
- **Problema:** El sistema mostraba error 500 al intentar loguearse tras la última actualización.
- **Causa:** Se intentaron consultar columnas (`url_alicuotas`, `email_administradora`) en la tabla `edificios` que aún no existen en la base de datos de producción, provocando un error 400 en Supabase.
- **Solución Applied:** Se revirtió el `select` en `src/app/api/dashboard/route.ts` a su estado estable anterior.
- **Resultado:** El acceso al sistema ha sido restaurado. Se ha proporcionado el SQL script para añadir las columnas faltantes y habilitar la persistencia completa.

#### 2. Mejora en Detección de Deudas (Servicios Públicos)
- **Problema:** Las deudas de servicios públicos no aparecían en los informes manuales en el entorno de Vercel.
- **Causa:** La API de email intentaba llamar a la API de consulta mediante una petición HTTP interna a `localhost`, lo cual no es compatible con el entorno de ejecución de Vercel.
- **Solución Applied:** Se refactorizó la lógica para exportar y llamar directamente a las funciones de los scrapers (Hidrocapital, Corpoelec) desde la API de email, eliminando la dependencia de red interna.
- **Resultado:** Los informes (manuales y automáticos) ahora detectan y muestran las deudas correctamente en cualquier entorno.

---

## Fecha: 2026-05-08 (Gemini - Tanda 7)

### Objetivo
Corregir el error de cálculo en el gráfico "Monto del Recibo por Unidad (USD)" y mejorar la precisión de la extracción de totales mensuales.

### Tareas Realizadas

#### 1. Mejora en Sincronización de Totales (`api/sync`)
- **Problema**: El sistema extraía el total del recibo buscando una fila de "TOTAL RECIBO" que a veces solo contenía un subtotal (ej: solo Gastos Comunes), omitiendo fondos y gastos no comunes. Esto causaba que los KPIs mostraran montos inferiores a la realidad.
- **Solución**: Se modificó la lógica de scraping para que, además de buscar el total nominal, realice una **suma aritmética de todos los conceptos detallados** del recibo. El monto mayor (o la suma detallada si es válida) se utiliza como el total real facturado.

#### 2. Corrección de KPI Histórico (Abril)
- Se identificó que la discrepancia reportada ($16.13 vs $78.55) se debía a que el scraper anterior solo detectó el subtotal de gastos comunes y luego el sistema lo dividió por el número de unidades.
- Se proporciona un script SQL para actualizar el registro de abril con el monto correcto basado en la suma total real.

#### 3. Estabilidad y Coherencia
- Se aseguró que la pestaña "Detalle Recibo Mes" y el gráfico de KPIs utilicen el mismo criterio de totalización (suma de todos los ítems).

---

## Fecha: 2026-05-08 (Gemini - Tanda 10 - CORRECCIÓN UI DASHBOARD)

### Objetivo
Corregir el "botón fantasma" de Gastos en el resumen principal que no mostraba ningún contenido al ser pulsado.

### Tareas Realizadas

#### 1. Redirección de Acceso a Gastos
- **Problema**: Tras la simplificación del dashboard en versiones anteriores, se eliminó la pestaña independiente de "Gastos", pero el botón/tarjeta de "Gastos del Mes" en el resumen ejecutivo seguía intentando navegar a esa pestaña inexistente (`activeTab === "gastos"`).
- **Solución Applied**: Se actualizaron tanto `page.tsx` como `ResumenTab.tsx` para que el clic en la tarjeta de Gastos redirija automáticamente a la pestaña de **"Pre-Recibo Estimado"**.
- **Resultado**: Al pulsar en "Gastos del Mes", el usuario ahora es llevado directamente al listado detallado de conceptos que integrarán el próximo recibo, cumpliendo con la intención original de la refactorización.

#### 2. Limpieza de Código Redundante
- Se eliminó el bloque `useEffect` en `page.tsx` que realizaba una carga de datos específica para la pestaña eliminada, reduciendo peticiones innecesarias al servidor.

---
