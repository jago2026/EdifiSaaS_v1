import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const edificioId = searchParams.get("edificioId");
  const mes = searchParams.get("mes");
  const unidad = searchParams.get("unidad");

  if (!edificioId) {
    return NextResponse.json({ error: "edificioId required" }, { status: 400 });
  }

  console.log(`ReciboDetalle API: edificioId=${edificioId}, mes=${mes}, unidad=${unidad}`);

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    let query = supabase
      .from("recibos_detalle")
      .select("*")
      .eq("edificio_id", edificioId)
      .order("codigo");

    if (mes) {
      query = query.eq("mes", mes);
    }

    if (unidad) {
      query = query.eq("unidad", unidad);
    }

    let { data: detalles, error } = await query;

    // Si no hay mes especificado yunidad es GENERAL, obtener el mes más reciente
    if (!error && (!detalles || detalles.length === 0) && !mes && unidad === "GENERAL") {
      const fallbackQuery = supabase
        .from("recibos_detalle")
        .select("*")
        .eq("edificio_id", edificioId)
        .eq("unidad", "GENERAL")
        .order("mes", { ascending: false })
        .limit(1);
      const { data: fallback, error: fallbackError } = await fallbackQuery;
      if (!fallbackError && fallback && fallback.length > 0) {
        detalles = fallback;
      }
    }

    if (error) {
      console.error("Supabase error in recibo-detalle:", error);
      throw error;
    }

    console.log(`ReciboDetalle API: Encontrados ${detalles?.length || 0} registros`);
    return NextResponse.json({ detalles: detalles || [] });
  } catch (error: any) {
    console.error("Error loading recibo detalle:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}