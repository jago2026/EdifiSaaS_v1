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

    const { data: detalles, error } = await query;

    if (error) throw error;

    return NextResponse.json({ detalles: detalles || [] });
  } catch (error: any) {
    console.error("Error loading recibo detalle:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}