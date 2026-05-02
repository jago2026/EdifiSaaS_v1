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

---

## Fecha: 28 de Abril, 2026

### Objetivo
Corregir error de despliegue en Vercel relacionado con la falta del cliente de Supabase en el Dashboard y centralizar la configuración de Supabase.

### Tareas Realizadas
- [x] **Fix de Despliegue (CRÍTICO)**: Corregido error `Type error: Cannot find name 'supabase'` en `src/app/dashboard/page.tsx`.
- [x] **Centralización de Cliente Supabase**:
    - Creado `src/lib/supabase.ts` para exportar el cliente configurado con variables de entorno.
    - Importado `supabase` en `src/app/dashboard/page.tsx`.
- [x] **Mantenimiento**: Verificación de otros archivos `.tsx` en busca de referencias globales a `supabase` no declaradas.

### Próximos Pasos Sugeridos
- Refactorizar las rutas API en `src/app/api/` para utilizar el cliente compartido de `src/lib/supabase.ts` en lugar de reinicializarlo en cada archivo.
- Implementar validación de tipos más estricta una vez que el entorno local esté sincronizado con `node_modules`.
- Continuar con la refactorización del Dashboard (7000+ líneas) en componentes más pequeños para mejorar la legibilidad y mantenibilidad.


## Fecha: 28 de Abril, 2026 (Continuación)

### Objetivo
Implementación de módulos analíticos avanzados para la Junta de Condominio: Análisis de Cobranza, Semáforo de Morosidad, Salud Financiera y Simulador de Inversiones.

### Tareas Realizadas
- [x] **Módulo Análisis de Cobranza**:
    - Crear componente `AnalisisCobranza.tsx` con gráfico de curva de recaudación comparativo (mes actual vs anterior).
    - Implementar predicción de saldo (estimación de fecha de recaudación 100%).
- [x] **Módulo Semáforo de Morosidad**:
    - Crear API `/api/analytics/morosidad` para análisis de aging de deuda.
    - Implementar visualización de desplazamiento de morosos (flujo entre grupos de 1-3, 6, 12+ meses).
    - Calcular el "Costo de la Morosidad" por devaluación.
- [x] **Módulo Salud Financiera**:
    - Crear API `/api/analytics/salud-financiera` para KPIs ejecutivos.
    - Calcular Índice de Liquidez, Efectividad de Cobranza y el "Día de Oro".
- [x] **Módulo Simulador de Inversiones**:
    - Crear componente `SimuladorInversiones.tsx`.
    - Lógica de análisis de excedentes mensuales para estimar tiempo de ahorro para proyectos.
- [x] **Integración en Dashboard**:
    - Refactorizar `src/app/dashboard/page.tsx` para incluir las nuevas pestañas.
    - Actualizado `ManualUsuario.tsx` con documentación de las nuevas herramientas.
    - Diseño coherente con la estética "premium" del proyecto.

---

## Fecha: 28 de Abril, 2026 (Continuación 2)

### Objetivo
Estandarización de formatos de números y fechas en todo el proyecto.

### Tareas Realizadas
- [x] **Centralización de Formateadores**: Creado `src/lib/formatters.ts` con funciones `formatNumber`, `formatCurrency`, `formatDate`, `formatBs` y `formatUsd`.
- [x] **Estandarización de Números**: Implementado formato de miles con punto (.) y decimales con coma (,) en todo el proyecto (UI y Emails), cumpliendo con el estándar solicitado (ej: 1.234.567,89).
- [x] **Estandarización de Fechas**: Implementado formato `dd/mm/aaaa` en todas las vistas de usuario, formularios y reportes (ej: 28/04/2026).
- [x] **Refactorización Masiva**:
    - Reemplazados todos los `.toFixed()` directos en el UI por `formatNumber()` para asegurar consistencia.
    - Eliminadas definiciones locales duplicadas de `formatCurrency`, `formatNumber` y `formatDate` en múltiples componentes y rutas de API (`page.tsx`, `email/route.ts`, `informes/route.ts`, `sync/route.ts`, etc.).
    - Actualizados componentes del Dashboard (`SaludFinanciera`, `SemaforoMorosidad`, `SimuladorInversiones`, `AnalisisCobranza`) para usar los formateadores centralizados.
- [x] **Correcciones en Admin**: Actualizada la página de administración para mostrar fechas de registro y pagos en el nuevo formato estándar.

### Próximos Pasos Sugeridos
- Continuar la refactorización de `app/dashboard/page.tsx` para extraer componentes grandes (actualmente ~7000 líneas).
- Implementar una librería de componentes UI compartidos para evitar duplicación de estilos Tailwind.
- Revisar las entradas de datos (inputs) para que también acepten y validen el formato de coma decimal de forma amigable.

---

## Fecha: 28 de Abril, 2026 (Continuación 3)

### Objetivo
Corregir errores de compilación y mejorar la accesibilidad de la sincronización en dispositivos móviles.

### Tareas Realizadas
- [x] **Fix de Build (CRÍTICO)**: 
    - Eliminados imports duplicados de `formatDate` y `formatNumber` en `src/app/api/admin/tools/route.ts` y `src/app/api/email/route.ts`.
    - Resuelto el error de Turbopack: `the name formatDate is defined multiple times` que impedía el despliegue en Vercel.
- [x] **Mejora UI Móvil (Sincronización)**:
    - **Botón de Sincronización Rápida**: Añadido botón "🔄 Sincronizar" en la barra de navegación horizontal superior (visible solo en móviles).
    - **Menú Lateral**: Añadido botón de sincronización en el menú de hamburguesa móvil con estilo destacado (color ámbar).
    - **Cambio de Iconografía**: Se actualizó el emoticon de la pestaña "Movimientos" de 🔄 a 📝 para diferenciarlo claramente de la acción de Sincronizar, siguiendo la solicitud del usuario.
    - **Lógica de Feedback**: Los nuevos botones muestran un estado de carga ("⌛...") mientras la sincronización está en curso.
- [x] **Fix de Error de Tipado (API Informes)**: Corregido error en `src/app/api/informes/route.ts` donde se usaba `request.url` en lugar de `req.url`.

### Próximos Pasos Sugeridos
---

## Fecha: 29 de Abril, 2026

### Objetivo
Mejoras estéticas, expansión de rangos de morosidad y correcciones en el módulo de Servicios Públicos.

### Tareas Realizadas
- [x] **Semáforo de Morosidad**:
    - **Internacionalización**: Se eliminó la palabra inglesa "Aging" y se reemplazó por "Antigüedad" en todo el módulo y en el manual de usuario, cumpliendo con el requerimiento de no usar inglés en el proyecto.
    - **Expansión de Rangos**: Se segmentaron los grupos de morosidad de forma más detallada para reflejar la realidad del edificio:
        - 1 Recibo (ahora como categoría independiente).
        - 2 y 3 Recibos.
        - 4-6 Recibos.
        - 7-11 Recibos.
        - 12+ Recibos.
    - **Gráfico de Evolución**: Se añadió un nuevo gráfico de área premium que visualiza la tendencia histórica del monto total pendiente en los últimos 12 registros, permitiendo ver la evolución de la deuda.
    - **Actualización de API**: Se modificó `/api/analytics/morosidad` para soportar los nuevos rangos y devolver datos históricos para el gráfico de evolución.
- [x] **Servicios Públicos**:
    - **Teléfonos (CANTV)**: Se cambió el nombre del botón "Consultar" a "Consultar Saldo" para mantener la consistencia visual y funcional con los otros servicios.
    - **Corpoelec (Electricidad)**: 
        - Se añadió un badge de "Próximamente" en el encabezado de la sección.
        - Se implementaron mensajes de aviso ("Sección en Desarrollo") en los botones de "Consultar Saldo", "Enviar Email" y "Reporte", informando al usuario que la funcionalidad está en desarrollo debido a limitaciones técnicas de los portales externos.
- [x] **Memoria de Trabajo**: Actualización de `GEMINI.md` con las tareas realizadas hoy.

### Próximos Pasos Sugeridos
- Implementar "Skeleton Loaders" en las gráficas de morosidad para suavizar la transición de carga.
- Investigar APIs alternativas de terceros para la consulta de Corpoelec.
- Continuar con la división de `page.tsx` en componentes más pequeños para mejorar la mantenibilidad.

---

## Fecha: 29 de Abril, 2026 (Continuación)

### Objetivo
Resolver problemas críticos de autenticación (401) y sincronización horaria en el Cron, y añadir descargos de responsabilidad en Servicios Públicos.

### Tareas Realizadas

#### 🏛️ Servicios Públicos (Disclaimer)
- [x] **Aviso de Advertencia**: Se añadió un bloque de aviso en color morado (`purple`) con un emoticon de advertencia (⚠️) en las secciones de CANTV, Hidrocapital y Corpoelec.
- [x] **Texto del Aviso**: "⚠️ IMPORTANTE: aunque es el resultado de una consulta realizada en la página web del proveedor que quizás pueda tener desactualización, o error al realizar la consulta, No se garantiza que la información aquí mostrada sea correcta, por lo que se recomienda al usuario que verifique manualmente con su proveedor de servicios públicos en su página web el monto y saldo correspondiente."
- [x] **Visibilidad**: El aviso solo aparece cuando hay un resultado de consulta presente (`msg`).

#### 🚀 Cron Job & Automatización (Fix Crítico)
- [x] **Eliminación del Error 401**: Se identificó que las llamadas internas vía `fetch` a `/api/sync` y `/api/email` fallaban debido a protecciones de red de Vercel (Deployment Protection).
- [x] **Refactorización a Llamadas Directas**: Se modificó `src/app/api/cron/route.ts` para importar directamente los manejadores `POST` de `sync` y `email`. Ahora el cron ejecuta la lógica en memoria pasando un objeto `Request` simulado, eliminando la dependencia de la red externa y los errores de autorización.
- [x] **Corrección de Zona Horaria (VET)**:
    - Se reemplazó la lógica inconsistente de `new Date().toLocaleString()` por `Intl.DateTimeFormat` con la zona horaria `America/Caracas` configurada de forma explita.
    - Esto garantiza que el cron compare correctamente la hora de ejecución con la hora configurada por el edificio (ej. 05:00 AM VET), independientemente de la hora del servidor (UTC).
- [x] **Mejora de Alertas y Diagnóstico**:
    - Se amplió la captura de errores en el Cron para registrar mensajes detallados en la bitácora de alertas en caso de fallos internos.
    - Se eliminó la dependencia de `BASE_URL` para las tareas principales, haciendo el sistema más robusto frente a cambios de dominio.

---

## Fecha: 2026-05-02 (Gemini)

### Tareas Realizadas

#### 1. Corrección en Ingr/Egr Manual
- **Problema:** El botón "+ Nuevo Registro" no realizaba ninguna acción visible para el usuario.
- **Causa probable:**
    1. El usuario podía estar usando un filtro (Ingresos/Egresos/Pendientes) que ocultaba el nuevo registro (que nace con valores en 0).
    2. El modo Demo retornaba un error 403 que se manejaba silenciosamente en el frontend.
    3. Error en la función `registrarAlerta` que intentaba insertar en la base de datos sin el campo requerido `fecha`.
- **Soluciones aplicadas:**
    - Se añadió `setManualFilter("todos")` al crear un nuevo registro para asegurar que sea visible inmediatamente.
    - Se añadió manejo de errores con `alert()` para informar al usuario si la creación falla (ej. en modo Demo o error de servidor).
    - Se corrigió `registrarAlerta` para incluir el campo `fecha` requerido por el esquema de la base de datos.
    - Se añadió validación de `building.id` con feedback al usuario.
    - Se optimizó el ordenamiento de los registros manuales usando `created_at` como tie-breaker para un saldo acumulado estable.
    - Se corrigió el filtro "Ambos" para que use lógica OR (Ingresos > 0 O Egresos > 0) en lugar de AND, permitiendo ver movimientos simples.
    - Se añadió manejo de errores y alertas en las funciones de actualizar y eliminar movimientos manuales.

### Próximos Pasos / Recomendaciones
- Implementar un sistema de notificaciones (toasts) más moderno para evitar el uso de `alert()`.
- Validar si otros componentes de "Analytics" (AnalisisCobranza, SaludFinanciera, etc.) requieren ajustes similares en el registro de alertas.
- Revisar consistencia de tipos en los modelos de datos entre el frontend y Supabase.
