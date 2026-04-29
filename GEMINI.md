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
    - Se reemplazó la lógica inconsistente de `new Date().toLocaleString()` por `Intl.DateTimeFormat` con la zona horaria `America/Caracas` configurada de forma explícita.
    - Esto garantiza que el cron compare correctamente la hora de ejecución con la hora configurada por el edificio (ej. 05:00 AM VET), independientemente de la hora del servidor (UTC).
- [x] **Mejora de Alertas y Diagnóstico**:
    - Se amplió la captura de errores en el Cron para registrar mensajes detallados en la bitácora de alertas en caso de fallos internos.
    - Se eliminó la dependencia de `BASE_URL` para las tareas principales, haciendo el sistema más robusto frente a cambios de dominio.

### Próximos Pasos Sugeridos
- Monitorear la ejecución del cron en el próximo ciclo de las 05:00 AM VET.
- Validar que el reporte de email diario se genere correctamente con la nueva lógica de llamada directa.
- Seguir con la extracción de lógica de negocio pesada a archivos en `src/lib` para facilitar su reutilización sin peticiones HTTP.

---

## Fecha: 29 de Abril, 2026 (Continuación 2)

### Objetivo
Análisis técnico de la utilización de la tabla `historico_cobranza` y revisión general del proyecto.

### Tareas Realizadas

#### 📊 Análisis de la Tabla `historico_cobranza`
Se realizó un mapeo completo de la dependencia de datos de esta tabla, identificando su rol crítico en el motor de analítica:
- **Módulos de Backend**:
    - `src/app/api/sync/route.ts`: Punto de entrada de datos. Crea snapshots históricos durante cada sincronización exitosa.
    - `src/app/api/analytics/cobranza/route.ts`: Calcula KPIs de rendimiento comparativo mensual.
    - `src/app/api/analytics/morosidad/route.ts`: Procesa el aging de deuda y cálculos de pérdida por devaluación.
- **Componentes de Frontend (Dashboard)**:
    - `AnalisisCobranza.tsx`: Visualiza la **Curva de Recaudación** comparando el mes actual vs el anterior.
    - `SemaforoMorosidad.tsx`: Gestiona el **Semáforo de Antigüedad** (1, 2-3, 4-6, 7-11, 12+ recibos) y el gráfico de **Evolución de Deuda** (tendencia de los últimos 12 meses/registros).
- **Reportes Generados**:
    - **Velocidad de Cobranza**: Días estimados para alcanzar hitos de recaudación (50%, 100%).
    - **Costo de Morosidad**: Cálculo financiero de la depreciación de la deuda pendiente.
    - **Desplazamiento de Cartera**: Análisis de flujo de apartamentos entre los distintos rangos de morosidad.

### Próximos Pasos Sugeridos
- Optimizar la consulta de `historico_cobranza` añadiendo índices en Supabase por `edificio_id` y `fecha` si la tabla crece significativamente.
- Implementar un sistema de "Limpieza" (Pruning) para mantener solo los últimos 24-36 meses de historial si es necesario para el rendimiento.

---

## Fecha: 29 de Abril, 2026 (Continuación 3)

### Objetivo
Corregir errores de visualización en gráficos de analítica y mejorar el procesamiento de datos históricos de `historico_cobranza`.

### Tareas Realizadas

#### 📉 Corrección de Gráficos de Cobranza
- [x] **Eliminación de "Caída a Cero"**: Se modificó la lógica en el backend y frontend para que el gráfico de cobranza del mes actual se detenga en el día de hoy. Ya no proyecta líneas a cero ni planas hasta el día 31, manteniendo la estética profesional.
- [x] **Comparativa Dinámica**: El gráfico ahora superpone la curva actual (parcial) sobre la del mes anterior (completa) de forma correcta.

#### 🏛️ Procesamiento de Datos Históricos
- [x] **Ampliación de Historial**: Se aumentó de 12 a 24 los registros visualizados en el gráfico de Evolución de Morosidad para dar cabida a los datos cargados manualmente desde 2025.
- [x] **Fix de Zona Horaria**: Implementado parseo robusto con `T00:00:00Z` y `timeZone: 'UTC'` en el formateo de etiquetas del eje X. Esto evita que los datos históricos se desplacen de día por el huso horario del servidor.
- [x] **Sanitización de Datos**: Asegurada la conversión a `Number` de todos los campos monetarios y porcentajes provenientes de la tabla `historico_cobranza` para evitar fallos de renderizado en Recharts.

### Próximos Pasos Sugeridos
- Implementar un selector de "Rango de Tiempo" (3 meses, 6 meses, 1 año) en el gráfico de evolución de morosidad.
- Añadir un tooltip detallado en el gráfico de cobranza que muestre el monto exacto recaudado por día además del porcentaje acumulado.

---

## Fecha: 29 de Abril, 2026 (Continuación 5)

### Objetivo
Corregir errores críticos de integridad de datos (duplicación de conteos) y saneamiento de porcentajes en analítica.

### Tareas Realizadas

#### 🔄 Sincronización de Datos (Integridad Crítica)
- [x] **Eliminación de Duplicación**: Se identificó que la lógica de sincronización contaba cada *recibo* como un apartamento moroso. En apartamentos con múltiples recibos pendientes (ej. 3 recibos), el sistema inflaba el conteo de apartamentos (mostrando 80 en lugar de 43) y sumaba la deuda de forma redundante.
- [x] **Lógica de Unicidad**: Se implementó un `Map` en `src/app/api/sync/route.ts` para agrupar recibos por `id_apto`. Ahora el sistema garantiza que cada apartamento se cuente solo una vez en las estadísticas de morosidad, independientemente de cuántos recibos deba.
- [x] **Cifras Reales**: Esto corrige automáticamente el salto abrupto de deuda (de $1.5k a $15k) y los conteos imposibles de apartamentos (70, 80 aptos).

#### 📉 Saneamiento de Analítica de Cobranza
- [x] **Porcentajes Lógicos**: Se implementó un saneamiento en `src/app/api/analytics/cobranza/route.ts` para que el porcentaje de recaudación (`pct_pagado`) se mantenga estrictamente entre 0 y 100. Valores negativos (como -284%) causados por la duplicación previa han sido eliminados.
- [x] **Predicción de Recaudación Prudente**: 
    - Se limitó la predicción de recaudación a un máximo de 60 días para evitar fechas absurdas.
    - Se añadió una validación: si la fecha estimada ya pasó, el sistema muestra "Finalizando mes" o "En curso" en lugar de una fecha obsoleta.
- [x] **Filtrado Estricto de Futuro**: Se reforzó el filtrado de fechas futuras en todas las APIs de analítica para asegurar que los gráficos se detengan en el día actual (Hoy).

### Próximos Pasos Sugeridos
- Realizar una sincronización manual para limpiar los snapshots corruptos del día de hoy en la base de datos (se sobrescribirán por el `upsert` con la nueva lógica corregida).
- Validar la consistencia de los montos totales de deuda contra el reporte consolidado de recibos.
- Seguir monitoreando el comportamiento del "Día de Oro" con los datos ya saneados.


\n---\n*Nota: Re-push para activar despliegue.*

---

## Fecha: 29 de Abril, 2026 (Continuación 2)

### Objetivo
Corregir visualización de datos futuros en gráficos y mejorar la entrada/visualización multimoneda en movimientos manuales.

### Tareas Realizadas
- [x] **Fix de Gráficos (Datos Futuros)**:
    - **AnalisisCobranza.tsx**: Se limitó la curva del mes actual para que no grafique datos desde el día en curso hasta fin de mes.
    - **SemaforoMorosidad.tsx**: Se filtró la evolución histórica para excluir datos del día actual y futuros.
- [x] **Módulo de Movimientos Manuales (Premium Update)**:
    - **Soporte Multimoneda**: Visualización simultánea de Bs. y USD en todas las columnas de la tabla y totales.
    - **Formulario Modal**: Implementado popup para la creación de nuevos registros con selección de moneda (Bs/USD) y conversión automática.
    - **Validación**: Mejora en la integridad de datos al requerir descripción y monto antes de guardar.
- [x] **Seguimiento**: Creado archivo `MANUS.md` para registro de actividades de esta sesión.

---
