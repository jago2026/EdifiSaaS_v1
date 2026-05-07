import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";


export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const edificioId = searchParams.get("edificioId");

  if (!edificioId) {
    return NextResponse.json({ error: "edificioId required" }, { status: 400 });
  }

  

  try {
    // Consultar meses únicos y conteos en las 4 tablas principales
    const [recibosRes, egresosRes, gastosRes, balancesRes] = await Promise.all([
      supabase.from("recibos").select("mes").eq("edificio_id", edificioId),
      supabase.from("egresos").select("mes").eq("edificio_id", edificioId),
      supabase.from("gastos").select("mes").eq("edificio_id", edificioId),
      supabase.from("balances").select("mes").eq("edificio_id", edificioId)
    ]);

    const summary: Record<string, any> = {};

    const process = (data: any[] | null, key: string) => {
      if (!data) return;
      data.forEach(item => {
        const mes = item.mes || "Actual/Varios";
        if (!summary[mes]) {
          summary[mes] = { mes, recibos: 0, egresos: 0, gastos: 0, balances: 0 };
        }
        summary[mes][key]++;
      });
    };

    process(recibosRes.data, "recibos");
    process(egresosRes.data, "egresos");
    process(gastosRes.data, "gastos");
    process(balancesRes.data, "balances");

    // Convertir a array ordenado por mes descendente
    const result = Object.values(summary).sort((a: any, b: any) => {
        if (a.mes.includes('-') && b.mes.includes('-')) {
            const [mA, yA] = a.mes.split('-');
            const [mB, yB] = b.mes.split('-');
            return `${yB}-${mB}`.localeCompare(`${yA}-${mA}`);
        }
        return b.mes.localeCompare(a.mes);
    });

    return NextResponse.json({ summary: result });
  } catch (error: any) {
    console.error("Error in data-summary:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
