import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const edificioId = searchParams.get("edificioId");

  if (!edificioId) {
    return NextResponse.json({ error: "edificioId required" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log(`Sincronizaciones API: Fetching for edificioId=${edificioId}`);

  try {
    // Intentar primero con todas las columnas
    const { data: sincronizaciones, error } = await supabase
      .from("sincronizaciones")
      .select("*")
      .eq("edificio_id", edificioId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error) {
        console.log(`Sincronizaciones API: Encontrados ${sincronizaciones?.length || 0} registros`);
        return NextResponse.json({ sincronizaciones: sincronizaciones || [] });
    }

    // Fallback: Si falla el select * (probablemente por columnas faltantes como tipo/detalles),
    // seleccionamos solo las columnas básicas garantizadas en el esquema original.
    console.log("Sincronizaciones API: falling back to basic columns due to error:", error.message);
    const { data: basicSinc, error: basicErr } = await supabase
      .from("sincronizaciones")
      .select("id, edificio_id, estado, movimientos_nuevos, error, created_at")
      .eq("edificio_id", edificioId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (basicErr) throw basicErr;

    return NextResponse.json({ sincronizaciones: basicSinc || [] });
  } catch (error: any) {
    console.error("Error loading sincronizaciones:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
