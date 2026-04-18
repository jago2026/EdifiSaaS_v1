import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { saldo_inicial, egresos, ingresos, obs_egresos, obs_ingresos, tasa_bcv, saldo_segun_administradora, comparado, matcheado } = body;

    if (!id) {
      return NextResponse.json({ error: "Falta ID" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const updateData: Record<string, any> = {};
    if (saldo_inicial !== undefined) updateData.saldo_inicial = saldo_inicial;
    if (egresos !== undefined) updateData.egresos = egresos;
    if (ingresos !== undefined) updateData.ingresos = ingresos;
    if (obs_egresos !== undefined) updateData.obs_egresos = obs_egresos;
    if (obs_ingresos !== undefined) updateData.obs_ingresos = obs_ingresos;
    if (tasa_bcv !== undefined) updateData.tasa_bcv = tasa_bcv;
    if (saldo_segun_administradora !== undefined) updateData.saldo_segun_administradora = saldo_segun_administradora;
    if (comparado !== undefined) updateData.comparado = comparado === "true" || comparado === true;
    if (matcheado !== undefined) updateData.matcheado = matcheado;

    if (saldo_inicial !== undefined || egresos !== undefined || ingresos !== undefined) {
      const { data: current } = await supabase
        .from("movimientos_manual")
        .select("saldo_inicial, egresos, ingresos, tasa_bcv")
        .eq("id", id)
        .single();
      if (current) {
        const saldo = (saldo_inicial ?? current.saldo_inicial) - (egresos ?? current.egresos) + (ingresos ?? current.ingresos);
        updateData.saldo_final = saldo;
        if (tasa_bcv || current.tasa_bcv) {
          updateData.saldo_final_usd = saldo / (tasa_bcv || current.tasa_bcv || 1);
        }
      }
    }

    const { data, error } = await supabase
      .from("movimientos_manual")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, movimiento: data });
  } catch (error: any) {
    console.error("Update movimiento manual error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Falta ID" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase
      .from("movimientos_manual")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete movimiento manual error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}