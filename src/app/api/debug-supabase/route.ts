import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export async function GET() {
  console.log("DEBUG: Checking supabase connection...", supabaseUrl?.substring(0, 20));
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data, error } = await supabase
    .from('edificios')
    .select('id, nombre')
    .limit(5);
  
  console.log("DEBUG: Result:", data, error);
  
  return NextResponse.json({ 
    success: true, 
    edificiosCount: data?.length || 0,
    data: data,
    error: error?.message,
    supabaseUrl: supabaseUrl?.substring(0, 10) + "..."
  });
}