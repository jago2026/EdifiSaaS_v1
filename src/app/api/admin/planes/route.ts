import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";


async function isAdmin() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;
  // Based on your login logic: correojago@gmail.com is superuser-id
  return userId === "superuser-id";
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  
  const { data, error } = await supabase
    .from("plan_configs")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    // If table doesn't exist, return default plans to avoid crashing
    if (error.code === 'PGRST116' || error.message.includes('relation "plan_configs" does not exist')) {
        return NextResponse.json({ data: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const { planes } = body;

  
  
  // Basic implementation: Delete and insert all
  const { error: delError } = await supabase.from("plan_configs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (delError && !delError.message.includes('relation "plan_configs" does not exist')) {
    return NextResponse.json({ error: delError.message }, { status: 500 });
  }

  const { data, error } = await supabase.from("plan_configs").insert(planes);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}
