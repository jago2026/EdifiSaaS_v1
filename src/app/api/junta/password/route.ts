import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";


export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { email, newPassword } = body;

    if (!email || !newPassword) {
      return NextResponse.json({ error: "Email y clave requeridos" }, { status: 400 });
    }

    
    const passwordHash = await hashPassword(newPassword);

    const { error } = await supabase
      .from("junta")
      .update({ 
        password_hash: passwordHash,
        requiere_cambio_clave: false 
      })
      .eq("email", email);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Clave actualizada" });
  } catch (error: any) {
    console.error("Update password error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
