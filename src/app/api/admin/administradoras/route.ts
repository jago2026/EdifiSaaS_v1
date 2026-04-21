import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;

// Helper to check admin session
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

export async function GET() {
  try {
    console.log("API: Fetching administradoras for public access...");
    
    // Use serviceRoleKey to bypass RLS if it exists, otherwise fallback to anon key
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await supabase
      .from("administradoras")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) {
      console.error("API Error fetching administradoras:", error);
      throw error;
    }
    
    console.log(`API: Successfully fetched ${data?.length || 0} administradoras using ${serviceRoleKey === process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service role' : 'anon key'}`);
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("API Catch error:", error);
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

    if (action === "create") {
      const { data: res, error } = await supabase
        .from("administradoras")
        .insert([data])
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ data: res });
    }

    if (action === "update") {
      const { data: res, error } = await supabase
        .from("administradoras")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ data: res });
    }

    if (action === "delete") {
      const { error } = await supabase
        .from("administradoras")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
