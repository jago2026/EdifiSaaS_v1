import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const edificioId = searchParams.get("edificioId");
  const mes = searchParams.get("mes") || new Date().toISOString().slice(0, 7).split('-').reverse().join('-'); // MM-YYYY

  if (!edificioId) {
    return NextResponse.json({ error: "edificioId is required" }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from("pre_recibo_manual")
      .select("*")
      .eq("edificio_id", edificioId)
      .eq("mes", mes)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ items: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { edificioId, mes, codigo, descripcion, monto } = body;

    if (!edificioId || !descripcion || monto === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const itemMes = mes || new Date().toISOString().slice(0, 7).split('-').reverse().join('-');

    const { data, error } = await supabase
      .from("pre_recibo_manual")
      .insert([
        {
          edificio_id: edificioId,
          mes: itemMes,
          codigo: codigo || "MANUAL",
          descripcion,
          monto: Number(monto)
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ item: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    const { error } = await supabase
      .from("pre_recibo_manual")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
