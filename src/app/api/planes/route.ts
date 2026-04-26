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
    "Esencial": [
      "Sincronización Diaria de Movimientos",
      "Flujo de Caja Básico (Mes Actual)",
      "Reportes Mensuales Básicos por Email",
      "Historial de Datos de 3 meses",
      "Notificaciones por Email (Hasta 50/mes)",
      "Soporte Estándar por Email (48h)",
      "Gestión de hasta 30 unidades"
    ],
    "Profesional": [
      "Todo lo del Plan Esencial",
      "KPIs y Gráficos de Tendencias",
      "Flujo de Caja Detallado (12 meses)",
      "Exportación de Datos (Excel/CSV)",
      "Generación de Recibo del Próximo Mes",
      "Alertas por WhatsApp (Hasta 50/mes)",
      "Soporte Prioritario (24h)",
      "Gestión de hasta 100 unidades"
    ],
    "Premium": [
      "Todo lo del Plan Profesional",
      "Herramientas de Auditoría Financiera",
      "Módulo de Presupuesto y Control Anual",
      "Historial de Datos Ilimitado",
      "Notificaciones por Email Ilimitadas",
      "Alertas por WhatsApp (Hasta 200/mes)",
      "Soporte VIP 24/7 y Formación In Situ",
      "Unidades Ilimitadas"
    ],
    "Inteligencia Artificial": [
      "Todo lo del Plan Premium",
      "Asistente Virtual con IA 24/7",
      "Análisis Predictivo de Gastos e Ingresos",
      "Reportes Inteligentes con Insights de IA",
      "Análisis de Morosidad Avanzado",
      "Optimización de Gastos Inteligente",
      "Escenarios Financieros y Proyecciones IA"
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
