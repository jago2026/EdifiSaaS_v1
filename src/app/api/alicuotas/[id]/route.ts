import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id: urlId } = await params;
    const body = await request.json();
    const { email1, email2, telefono1, telefono2, observaciones } = body;

    const id = urlId;
    if (!id) {
      return NextResponse.json({ error: "Falta ID" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const updateData: Record<string, any> = {};
    if (email1 !== undefined) updateData.email1 = email1 || null;
    if (email2 !== undefined) updateData.email2 = email2 || null;
    if (telefono1 !== undefined) updateData.telefono1 = telefono1 || null;
    if (telefono2 !== undefined) updateData.telefono2 = telefono2 || null;
    if (observaciones !== undefined) updateData.observaciones = observaciones || null;

    const { data, error } = await supabase
      .from("alicuotas")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Update alicuota error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, alicuota: data });
  } catch (error: any) {
    console.error("Update alicuota API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}