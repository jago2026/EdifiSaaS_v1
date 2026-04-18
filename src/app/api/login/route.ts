import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const { data: users, error: usersError } = await supabase
      .from("usuarios")
      .select("*")
      .eq("email", email)
      .eq("password_hash", passwordHash)
      .limit(1);

    if (usersError) {
      throw usersError;
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const user = users[0];

    const { data: buildings, error: buildingsError } = await supabase
      .from("edificios")
      .select("*")
      .eq("usuario_id", user.id)
      .limit(1);

    if (buildingsError) {
      throw buildingsError;
    }

    const cookieStore = await cookies();
    cookieStore.set("user_id", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
      },
      building: buildings && buildings.length > 0 ? buildings[0] : null,
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json({ error: error.message || "Error al iniciar sesión" }, { status: 500 });
  }
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}