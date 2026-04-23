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
      "Sincronización Diaria",
      "Reporte diario automático a los miembros de la Junta de Condominio con la situación financiera",
      "Reportes Básicos",
      "Historial de 3 meses",
      "Soporte por email",
      "Hasta 30 Unidades"
    ],
    "Profesional": [
      "Todo lo de Básico",
      "Control financiero avanzado",
      "Reporte diario automático a los miembros de la Junta de Condominio con la situación financiera",
      "Historial de 12 meses",
      "Exportación de reportes",
      "Auditoría Financiera",
      "Reportes Avanzados",
      "Hasta 50 Unidades"
    ],
    "Empresarial": [
      "Todo lo de Profesional",
      "Unidades Ilimitadas",
      "Soporte Prioritario",
      "Actualizaciones y mejoras incluidas",
      "Formación in situ"
    ],
    "IA (En Desarrollo. actualmente no disponible)": [
      "Todo lo de Empresarial",
      "Asistente de IA",
      "Análisis Predictivo",
      "Reportes inteligentes automatizados",
      "Todo incluido",
      "Análisis y recomendaciones",
      "Análisis de morosidad, de gastos, proyecciones y estimaciones, y mucho mas.",
      "Soporte",
      "Formación in situ"
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
