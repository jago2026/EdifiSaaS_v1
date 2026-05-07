import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Token y contraseña requeridos" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const now = new Date().toISOString();

    // 1. Buscar token en usuarios
    const { data: user, error: userError } = await supabase
      .from("usuarios")
      .select("id")
      .eq("reset_token", token)
      .gt("reset_token_expires", now)
      .single();

    let targetTable = "usuarios";
    let targetId = user?.id;

    // 2. Buscar en junta if not found
    if (!user) {
      const { data: member, error: memberError } = await supabase
        .from("junta")
        .select("id")
        .eq("reset_token", token)
        .gt("reset_token_expires", now)
        .single();
      
      if (member) {
        targetTable = "junta";
        targetId = member.id;
      }
    }

    if (!targetId) {
      return NextResponse.json({ error: "Token inválido o expirado" }, { status: 400 });
    }

    // 3. Hashear nueva contraseña
    const passwordHash = await hashPassword(password);

    // 4. Actualizar contraseña y limpiar token
    const { error: updateError } = await supabase
      .from(targetTable)
      .update({
        password_hash: passwordHash,
        reset_token: null,
        reset_token_expires: null
      })
      .eq("id", targetId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, message: "Contraseña actualizada" });
  } catch (error: any) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Error al restablecer la contraseña" }, { status: 500 });
  }
}
