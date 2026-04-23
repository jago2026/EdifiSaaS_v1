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

    const allMovements: any[] = [];

    // Get pagos from pagos_recibos for current month
    const { data: pagos } = await supabase
      .from("pagos_recibos")
      .select("id, unidad, propietario, monto, fecha_pago, mes")
      .eq("edificio_id", edificioId)
      .eq("mes", currentMes)
      .order("fecha_pago", { ascending: false })
      .limit(100);

    // Add pagos as "pago" type
    if (pagos) {
      for (const p of pagos) {
        allMovements.push({
          id: p.id,
          fecha: p.fecha_pago,
          tipo: "pago",
          descripcion: `Pago - ${p.unidad} - ${p.propietario || ""}`,
          monto: p.monto,
          monto_usd: p.monto / 45, // approximate
          unidad: p.unidad,
          propietario: p.propietario,
          fuente: "pagos_recibos",
        });
      }
    }

    // Get egresos from egresos table for current month
    const { data: egresos } = await supabase
      .from("egresos")
      .select("id, fecha, beneficiario, descripcion, monto, monto_usd")
      .eq("edificio_id", edificioId)
      .like("mes", `${currentMes}%`)
      .order("fecha", { ascending: false })
      .limit(100);

    if (egresos) {
      for (const e of egresos) {
        allMovements.push({
          id: e.id,
          fecha: e.fecha,
          tipo: "egreso",
          descripcion: `${e.beneficiario} - ${e.descripcion || ""}`,
          monto: e.monto,
          monto_usd: e.monto_usd || e.monto / 45,
          fuente: "egresos",
        });
      }
    }

    // Get gastos from gastos table for current month
    const { data: gastos } = await supabase
      .from("gastos")
      .select("id, fecha, codigo, descripcion, monto, monto_usd")
      .eq("edificio_id", edificioId)
      .like("mes", `${currentMes}%`)
      .order("fecha", { ascending: false })
      .limit(100);

    if (gastos) {
      for (const g of gastos) {
        allMovements.push({
          id: g.id,
          fecha: g.fecha,
          tipo: "gasto",
          descripcion: `${g.codigo} - ${g.descripcion}`,
          monto: g.monto,
          monto_usd: g.monto_usd || g.monto / 45,
          fuente: "gastos",
        });
      }
    }

    // Sort by fecha descending
    allMovements.sort((a, b) => {
      const dateA = new Date(a.fecha || "1970-01-01").getTime();
      const dateB = new Date(b.fecha || "1970-01-01").getTime();
      return dateB - dateA;
    });

    // Deduplicate by type, date, description and amount to avoid repeating rows
    const uniqueMovementsMap = new Map();
    allMovements.forEach((m: any) => {
      const key = `${m.tipo}-${m.fecha}-${m.descripcion}-${m.monto}`;
      if (!uniqueMovementsMap.has(key)) {
        uniqueMovementsMap.set(key, m);
      }
    });
    const deduplicatedMovements = Array.from(uniqueMovementsMap.values());

    return NextResponse.json({ 
      movimientos: deduplicatedMovements.slice(0, 100),
      total: deduplicatedMovements.length 
    });
  } catch (error: any) {
    console.error("Movimientos error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}