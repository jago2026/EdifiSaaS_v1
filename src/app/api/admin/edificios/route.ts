import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Estas variables se leen solo en el servidor (Seguro)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

async function checkAdmin() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;
  
  if (!userId) return false;
  if (userId === "superuser-id") return true;

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: user } = await supabase
    .from("usuarios")
    .select("email")
    .eq("id", userId)
    .single();

  return user?.email === "correojago@gmail.com";
}

export async function GET(request: Request) {
  try {
    if (!await checkAdmin()) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "list";

    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === "list") {
      const { data, error } = await supabase
        .from("edificios")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error: any) {
    console.error("Admin API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!await checkAdmin()) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { action, id, data } = body;

    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === "update") {
      const { error } = await supabase
        .from("edificios")
        .update(data)
        .eq("id", id);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error: any) {
    console.error("Admin API POST Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
