import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const edificioId = searchParams.get("edificioId");

    if (!edificioId) {
      return NextResponse.json({ error: "Falta edificioId" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get building info to know expected number of units
    const { data: building } = await supabase
      .from("edificios")
      .select("unidades")
      .eq("id", edificioId)
      .single();

    const { data: alicuotas, error } = await supabase
      .from("alicuotas")
      .select("id, unidad, propietario, alicuota, email1, email2, telefono1, telefono2, observaciones")
      .eq("edificio_id", edificioId)
      .order("unidad");

    if (error) {
      console.error("Alicuotas query error:", error);
      return NextResponse.json({ alicuotas: [], count: 0, error: error.message }, { status: 500 });
    }

    // Calculate sum of alicuotas for validation
    const alicuotaSum = (alicuotas || []).reduce((sum, a) => sum + (parseFloat(a.alicuota) || 0), 0);
    const count = alicuotas?.length || 0;
    
    // Check validation (should be between 99.5% and 100%)
    let validationWarning = null;
    if (count > 0) {
      if (alicuotaSum < 99.5 || alicuotaSum > 100) {
        const expectedUnits = building?.unidades || count;
        validationWarning = {
          message: `La suma de alícuotas (${alicuotaSum.toFixed(2)}%) no está en el rango esperado (99.5%-100%). Verifica que la cantidad de inmuebles (${expectedUnits}) sea correcta.`,
          sum: alicuotaSum,
          expected: expectedUnits,
          actual: count
        };
      }
    }

    return NextResponse.json({ 
      alicuotas: alicuotas || [], 
      count, 
      alicuotaSum,
      validationWarning
    });
  } catch (error: any) {
    console.error("Alicuotas API error:", error);
    return NextResponse.json({ alicuotas: [], count: 0, error: error.message }, { status: 500 });
  }
}