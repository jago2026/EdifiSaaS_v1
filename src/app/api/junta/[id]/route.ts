import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";


type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;
    if (userId === "00000000-0000-0000-0000-000000000000") {
      return NextResponse.json({ error: "Operación no permitida en cuenta demo" }, { status: 403 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Falta ID" }, { status: 400 });
    }

    
    
    // Check if it's the superuser
    const { data: member } = await supabase
      .from("junta")
      .select("email")
      .eq("id", id)
      .single();
      
    if (member?.email === "correojago@gmail.com") {
      return NextResponse.json({ error: "Este usuario no puede ser eliminado por seguridad del sistema" }, { status: 403 });
    }

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