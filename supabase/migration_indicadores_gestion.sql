-- TABLA DE INDICADORES DE GESTIÓN (HISTÓRICO MENSUAL)
CREATE TABLE IF NOT EXISTS indicadores_gestion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edificio_id UUID REFERENCES edificios(id) ON DELETE CASCADE,
    mes_cierre DATE NOT NULL, -- Almacenar como YYYY-MM-01
    
    -- Flujos de Caja
    ingresos_totales_bs DECIMAL(15, 2) DEFAULT 0,
    ingresos_totales_usd DECIMAL(15, 2) DEFAULT 0,
    egresos_totales_bs DECIMAL(15, 2) DEFAULT 0,
    egresos_totales_usd DECIMAL(15, 2) DEFAULT 0,
    resultado_operativo_usd DECIMAL(15, 2) DEFAULT 0, -- Superávit/Déficit
    
    -- Patrimonio y Saldos
    saldo_disponible_usd DECIMAL(15, 2) DEFAULT 0,
    total_cuentas_por_cobrar_usd DECIMAL(15, 2) DEFAULT 0,
    total_fondos_reserva_usd DECIMAL(15, 2) DEFAULT 0,
    
    -- Detalle de Fondos
    f_reserva_usd DECIMAL(15, 2) DEFAULT 0,
    f_intereses_usd DECIMAL(15, 2) DEFAULT 0,
    f_diferencial_usd DECIMAL(15, 2) DEFAULT 0,
    f_prestaciones_usd DECIMAL(15, 2) DEFAULT 0,
    f_otros_fondos_usd DECIMAL(15, 2) DEFAULT 0,
    
    -- Métricas de Gestión (Porcentajes)
    efectividad_recaudacion_pct DECIMAL(10, 2) DEFAULT 0,
    indice_morosidad_pct DECIMAL(10, 2) DEFAULT 0,
    cobertura_gastos_pct DECIMAL(10, 2) DEFAULT 0,
    
    -- Datos de Referencia
    monto_recibo_promedio_usd DECIMAL(15, 2) DEFAULT 0,
    tasa_bcv_cierre DECIMAL(10, 2) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Evitar duplicados para el mismo mes y edificio
    UNIQUE(edificio_id, mes_cierre)
);

CREATE INDEX IF NOT EXISTS idx_kpis_edificio_mes ON indicadores_gestion(edificio_id, mes_cierre);
