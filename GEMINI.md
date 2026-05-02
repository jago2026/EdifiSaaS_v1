# Seguimiento de Trabajo - Gemini

## Fecha: 2026-05-02

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

### Próximos Pasos / Recomendaciones
- Implementar un sistema de notificaciones (toasts) más moderno para evitar el uso de `alert()`.
- Validar si otros componentes de "Analytics" (AnalisisCobranza, SaludFinanciera, etc.) requieren ajustes similares en el registro de alertas.
- Revisar consistencia de tipos en los modelos de datos entre el frontend y Supabase.
