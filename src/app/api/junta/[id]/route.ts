import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Falta ID" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Soft delete - set activo to false
    const { error } = await supabase
      .from("junta")
      .update({ activo: false })
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete miembro error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}