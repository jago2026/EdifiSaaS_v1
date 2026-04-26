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
      "Sincronización Automática Diaria",
      "Flujo de Caja y Reportes Básicos",
      "App de Propietarios (Consulta)",
      "Historial de Datos de 3 meses",
      "Soporte Estándar por Email",
      "Hasta 30 Unidades de Vivienda"
    ],
    "Profesional": [
      "Todo lo incluido en el Plan Esencial",
      "KPIs y Gráficos de Tendencias",
      "Exportación Completa Excel/CSV",
      "Generación Recibo Próximo Mes",
      "Alertas por WhatsApp (50/mes)",
      "Hasta 100 Unidades de Vivienda"
    ],
    "Premium": [
      "Todo lo incluido en el Plan Profesional",
      "Unidades de Vivienda Ilimitadas",
      "Soporte Prioritario y Formación",
      "Auditoría y Presupuesto Anual",
      "Personalización de Marca (Branding)",
      "Alertas WhatsApp (200/mes)"
    ],
    "Inteligencia Artificial": [
      "Todo lo incluido en el Plan Premium",
      "Asistente Virtual con IA 24/7",
      "Análisis Predictivo de Gastos",
      "Análisis de Morosidad con IA",
      "Automatización de Tareas",
      "Próximamente - En Desarrollo"
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
