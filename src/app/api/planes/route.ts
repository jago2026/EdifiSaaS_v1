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
      "Hasta 50 Unidades de Vivienda"
    ],
    "Premium": [
      "Todo Automático e Ilimitado",
      "Proyección de Ingresos Diaria",
      "Historial Procesamiento: 1 Año",
      "Exportación Histórica Completa",
      "Auditoría Financiera Digital",
      "Personalización de Marca",
      "Hasta 100 Unidades de Vivienda"
    ],
    "Inteligencia Artificial": [
      "Todo lo del Plan Premium + Inteligencia IA",
      "Predicción de Cobranza Predictiva",
      "Historial Procesamiento: Ilimitado",
      "Asistente Virtual con IA 24/7",
      "Análisis Predictivo de Gastos",
      "Automatización de Tareas",
      "Unidades de Vivienda Ilimitadas"
    ]
  };

  if (error || !data || data.length === 0) {
    const fallbackData = Object.entries(hardcodedFeatures).map(([name, features], idx) => ({
      name,
      features,
      price_monthly: name === "Esencial" ? 19 : name === "Profesional" ? 29 : name === "Premium" ? 59 : 79,
      price_yearly: name === "Esencial" ? 190 : name === "Profesional" ? 290 : name === "Premium" ? 590 : 790,
      is_popular: name === "Profesional",
      display_order: idx
    }));
    return NextResponse.json({ data: fallbackData });
  }

  const sanitizedData = data.map(plan => {
    const normalizedName = plan.name === "Básico" ? "Esencial" : 
                         (plan.name === "Empresarial" ? "Premium" : plan.name);
    
    const key = Object.keys(hardcodedFeatures).find(k => 
      k === normalizedName || 
      (normalizedName.toLowerCase() === "ia" && k.includes("Inteligencia")) ||
      (normalizedName.includes("Inteligencia") && k.toLowerCase() === "ia")
    );
    if (key) {
      return { ...plan, name: key, features: hardcodedFeatures[key] };
    }
    return { ...plan, name: normalizedName };
  });

  return NextResponse.json({ data: sanitizedData });
}
