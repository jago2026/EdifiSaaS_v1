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
      "Sincronización Diaria Manual",
      "Envío de Reportes Manual",
      "Historial Procesamiento: 3 meses",
      "App de Propietarios (Consulta)",
      "Soporte Estándar por Email",
      "Hasta 30 Unidades de Vivienda"
    ],
    "Profesional": [
      "Sincronización Automática",
      "Reportes Automáticos Programados",
      "Historial Procesamiento: 6 meses",
      "Exportación Datos (Últimos 3m)",
      "Recibo del Próximo Mes",
      "Hasta 100 Unidades de Vivienda"
    ],
    "Premium": [
      "Todo Automático e Ilimitado",
      "Historial Procesamiento: 1 Año",
      "Exportación Histórica Completa",
      "Auditoría Financiera Digital",
      "Personalización de Marca",
      "Unidades Ilimitadas"
    ],
    "Inteligencia Artificial": [
      "Todo lo anterior + Inteligencia IA",
      "Historial Procesamiento: Ilimitado",
      "Asistente Virtual con IA 24/7",
      "Análisis Predictivo de Gastos",
      "Automatización de Tareas",
      "PRÓXIMAMENTE - EN DESARROLLO"
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
