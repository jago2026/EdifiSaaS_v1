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
    // Obtener datos históricos de los últimos 60 días, filtrando el futuro
    const todayStr = new Date().toISOString().split('T')[0];
    const { data: history, error } = await supabase
      .from("historico_cobranza")
      .select("fecha, pct_pagado, monto_pagado_hoy, aptos_pagaron_hoy")
      .eq("edificio_id", edificioId)
      .lte("fecha", todayStr)
      .order("fecha", { ascending: true });

    if (error) throw error;

    // Organizar datos por mes actual y mes anterior para comparar días (1-31)
    const now = new Date();

    // Obtener día actual en zona horaria de Caracas (formato YYYY-MM-DD)
    const caracasDateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Caracas',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);
    const caracasDay = parseInt(caracasDateStr.split('-')[2], 10);

    const currentMonth = caracasDateStr.substring(0, 7); // YYYY-MM
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(now.getMonth() - 1);
    const lastMonth = lastMonthDate.toISOString().substring(0, 7);

    const processData = (monthStr: string, isCurrentMonth: boolean) => {
      const monthData = new Array(31).fill(null);

      // Filtrar y asignar datos existentes
      history
        ?.filter(h => h.fecha.startsWith(monthStr))
        .forEach(h => {
          const day = new Date(h.fecha + "T00:00:00Z").getUTCDate() - 1;
          if (day >= 0 && day < 31) {
            // Asegurar que el porcentaje sea lógico (0-100)
            const rawPct = Number(h.pct_pagado);
            const sanitizedPct = Math.max(0, Math.min(100, rawPct));

            monthData[day] = {
              pct: sanitizedPct,
              monto: Number(h.monto_pagado_hoy),
              aptos: Number(h.aptos_pagaron_hoy)
            };
          }
        });

      // Para el mes actual, EXCLUIMOS el día en curso (no debe graficarse)
      // Solo mostramos días HASTA el día anterior al actual
      return monthData.map((d, i) => {
        const dia = i + 1;

        // Para mes actual: solo días menores al día de hoy en Caracas
        const isFutureOrToday = isCurrentMonth && dia >= caracasDay;

        if (isFutureOrToday) {
          return { dia, pct: null }; // NULL para el día actual y futuros
        }

        if (d === null) {
          return { dia, pct: 0 };
        } else {
          return { dia, ...d };
        }
      });
    };

    const currentCurve = processData(currentMonth, true);
    const lastCurve = processData(lastMonth, false);

    // Calcular KPIs de velocidad
    const getDaysToPct = (curve: any[], target: number) => {
      // Filtrar puntos que no sean null (futuros)
      const validPoints = curve.filter(d => d.pct !== null);
      const dayIndex = validPoints.findIndex(d => d.pct >= target);
      return dayIndex !== -1 ? dayIndex + 1 : null;
    };

    const diasPara50Actual = getDaysToPct(currentCurve, 50);
    const diasPara50Anterior = getDaysToPct(lastCurve, 50);

    // Obtener recaudación del último día válido (día anterior al actual)
    const lastValidDay = caracasDay - 1;
    const lastValidData = currentCurve.find(d => d.dia === lastValidDay);

    return NextResponse.json({
      mesActual: currentCurve,
      mesAnterior: lastCurve,
      stats: {
        diasPara50Actual,
        diasPara50Anterior,
        diaActualCaracas: caracasDay,
        recaudacionHoy: lastValidData?.monto || 0
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
