import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getPlanPermissions } from "@/lib/planLimits";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const edificioId = searchParams.get("edificioId");

    if (!edificioId) {
      return NextResponse.json({ error: "Falta edificioId" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar Plan
    const { data: edificio } = await supabase
      .from("edificios")
      .select("plan")
      .eq("id", edificioId)
      .single();

    const permissions = getPlanPermissions(edificio?.plan || "Básico");

    if (!permissions.hasIA && !permissions.hasAdvancedKpis) {
      return NextResponse.json({ error: "Este reporte requiere un plan Profesional o superior" }, { status: 403 });
    }

    // Lógica del Diferencial Cambiario:
    // 1. Obtener egresos
    // 2. Comparar tasa de fecha del gasto vs tasa de fecha de cobro estimado (o actual)
    // Para simplificar esta demo, calcularemos la pérdida teórica si el cobro se retrasa 30 días.

    const { data: egresos } = await supabase
      .from("egresos")
      .select("fecha, monto, descripcion")
      .eq("edificio_id", edificioId)
      .order("fecha", { ascending: false })
      .limit(50);

    const { data: tasas } = await supabase
      .from("tasas_cambio")
      .select("fecha, tasa_dolar")
      .order("fecha", { ascending: false })
      .limit(100);

    const getTasa = (fecha: string) => {
      const t = tasas?.find(t => t.fecha <= fecha);
      return t ? parseFloat(t.tasa_dolar) : 45;
    };

    const analytics = egresos?.map(e => {
      const tasaGasto = getTasa(e.fecha);
      const montoUsdGasto = parseFloat(e.monto) / tasaGasto;
      
      // Simular tasa 30 días después (o la última disponible si es muy reciente)
      const fechaCobro = new Date(e.fecha);
      fechaCobro.setDate(fechaCobro.getDate() + 30);
      const fechaCobroStr = fechaCobro.toISOString().split('T')[0];
      const tasaCobro = getTasa(fechaCobroStr);
      
      const montoBsRecuperarParaMantenerUsd = montoUsdGasto * tasaCobro;
      const perdidaBs = montoBsRecuperarParaMantenerUsd - parseFloat(e.monto);

      return {
        descripcion: e.descripcion,
        fecha: e.fecha,
        montoBs: parseFloat(e.monto),
        tasaGasto,
        tasaCobro,
        perdidaBs,
        perdidaUsd: perdidaBs / tasaCobro
      };
    });

    const totalPerdidaUsd = analytics?.reduce((sum, item) => sum + item.perdidaUsd, 0) || 0;

    return NextResponse.json({
      resumen: {
        totalPerdidaUsd,
        periodoAnalizado: "Últimos 50 egresos",
        sugerencia: totalPerdidaUsd > 100 ? "Se recomienda indexar cobros o reducir tiempos de recaudación." : "Impacto cambiario bajo."
      },
      detalles: analytics
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
