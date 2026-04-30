import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const DIA_ORDER = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const normalizeDia = (s: string | null | undefined): string => {
  if (!s) return "";
  const t = s.toString().trim();
  const lower = t.toLowerCase();
  const map: Record<string, string> = {
    lun: "Lunes", lunes: "Lunes",
    mar: "Martes", martes: "Martes",
    mie: "Miércoles", "mié": "Miércoles", miercoles: "Miércoles", "miércoles": "Miércoles",
    jue: "Jueves", jueves: "Jueves",
    vie: "Viernes", viernes: "Viernes",
    sab: "Sábado", "sáb": "Sábado", sabado: "Sábado", "sábado": "Sábado",
    dom: "Domingo", domingo: "Domingo",
  };
  return map[lower] || t.charAt(0).toUpperCase() + t.slice(1);
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const edificioId = searchParams.get("edificioId");

  if (!edificioId) {
    return NextResponse.json({ error: "Falta edificioId" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Fecha de hoy (Caracas) para no traer datos futuros
    const todayStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Caracas",
      year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());

    // Limitar a los últimos 365 días para mantener la query liviana
    const since = new Date();
    since.setDate(since.getDate() - 365);
    const sinceStr = since.toISOString().substring(0, 10);

    const { data: rows, error } = await supabase
      .from("control_diario")
      .select(
        "fecha, dia_semana, saldo_inicial_bs, saldo_inicial_usd, ingresos_bs, ingresos_usd, " +
        "egresos_bs, egresos_usd, ajustes_bs, ajustes_usd, saldo_final_bs, saldo_final_usd, " +
        "tasa_cambio, recibos_pendientes, fondo_reserva_bs, fondo_reserva_usd, " +
        "fondo_dif_camb_bs, fondo_dif_camb_usd, fondo_int_mor_bs, fondo_int_mor_usd, " +
        "total_fondos_bs, total_fondos_usd, disponibilidad_total_bs, disponibilidad_total_usd"
      )
      .eq("edificio_id", edificioId)
      .gte("fecha", sinceStr)
      .lte("fecha", todayStr)
      .order("fecha", { ascending: true }) as unknown as { data: any[], error: any };

    if (error) throw error;

    const records = rows || [];

    if (records.length === 0) {
      return NextResponse.json({
        empty: true,
        message: "No hay registros en control_diario para este edificio.",
      });
    }

    const last = records[records.length - 1];
    const tasaActual = Number(last.tasa_cambio) || 0;

    // -----------------------------------------------------------
    // 1) Salud de Caja: Disponibilidad Total / Egresos prom mensuales
    // -----------------------------------------------------------
    // Agrupamos egresos por mes (YYYY-MM) tomando el TOTAL de egresos del mes
    const egresosPorMes: Record<string, number> = {};
    for (const r of records) {
      const ym = String(r.fecha).substring(0, 7);
      egresosPorMes[ym] = (egresosPorMes[ym] || 0) + (Number(r.egresos_usd) || 0);
    }
    const meses = Object.keys(egresosPorMes).sort();
    // Promedio sobre los últimos hasta 6 meses con datos (más estable que 12)
    const ultimosMeses = meses.slice(-6);
    const sumEgresos = ultimosMeses.reduce((a, m) => a + (egresosPorMes[m] || 0), 0);
    const egresosPromMensualUsd = ultimosMeses.length > 0 ? sumEgresos / ultimosMeses.length : 0;
    const disponibilidadUsd = Number(last.disponibilidad_total_usd) || 0;
    const mesesCubiertos = egresosPromMensualUsd > 0 ? disponibilidadUsd / egresosPromMensualUsd : 0;

    // -----------------------------------------------------------
    // 2) Brecha Cambiaria: serie histórica con saldo USD nominal
    //    vs saldo Bs convertido a USD con la tasa del DÍA actual.
    //    Esto evidencia cuánto poder adquisitivo se perdió por
    //    mantener el saldo en Bs en lugar de USD.
    // -----------------------------------------------------------
    const brechaCambiaria = records.map((r) => {
      const saldoBs = Number(r.saldo_final_bs) || 0;
      const saldoUsd = Number(r.saldo_final_usd) || 0;
      const bsEnUsdHoy = tasaActual > 0 ? saldoBs / tasaActual : 0;
      return {
        fecha: r.fecha,
        saldoUsd: Number(saldoUsd.toFixed(2)),
        bsEnUsdHoy: Number(bsEnUsdHoy.toFixed(2)),
        brecha: Number((saldoUsd - bsEnUsdHoy).toFixed(2)),
      };
    });

    // -----------------------------------------------------------
    // 3) Perfil de Morosidad mensual: distribución de apartamentos
    //    por antigüedad de deuda (1 cuota, 2-3 cuotas, 4+ cuotas)
    //    usando la tabla historico_cobranza (un snapshot por día,
    //    tomamos el último registro de cada mes para el resumen mensual).
    // -----------------------------------------------------------
    const sinceHC = new Date();
    sinceHC.setMonth(sinceHC.getMonth() - 12);
    const sinceHCStr = sinceHC.toISOString().substring(0, 10);

    const { data: hcRows } = await supabase
      .from("historico_cobranza")
      .select(
        "fecha, aptos_pendientes_total, monto_pendiente_total, pct_pendiente, tasa_cambio, " +
        "aptos_1_recibo, aptos_2_recibo, aptos_3_recibo, aptos_4_recibo, aptos_5_recibo, " +
        "aptos_6_recibo, aptos_7_recibo, aptos_8_recibo, aptos_9_recibo, aptos_10_recibo, " +
        "aptos_11_recibo, aptos_12_mas_recibo, " +
        "monto_1_recibo, monto_2_recibo, monto_3_recibo, monto_4_recibo, monto_5_recibo, " +
        "monto_6_recibo, monto_7_recibo, monto_8_recibo, monto_9_recibo, monto_10_recibo, " +
        "monto_11_recibo, monto_12_mas_recibo"
      )
      .eq("edificio_id", edificioId)
      .gte("fecha", sinceHCStr)
      .lte("fecha", todayStr)
      .order("fecha", { ascending: true });

    // Obtener el mes actual para calcular el monto real desde la tabla recibos
    const currentMonthStr = todayStr.substring(0, 7);

    // Consultar recibos del mes actual directamente para obtener el total real de deuda
    const { data: recibosData } = await supabase
      .from("recibos")
      .select("deuda, deuda_usd")
      .eq("edificio_id", edificioId)
      .eq("mes", currentMonthStr)
      .gt("deuda", 0);

    // Calcular el monto real en USD directamente desde recibos
    const realTotalDebtUsd = (recibosData || []).reduce((sum, r: any) => {
      const deudaUsd = Number(r.deuda_usd) || 0;
      const deudaBs = Number(r.deuda) || 0;
      // Usar deuda_usd si existe, sino convertir desde Bs usando la tasa actual
      return sum + (deudaUsd > 0 ? deudaUsd : deudaBs / tasaActual);
    }, 0);

    // Tomar el último snapshot de cada mes
    const lastPerMonth: Record<string, any> = {};
    for (const r of (hcRows || [])) {
      const ym = String(r.fecha).substring(0, 7);
      lastPerMonth[ym] = r;
    }

    const perfilMorosidad = Object.entries(lastPerMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ym, r], index) => {
        const aptos1     = Number(r.aptos_1_recibo) || 0;
        const aptos2     = Number(r.aptos_2_recibo) || 0;
        const aptos3     = Number(r.aptos_3_recibo) || 0;
        const aptos4a6   = (Number(r.aptos_4_recibo) || 0) + (Number(r.aptos_5_recibo) || 0) + (Number(r.aptos_6_recibo) || 0);
        const aptos7mas  = [7,8,9,10,11].reduce((s,i) => s + (Number(r[`aptos_${i}_recibo`]) || 0), 0) + (Number(r.aptos_12_mas_recibo) || 0);
        const total      = Number(r.aptos_pendientes_total) || 0;
        const tasa       = Number(r.tasa_cambio) || 1;

        // Para el mes actual, usar el valor calculado directamente desde la tabla recibos
        // Para meses anteriores, usar la lógica original con conversión
        let montoUsd: number;
        let montoSum: number;

        if (ym === currentMonthStr) {
          // Mes actual: usar el total real calculado desde recibos
          montoUsd = Number(realTotalDebtUsd.toFixed(0));
          // Para montoSum (suma de buckets), también calcular correctamente
          const bucketsConvertidos = [1,2,3,4,5,6,7,8,9,10,11].map(i => {
            const val = Number(r[`monto_${i}_recibo`]) || 0;
            const enUsd = val / tasa;
            return enUsd > 1000 ? val / tasa : val; // Si estaba en Bs, convertir
          });
          const bucket12mas = (() => {
            const val = Number(r.monto_12_mas_recibo) || 0;
            const enUsd = val / tasa;
            return enUsd > 1000 ? val / tasa : val;
          })();
          montoSum = bucketsConvertidos.reduce((s, v) => s + v, 0) + bucket12mas;
        } else {
          // Meses anteriores: usar lógica original
          const rawMontoTotal = Number(r.monto_pendiente_total) || 0;
          const rawMontoBuckets = [1,2,3,4,5,6,7,8,9,10,11].reduce((s,i) => s + (Number(r[`monto_${i}_recibo`]) || 0), 0)
                               + (Number(r.monto_12_mas_recibo) || 0);

          const estaEnBs = (valor: number, t: number) => {
            if (valor <= 1000) return false;
            if (t <= 1) return false;
            const enUsd = valor / t;
            return enUsd > 1000;
          };

          montoUsd = estaEnBs(rawMontoTotal, tasa) ? rawMontoTotal / tasa : rawMontoTotal;

          const bucketsConvertidos = [1,2,3,4,5,6,7,8,9,10,11].map(i => {
            const val = Number(r[`monto_${i}_recibo`]) || 0;
            return estaEnBs(val, tasa) ? val / tasa : val;
          });
          const bucket12mas = estaEnBs(Number(r.monto_12_mas_recibo) || 0, tasa)
            ? (Number(r.monto_12_mas_recibo) || 0) / tasa
            : (Number(r.monto_12_mas_recibo) || 0);
          montoSum = bucketsConvertidos.reduce((s, v) => s + v, 0) + bucket12mas;
        }

        const pct        = Number(r.pct_pendiente) || 0;
        const aptos2mas  = aptos2 + aptos3 + aptos4a6 + aptos7mas;
        const pct2mas    = total > 0 ? Math.round((aptos2mas / total) * 100) : 0;
        const [y, m] = ym.split("-");
        const meses  = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
        const label  = `${meses[parseInt(m, 10) - 1]} ${y.substring(2)}`;
        return {
          mes: label,
          ym,
          aptos1,
          aptos2,
          aptos3,
          aptos4a6,
          aptos7mas,
          total,
          aptos2mas,
          pct2mas,
          montoUsd: Number(montoUsd.toFixed(0)),
          montoSum: Number(montoSum.toFixed(0)),
          pctPendiente: Number(pct.toFixed(1)),
        };
      });

    // -----------------------------------------------------------
    // 4) Comportamiento de fondos específicos (USD)
    // -----------------------------------------------------------
    const fondos = records.map((r) => ({
      fecha: r.fecha,
      reserva: Number(r.fondo_reserva_usd) || 0,
      difCambiaria: Number(r.fondo_dif_camb_usd) || 0,
      intMora: Number(r.fondo_int_mor_usd) || 0,
      total: Number(r.total_fondos_usd) || 0,
    }));

    // -----------------------------------------------------------
    // 5) Heatmap por día de la semana (promedio ingresos/egresos USD)
    // -----------------------------------------------------------
    const acumPorDia: Record<string, { ingresos: number; egresos: number; count: number }> = {};
    for (const r of records) {
      let dia = normalizeDia(r.dia_semana);
      if (!dia) {
        // Fallback: derivar del campo fecha (1=Lun ... 7=Dom según locale es)
        const d = new Date(`${r.fecha}T12:00:00-04:00`);
        const idxJs = d.getUTCDay(); // 0=Dom, 1=Lun, ...
        const mapJs = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
        dia = mapJs[idxJs];
      }
      if (!acumPorDia[dia]) acumPorDia[dia] = { ingresos: 0, egresos: 0, count: 0 };
      acumPorDia[dia].ingresos += Number(r.ingresos_usd) || 0;
      acumPorDia[dia].egresos += Number(r.egresos_usd) || 0;
      acumPorDia[dia].count += 1;
    }
    const heatmap = DIA_ORDER.map((d) => {
      const a = acumPorDia[d] || { ingresos: 0, egresos: 0, count: 0 };
      const promIng = a.count > 0 ? a.ingresos / a.count : 0;
      const promEgr = a.count > 0 ? a.egresos / a.count : 0;
      return {
        dia: d,
        diaCorto: d.substring(0, 3),
        ingresos: Number(promIng.toFixed(2)),
        egresos: Number(promEgr.toFixed(2)),
        movimiento: Number((promIng + promEgr).toFixed(2)),
        count: a.count,
      };
    });

    // -----------------------------------------------------------
    // Datos resumen actuales (para tarjetas KPI)
    // -----------------------------------------------------------
    const resumen = {
      fecha: last.fecha,
      tasaCambio: tasaActual,
      saldoFinalBs: Number(last.saldo_final_bs) || 0,
      saldoFinalUsd: Number(last.saldo_final_usd) || 0,
      disponibilidadBs: Number(last.disponibilidad_total_bs) || 0,
      disponibilidadUsd: disponibilidadUsd,
      totalFondosBs: Number(last.total_fondos_bs) || 0,
      totalFondosUsd: Number(last.total_fondos_usd) || 0,
      recibosPendientes: Number(last.recibos_pendientes) || 0,
      ingresosUsdHoy: Number(last.ingresos_usd) || 0,
      egresosUsdHoy: Number(last.egresos_usd) || 0,
    };

    return NextResponse.json({
      empty: false,
      registros: records.length,
      resumen,
      saludCaja: {
        disponibilidadUsd,
        egresosPromMensualUsd: Number(egresosPromMensualUsd.toFixed(2)),
        mesesCubiertos: Number(mesesCubiertos.toFixed(2)),
        mesesUsadosEnPromedio: ultimosMeses.length,
      },
      brechaCambiaria,
      perfilMorosidad,
      fondos,
      heatmap,
    });
  } catch (err: any) {
    console.error("Error en /api/analytics/control-diario:", err);
    return NextResponse.json(
      { error: err?.message || "Error desconocido" },
      { status: 500 }
    );
  }
}
