import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";


function normalizeMonth(mes: string | null | undefined): string {
  if (!mes) return "";
  const trimmed = mes.trim();
  if (/^\d{4}-\d{2}$/.test(trimmed)) return trimmed;
  const parts = trimmed.split(/[-/]/);
  if (parts.length !== 2) return trimmed;
  let monthPart = parts[0];
  let yearPart = parts[1];
  if (monthPart.length === 4) {
    return `${monthPart}-${yearPart.padStart(2, "0")}`;
  }
  const month = parseInt(monthPart, 10);
  if (month >= 1 && month <= 12) {
    monthPart = month.toString().padStart(2, "0");
  }
  return `${yearPart}-${monthPart}`;
}

async function getTasaBCVParaMes(mes: string, supabase: any): Promise<number> {
  if (!mes) {
    const { data } = await supabase.from("tasas_cambio").select("tasa_dolar").order("fecha", { ascending: false }).limit(1).single();
    return data?.tasa_dolar || 45.50;
  }
  const prefix = normalizeMonth(mes);
  const { data } = await supabase.from("tasas_cambio")
    .select("tasa_dolar, fecha")
    .gte("fecha", `${prefix}-01`)
    .lte("fecha", `${prefix}-31`)
    .order("fecha", { ascending: false });

  if (data && data.length > 0) return data[0].tasa_dolar;

  const { data: fallback } = await supabase.from("tasas_cambio")
    .select("tasa_dolar")
    .lt("fecha", `${prefix}-01`)
    .order("fecha", { ascending: false }).limit(1).single();
  
  return fallback?.tasa_dolar || 45.50;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const edificioId = searchParams.get("edificioId");
    const mes = searchParams.get("mes");

    if (!edificioId) {
      return NextResponse.json({ error: "Falta edificioId" }, { status: 400 });
    }

    

    let query = supabase.from("balances").select("*").eq("edificio_id", edificioId);
    
    if (mes) {
      query = query.eq("mes", normalizeMonth(mes));
    } else {
      query = query.order("mes", { ascending: false }).limit(1);
    }

    const { data: balances, error } = await query;

    if (error) {
      console.error("Balance query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const balance = balances?.[0] || null;
    
    // Obtener meses disponibles
    const { data: mesesData } = await supabase.from("balances")
      .select("mes")
      .eq("edificio_id", edificioId)
      .order("mes", { ascending: false });
    const mesesDisponibles = Array.from(new Set(mesesData?.map(m => m.mes).filter(Boolean)));

    const targetMes = balance?.mes || mes;
    const tasa = await getTasaBCVParaMes(targetMes, supabase);
    
    if (balance) {
      balance.saldo_anterior_usd = Number(balance.saldo_anterior) / tasa;
      balance.cobranza_mes_usd = Number(balance.cobranza_mes) / tasa;
      balance.gastos_facturados_usd = Number(balance.gastos_facturados) / tasa;
      balance.saldo_disponible_usd = Number(balance.saldo_disponible) / tasa;
      balance.total_por_cobrar_usd = Number(balance.total_por_cobrar) / tasa;
      balance.fondo_reserva_usd = Number(balance.fondo_reserva) / tasa;
      balance.fondo_prestaciones_usd = Number(balance.fondo_prestaciones) / tasa;
      balance.fondo_trabajos_varios_usd = Number(balance.fondo_trabajos_varios) / tasa;
      balance.fondo_intereses_usd = Number(balance.fondo_intereses) / tasa;
      balance.fondo_diferencial_cambiario_usd = Number(balance.fondo_diferencial_cambiario) / tasa;
      balance.tasa_bcv = tasa;
    }

    return NextResponse.json({ balance, tasa, mesesDisponibles });
  } catch (error: any) {
    console.error("Balance API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
