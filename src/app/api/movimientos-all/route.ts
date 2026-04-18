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
    const tipo = searchParams.get("tipo"); // optional filter
    const mes = searchParams.get("mes"); // optional month filter format: YYYY-MM
    const fecha = searchParams.get("fecha"); // optional specific date filter (YYYY-MM-DD)

    if (!edificioId) {
      return NextResponse.json({ error: "Falta edificioId" }, { status: 400 });
    }

    const currentMes = mes || getCurrentMonth();
    const mesFilter = `-${currentMes.split("-")[1]}-20`; // Format: -04-2026

    const supabase = createClient(supabaseUrl, supabaseKey);
    const allMovements: any[] = [];

    // If filtering by specific date, use that; otherwise use current month
    const dateFilter = fecha || new Date().toISOString().split('T')[0];

    // Fetch recibos as "ingreso" type
    const { data: recibos } = await supabase
      .from("recibos")
      .select("id, fecha, unidad, propietario, deuda, num_recibos")
      .eq("edificio_id", edificioId)
      .order("id", { ascending: false })
      .limit(100);

    if (recibos) {
      for (const r of recibos) {
        allMovements.push({
          id: r.id,
          fecha: new Date().toISOString().split("T")[0], // Use current date as proxy
          tipo: "recibo",
          descripcion: `Recibo(s): ${r.num_recibos} - Deuda: Bs. ${Number(r.deuda || 0).toLocaleString("es-VE")}`,
          monto: r.deuda || 0,
          unidad: r.unidad,
          propietario: r.propietario,
          fuente: "recibos",
        });
      }
    }

    // Fetch egresos - filter by date if provided
    const { data: egresos } = await supabase
      .from("egresos")
      .select("id, fecha, beneficiario, descripcion, monto")
      .eq("edificio_id", edificioId)
      .eq("fecha", dateFilter)
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
          fuente: "egresos",
        });
      }
    }

    // Fetch gastos - filter by date if provided
    const { data: gastos } = await supabase
      .from("gastos")
      .select("id, fecha, codigo, descripcion, monto")
      .eq("edificio_id", edificioId)
      .eq("fecha", dateFilter)
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
          fuente: "gastos",
        });
      }
    }

    // Sort by fecha descending
    allMovements.sort((a, b) => {
      const dateA = new Date(a.fecha).getTime();
      const dateB = new Date(b.fecha).getTime();
      return dateB - dateA;
    });

    // Filter by tipo if provided
    const filtered = tipo 
      ? allMovements.filter(m => m.tipo === tipo)
      : allMovements;

    return NextResponse.json({ 
      movimientos: filtered.slice(0, 100),
      total: filtered.length 
    });
  } catch (error: any) {
    console.error("Movimientos error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}