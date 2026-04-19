import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

function normalizeMes(mesStr: string): string {
  const match = mesStr?.match(/^(\d{2})-(\d{4})$/);
  return match ? `${match[2]}-${match[1]}` : (mesStr || "");
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const edificioId = searchParams.get("edificioId");
  const mes = searchParams.get("mes");
  const unidad = searchParams.get("unidad");

  if (!edificioId) {
    return NextResponse.json({ error: "edificioId required" }, { status: 400 });
  }

  const mesNormalizado = normalizeMes(mes || "");
  console.log(`ReciboDetalle API: edificioId=${edificioId}, mes=${mes}, mesNormalizado=${mesNormalizado}, unidad=${unidad}`);

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    let targetMes = mesNormalizado;
    
    if (!targetMes || targetMes === "") {
      console.log("[RECIBO-DETALLE] No mes specified, fetching most recent month");
      const recentQuery = supabase
        .from("recibos_detalle")
        .select("mes")
        .eq("edificio_id", edificioId)
        .eq("unidad", "GENERAL")
        .order("mes", { ascending: false })
        .limit(1);
      const { data: recentData } = await recentQuery;
      if (recentData && recentData.length > 0) {
        targetMes = recentData[0].mes;
        console.log("[RECIBO-DETALLE] Using most recent month:", targetMes);
      }
    }
    
    let query = supabase
      .from("recibos_detalle")
      .select("*")
      .eq("edificio_id", edificioId);

    if (targetMes) {
      query = query.eq("mes", targetMes);
      console.log("[RECIBO-DETALLE] Searching for mes:", targetMes);
    }

    if (unidad) {
      query = query.eq("unidad", unidad);
    }

    query = query.order("codigo");

    let { data: detalles, error } = await query;

    if (error) {
      console.error("Supabase error in recibo-detalle:", error);
      throw error;
    }

    console.log(`ReciboDetalle API: Encontrados ${detalles?.length || 0} registros para mes=${targetMes}`);
    return NextResponse.json({ detalles: detalles || [] });
  } catch (error: any) {
    console.error("Error loading recibo detalle:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}