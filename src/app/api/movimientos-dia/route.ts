import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";


export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const edificioId = searchParams.get("edificioId");
  const dias = parseInt(searchParams.get("dias") || "30") || 30;

  if (!edificioId) {
    return NextResponse.json({ error: "edificioId required" }, { status: 400 });
  }

  

  try {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - dias);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    // Get movements from last N days
    const { data: movimientosDia, error } = await supabase
      .from("movimientos_dia")
      .select("*")
      .eq("edificio_id", edificioId)
      .gte("detectado_en", startDateStr)
      .order("detectado_en", { ascending: true });

    if (error) throw error;

    // Also get pagos_recibos for the same period
    const { data: pagos } = await supabase
      .from("pagos_recibos")
      .select("*")
      .eq("edificio_id", edificioId)
      .gte("fecha_pago", startDateStr)
      .order("fecha_pago", { ascending: true });

    // Also get egresos (historical)
    const { data: egresos } = await supabase
      .from("egresos")
      .select("*")
      .eq("edificio_id", edificioId)
      .gte("fecha", startDateStr)
      .order("fecha", { ascending: true });

    // Also get gastos (historical)
    const { data: gastos } = await supabase
      .from("gastos")
      .select("*")
      .eq("edificio_id", edificioId)
      .gte("fecha", startDateStr)
      .order("fecha", { ascending: true });

    // Build cashFlow format expected by frontend
    const cashFlowMap = new Map();
    
    // 1. Add specialized tables first (more reliable/detailed)
    // Add pagos_recibos
    (pagos || []).forEach((p: any) => {
      const f = p.fecha_pago;
      if (!f) return;
      if (!cashFlowMap.has(f)) cashFlowMap.set(f, { fecha: f, cobranza: 0, otros_ingresos: 0, egresos_operat: 0, otros_egresos: 0, ingresos: 0, egresos: 0 });
      const entry = cashFlowMap.get(f);
      entry.cobranza += Number(p.monto || 0);
      entry.ingresos += Number(p.monto || 0);
    });
    
    // Add egresos
    (egresos || []).forEach((e: any) => {
      const f = e.fecha;
      if (!f) return;
      if (!cashFlowMap.has(f)) cashFlowMap.set(f, { fecha: f, cobranza: 0, otros_ingresos: 0, egresos_operat: 0, otros_egresos: 0, ingresos: 0, egresos: 0 });
      const entry = cashFlowMap.get(f);
      entry.egresos_operat += Number(e.monto || 0);
      entry.egresos += Number(e.monto || 0);
    });
    
    // Add gastos
    (gastos || []).forEach((g: any) => {
      const f = g.fecha;
      if (!f) return;
      if (!cashFlowMap.has(f)) cashFlowMap.set(f, { fecha: f, cobranza: 0, otros_ingresos: 0, egresos_operat: 0, otros_egresos: 0, ingresos: 0, egresos: 0 });
      const entry = cashFlowMap.get(f);
      entry.egresos_operat += Number(g.monto || 0);
      entry.egresos += Number(g.monto || 0);
    });

    // 2. Add movimientos_dia ONLY if they are not from the above sources (to avoid double counting)
    (movimientosDia || []).forEach((m: any) => {
      const f = m.detectado_en;
      if (!f) return;
      
      // Skip if this movement was already accounted for by the specialized tables
      const fuentesSincronizadas = ['recibos', 'egresos', 'gastos', 'deteccion_automatica', 'deteccion_parcial', 'ingresos'];
      if (m.fuente && fuentesSincronizadas.includes(m.fuente)) {
        return; 
      }

      if (!cashFlowMap.has(f)) cashFlowMap.set(f, { fecha: f, cobranza: 0, otros_ingresos: 0, egresos_operat: 0, otros_egresos: 0, ingresos: 0, egresos: 0 });
      const entry = cashFlowMap.get(f);
      
      if (m.tipo === 'recibo') {
        entry.otros_ingresos += Number(m.monto || 0);
        entry.ingresos += Number(m.monto || 0);
      } else {
        entry.otros_egresos += Number(m.monto || 0);
        entry.egresos += Number(m.monto || 0);
      }
    });

    const cashFlow = Array.from(cashFlowMap.values()).sort((a: any, b: any) => a.fecha.localeCompare(b.fecha));

    return NextResponse.json({ 
      movimientos: movimientosDia || [],
      pagos: pagos || [],
      egresos: egresos || [],
      gastos: gastos || [],
      cashFlow: cashFlow,
      fechaInicio: startDateStr
    });
  } catch (error: any) {
    console.error("Error loading movimientos dia:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}