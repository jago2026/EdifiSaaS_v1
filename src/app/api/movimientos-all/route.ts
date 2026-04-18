import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

function getCurrentMonth(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  return `${yyyy}-${mm}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const edificioId = searchParams.get("edificioId");
    const mes = searchParams.get("mes"); // optional month filter format: YYYY-MM
    const fecha = searchParams.get("fecha"); // optional specific date filter (YYYY-MM-DD)

    if (!edificioId) {
      return NextResponse.json({ error: "Falta edificioId" }, { status: 400 });
    }

    const currentMes = mes || getCurrentMonth();
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query for movimientos_dia
    let query = supabase
      .from("movimientos_dia")
      .select("id, tipo, descripcion, monto, fecha, unidad_apartamento, propietario, fuente, detectado_en")
      .eq("edificio_id", edificioId);

    // Filter by month or specific date
    if (fecha) {
      query = query.eq("fecha", fecha);
    } else if (mes) {
      query = query.like("fecha", `${mes}%`);
    }

    const { data: movimientosDia, error: mdError } = await query
      .order("fecha", { ascending: false })
      .limit(100);

    if (mdError) {
      console.error("Error fetching movimientos_dia:", mdError);
    }

    // Also get pagos from pagos_recibos for current month
    const { data: pagos } = await supabase
      .from("pagos_recibos")
      .select("id, unidad, propietario, monto, fecha_pago, mes")
      .eq("edificio_id", edificioId)
      .eq("mes", currentMes)
      .order("fecha_pago", { ascending: false })
      .limit(50);

    const allMovements: any[] = [];

    // Add pagos as "pago" type
    if (pagos) {
      for (const p of pagos) {
        allMovements.push({
          id: p.id,
          fecha: p.fecha_pago,
          tipo: "pago",
          descripcion: `Pago - ${p.unidad} - ${p.propietario || ""}`,
          monto: p.monto,
          unidad: p.unidad,
          propietario: p.propietario,
          fuente: "pagos_recibos",
        });
      }
    }

    // Add movimientos_dia entries (egresos, gastos, etc.)
    if (movimientosDia) {
      for (const m of movimientosDia) {
        allMovements.push({
          id: m.id,
          fecha: m.fecha,
          tipo: m.tipo,
          descripcion: m.descripcion,
          monto: m.monto,
          unidad: m.unidad_apartamento,
          propietario: m.propietario,
          fuente: m.fuente,
        });
      }
    }

    // Sort by fecha descending
    allMovements.sort((a, b) => {
      const dateA = new Date(a.fecha || "1970-01-01").getTime();
      const dateB = new Date(b.fecha || "1970-01-01").getTime();
      return dateB - dateA;
    });

    return NextResponse.json({ 
      movimientos: allMovements.slice(0, 100),
      total: allMovements.length 
    });
  } catch (error: any) {
    console.error("Movimientos error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}