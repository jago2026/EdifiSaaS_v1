import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const edificioId = searchParams.get("edificioId");

    if (!edificioId) {
      return NextResponse.json({ error: "Falta edificioId" }, { status: 400 });
    }

    
    const { data, error } = await supabase
      .from("servicios_publicos_config")
      .select("*")
      .eq("edificio_id", edificioId)
      .order("tipo", { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { edificioId, tipo, identificador, alias, diaConsulta } = body;

    if (!edificioId || !tipo || !identificador) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    

    // Check limits
    const { data: existing } = await supabase
      .from("servicios_publicos_config")
      .select("id")
      .eq("edificio_id", edificioId)
      .eq("tipo", tipo);

    const limits: any = { 'cantv': 2, 'hidrocapital': 2, 'corpoelec': 3 };
    if (existing && existing.length >= limits[tipo]) {
      return NextResponse.json({ error: `Límite alcanzado para ${tipo} (${limits[tipo]})` }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("servicios_publicos_config")
      .insert({
        edificio_id: edificioId,
        tipo,
        identificador,
        alias,
        dia_consulta: diaConsulta || 1
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

    
    const { error } = await supabase
      .from("servicios_publicos_config")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
