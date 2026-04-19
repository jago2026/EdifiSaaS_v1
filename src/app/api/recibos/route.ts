import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const edificioId = searchParams.get("edificioId");
    const mes = searchParams.get("mes");

    if (!edificioId) {
      return NextResponse.json({ error: "Falta edificioId" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const todayMes = new Date().toISOString().substring(0, 7);

    let query = supabase
      .from("recibos")
      .select("id, unidad, propietario, num_recibos, deuda, deuda_usd, mes")
      .eq("edificio_id", edificioId)
      .order("unidad", { ascending: true });

    if (mes) {
      query = query.eq("mes", mes);
    } else {
      // SI NO HAY MES, FILTRAR ESTRICTAMENTE POR EL MES ACTUAL
      query = query.eq("mes", todayMes);
    }

    const { data: recibos, error } = await query;

    if (error) {
      throw error;
    }

    // ELIMINAR DUPLICADOS (Asegurar una fila por unidad y mes)
    const uniqueRecibosMap = new Map();
    (recibos || []).forEach((r: any) => {
      const key = `${r.unidad}-${r.mes}`;
      if (!uniqueRecibosMap.has(key)) {
        uniqueRecibosMap.set(key, r);
      }
    });
    const uniqueRecibos = Array.from(uniqueRecibosMap.values());

    // Obtener meses disponibles
    const { data: mesesData } = await supabase.from("recibos")
      .select("mes")
      .eq("edificio_id", edificioId)
      .order("mes", { ascending: false });
    const mesesDisponibles = Array.from(new Set(mesesData?.map(m => m.mes).filter(Boolean)));

    return NextResponse.json({ recibos: uniqueRecibos, mesesDisponibles });
  } catch (error: any) {
    console.error("Recibos error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
