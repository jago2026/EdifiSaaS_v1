import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

const FALLBACK_TASA = parseFloat(process.env.BCV_FALLBACK_TASA || "45.50");

type RouteParams = {
  params: Promise<{ fecha: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { fecha } = await params;
    if (!fecha) {
      return NextResponse.json({ tasa: FALLBACK_TASA }, { status: 400 });
    }

    
    
    let fechaBusqueda = fecha;
    if (fecha.includes("T")) {
      fechaBusqueda = fecha.split("T")[0];
    }

    const { data, error } = await supabase
      .from("tasas_cambio")
      .select("tasa_dolar")
      .lte("fecha", fechaBusqueda)
      .order("fecha", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      const { data: anyData } = await supabase
        .from("tasas_cambio")
        .select("tasa_dolar")
        .order("fecha", { ascending: false })
        .limit(1)
        .single();
      return NextResponse.json({ tasa: anyData?.tasa_dolar || FALLBACK_TASA });
    }

    return NextResponse.json({ tasa: data.tasa_dolar });
  } catch (error) {
    console.error("Get tasa by fecha error:", error);
    return NextResponse.json({ tasa: FALLBACK_TASA });
  }
}