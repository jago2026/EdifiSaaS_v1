import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";


export async function GET() {
  const { data, error } = await supabase
    .from('edificios')
    .select('id, nombre')
    .limit(5);
  
  console.log("DEBUG: Result:", data, error);
  
  return NextResponse.json({ 
    success: true, 
    edificiosCount: data?.length || 0,
    data: data,
    error: error?.message
  });
}