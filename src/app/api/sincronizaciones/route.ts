import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";


export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const edificioId = searchParams.get("edificioId");

  if (!edificioId) {
    return NextResponse.json({ error: "edificioId required" }, { status: 400 });
  }

  

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

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");
  const mes = searchParams.get("mes");
  const edificioId = searchParams.get("edificioId");

  if (!id || !edificioId) {
    return NextResponse.json({ error: "id and edificioId required" }, { status: 400 });
  }

  

  try {
    // Si se proporciona un mes, eliminar datos de ese mes
    if (mes && mes !== 'Actual') {
      console.log(`Deleting all data for month ${mes} and building ${edificioId}`);
      
      // Borrar de todas las tablas que tienen columna 'mes'
      await Promise.all([
        supabase.from("recibos").delete().eq("edificio_id", edificioId).eq("mes", mes),
        supabase.from("egresos").delete().eq("edificio_id", edificioId).eq("mes", mes),
        supabase.from("gastos").delete().eq("edificio_id", edificioId).eq("mes", mes),
        supabase.from("balances").delete().eq("edificio_id", edificioId).eq("mes", mes),
        supabase.from("recibos_detalle").delete().eq("edificio_id", edificioId).eq("mes", mes),
        supabase.from("pagos_recibos").delete().eq("edificio_id", edificioId).eq("mes", mes),
        supabase.from("fondo_reserva").delete().eq("edificio_id", edificioId).eq("mes", mes)
      ]);
    }

    // Borrar el registro de sincronización
    const { error } = await supabase
      .from("sincronizaciones")
      .delete()
      .eq("id", id)
      .eq("edificio_id", edificioId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting sincronizacion:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
