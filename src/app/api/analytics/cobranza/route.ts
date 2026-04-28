import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const edificioId = searchParams.get("edificioId");

  if (!edificioId) return NextResponse.json({ error: "Falta edificioId" }, { status: 400 });

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Obtener datos históricos de los últimos 60 días
    const { data: history, error } = await supabase
      .from("historico_cobranza")
      .select("fecha, pct_pagado, monto_pagado_hoy, aptos_pagaron_hoy")
      .eq("edificio_id", edificioId)
      .order("fecha", { ascending: true });

    if (error) throw error;

    // Organizar datos por mes actual y mes anterior para comparar días (1-31)
    const now = new Date();
    const currentMonth = now.toISOString().substring(0, 7);
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(now.getMonth() - 1);
    const lastMonth = lastMonthDate.toISOString().substring(0, 7);

    const processData = (monthStr: string) => {
      const monthData = new Array(31).fill(null);
      history
        ?.filter(h => h.fecha.startsWith(monthStr))
        .forEach(h => {
          const day = new Date(h.fecha).getUTCDate() - 1;
          if (day >= 0 && day < 31) {
            monthData[day] = {
              pct: Number(h.pct_pagado),
              monto: Number(h.monto_pagado_hoy),
              aptos: Number(h.aptos_pagaron_hoy)
            };
          }
        });
      
      // Rellenar huecos para la curva suave
      let lastValue = 0;
      return monthData.map((d, i) => {
        if (d === null) return { dia: i + 1, pct: lastValue };
        lastValue = d.pct;
        return { dia: i + 1, ...d };
      });
    };

    const currentCurve = processData(currentMonth);
    const lastCurve = processData(lastMonth);

    // Calcular KPIs de velocidad
    const getDaysToPct = (curve: any[], target: number) => {
      const day = curve.findIndex(d => d.pct >= target);
      return day !== -1 ? day + 1 : null;
    };

    return NextResponse.json({
      mesActual: currentCurve,
      mesAnterior: lastCurve,
      stats: {
        diasPara50Actual: getDaysToPct(currentCurve, 50),
        diasPara50Anterior: getDaysToPct(lastCurve, 50),
        recaudacionHoy: currentCurve[now.getUTCDate() - 1]?.monto || 0
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
