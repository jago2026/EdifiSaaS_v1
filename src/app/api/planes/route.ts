import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export async function GET() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase
    .from("plan_configs")
    .select("*")
    .order("display_order", { ascending: true });

  const hardcodedFeatures: Record<string, string[]> = {
    "Básico": [
      "Vista de Flujo de Caja Mensual",
      "Sincronización Diaria de Movimientos",
      "Reporte diario automático vía Email (1 destinatario)",
      "Historial de consulta de 3 meses",
      "Soporte por email",
      "Hasta 30 Unidades"
    ],
    "Profesional": [
      "Todo lo de Básico",
      "Historial de movimientos ilimitado",
      "KPIs: Índice de Morosidad y Tendencia de Gastos",
      "Módulo de Alícuotas vs Gasto Real",
      "Análisis de Tasa BCV Histórica",
      "Exportación de datos a Excel/CSV",
      "Reporte diario a toda la Junta (hasta 5 emails)",
      "Hasta 100 Unidades"
    ],
    "Empresarial": [
      "Todo lo de Profesional",
      "Módulo de Recibos Proyectados (Pre-emisión)",
      "Conciliación Bancaria Automatizada",
      "Flujo de Caja Multimoneda ($ y Bs)",
      "Semáforo de Reservas y Fondos Especiales",
      "Gestión diferenciada para Edificios Mixtos",
      "Alertas Críticas vía WhatsApp",
      "Unidades Ilimitadas",
      "Soporte Prioritario"
    ],
    "IA (Asistente de Gestión)": [
      "Todo lo de Empresarial",
      "Asistente de IA para Consultas Financieras",
      "Análisis de Diferencial Cambiario 'Invisible'",
      "Predicción de Morosidad y Flujo de Caja",
      "Análisis Inteligente de Variación de Gastos",
      "Recomendaciones de Ajuste de Cuota de Condominio",
      "Formación in situ y Consultoría Senior"
    ]
  };

  if (error || !data || data.length === 0) {
    const fallbackData = Object.entries(hardcodedFeatures).map(([name, features], idx) => ({
      name,
      features,
      price_monthly: name === "Básico" ? 19 : name === "Profesional" ? 29 : name === "Empresarial" ? 59 : 79,
      price_yearly: name === "Básico" ? 190 : name === "Profesional" ? 290 : name === "Empresarial" ? 590 : 790,
      is_popular: name === "Profesional",
      display_order: idx
    }));
    return NextResponse.json({ data: fallbackData });
  }

  const sanitizedData = data.map(plan => {
    const key = Object.keys(hardcodedFeatures).find(k => k === plan.name || (plan.name.startsWith("IA") && k.startsWith("IA")));
    if (key) {
      return { ...plan, features: hardcodedFeatures[key] };
    }
    return plan;
  });

  return NextResponse.json({ data: sanitizedData });
}
