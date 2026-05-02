import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";
const FALLBACK_TASA = parseFloat(process.env.BCV_FALLBACK_TASA || "45.50");

async function getTasaForDate(supabase: any, fechaPago: string): Promise<number> {
  try {
    // Get all tasas_cambio sorted by date to find the closest one
    const { data: tasas } = await supabase
      .from("tasas_cambio")
      .select("fecha, tasa_dolar")
      .order("fecha", { ascending: false });
    
    if (!tasas || tasas.length === 0) {
      return FALLBACK_TASA;
    }

    // 1. Try exact date match
    const exact = tasas.find((t: any) => t.fecha === fechaPago);
    if (exact) return parseFloat(exact.tasa_dolar);

    // 2. Find closest date BEFORE payment date (most common case)
    const before = tasas.find((t: any) => t.fecha && t.fecha < fechaPago);
    if (before) return parseFloat(before.tasa_dolar);

    // 3. Find closest date AFTER payment date (future rate not yet available)
    const after = tasas.find((t: any) => t.fecha && t.fecha > fechaPago);
    if (after) return parseFloat(after.tasa_dolar);

    // 4. Ultimate fallback: use most recent rate
    return parseFloat(tasas[0].tasa_dolar);
  } catch (error) {
    console.error("Error getting tasa for date:", error);
    return FALLBACK_TASA;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const edificioId = searchParams.get("edificioId");

    if (!edificioId) {
      return NextResponse.json({ error: "Falta edificioId" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current month
    const today = new Date();
    const currentMes = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    // Get pagos from pagos_recibos table
    const { data: pagos, error } = await supabase
      .from("pagos_recibos")
      .select("id, unidad, propietario, mes, monto, fecha_pago, source, verificado")
      .eq("edificio_id", edificioId)
      .eq("mes", currentMes)
      .order("fecha_pago", { ascending: false });

    if (error) {
      console.error("Error fetching pagos:", error);
      return NextResponse.json({ pagos: [], error: error.message }, { status: 500 });
    }

    // Get all tasas_cambio for lookup
    const { data: tasasHistoricas } = await supabase
      .from("tasas_cambio")
      .select("fecha, tasa_dolar")
      .order("fecha", { ascending: false })
      .limit(500);

    // Helper to get tasa for a date
    function getTasaParaFecha(fechaStr: string | null): number {
      if (!fechaStr || !tasasHistoricas || tasasHistoricas.length === 0) {
        return FALLBACK_TASA;
      }
      
      // Exact match
      const exact = tasasHistoricas.find((t: any) => t.fecha === fechaStr);
      if (exact) return parseFloat(exact.tasa_dolar);
      
      // Find closest before
      const before = tasasHistoricas.find((t: any) => t.fecha && t.fecha < fechaStr);
      if (before) return parseFloat(before.tasa_dolar);
      
      // Find closest after
      const after = tasasHistoricas.find((t: any) => t.fecha && t.fecha > fechaStr);
      if (after) return parseFloat(after.tasa_dolar);
      
      // Fallback to most recent
      return parseFloat(tasasHistoricas[0]?.tasa_dolar || FALLBACK_TASA);
    }

    // Transform and deduplicate pagos
    const uniquePagosMap = new Map();
    
    (pagos || []).forEach((p: any) => {
      const key = `${p.unidad}_${p.mes}_${Number(p.monto || 0).toFixed(2)}_${p.fecha_pago}`;
      if (uniquePagosMap.has(key)) return;

      const tasa = getTasaParaFecha(p.fecha_pago);
      const montoBs = parseFloat(p.monto || 0);
      
      uniquePagosMap.set(key, {
        id: p.id,
        fecha: p.fecha_pago || new Date().toISOString().split("T")[0],
        unidad: p.unidad,
        propietario: p.propietario || "",
        numRecibos: 1,
        montoBs: montoBs,
        montoUsd: tasa > 0 ? montoBs / tasa : 0,
        tasaCambio: tasa,
        estado: "pagado",
        verificado: p.verificado || false
      });
    });

    const pagosFormatted = Array.from(uniquePagosMap.values());

    return NextResponse.json({ pagos: pagosFormatted, mes: currentMes });
  } catch (error: any) {
    console.error("Ingresos API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
