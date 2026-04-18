import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === "test-payment") {
      // Simulate a payment by updating one unidad's debt
      const today = new Date().toISOString().split("T")[0];
      
      // Get first edificio
      const { data: edificio } = await supabase
        .from("edificios")
        .select("id")
        .limit(1)
        .single();

      if (!edificio) {
        return NextResponse.json({ error: "No hay edificio" }, { status: 400 });
      }

      // Get a recibo with debt
      const { data: recibo } = await supabase
        .from("recibos")
        .select("id, unidad, deuda")
        .eq("edificio_id", edificio.id)
        .gt("deuda", 10000)
        .limit(1)
        .single();

      if (!recibo) {
        return NextResponse.json({ error: "No hay recibos con deuda" }, { status: 400 });
      }

      // Reduce debt to simulate payment
      const montoPagado = Math.min(recibo.deuda, 10000);
      const nuevaDeuda = recibo.deuda - montoPagado;

      await supabase
        .from("recibos")
        .update({ 
          deuda: nuevaDeuda,
          deuda_usd: nuevaDeuda / 45.50,
          actualizado_en: today 
        })
        .eq("id", recibo.id);

      // Record payment
      await supabase.from("movimientos_dia").insert({
        edificio_id: edificio.id,
        tipo: "recibo",
        descripcion: `TEST PAGO ${recibo.unidad}`,
        monto: montoPagado,
        fecha: today,
        fuente: "test",
        detectado_en: today,
      });

      return NextResponse.json({ 
        success: true, 
        message: `Simulado pago de Bs. ${montoPagado} para ${recibo.unidad}. Nueva deuda: Bs. ${nuevaDeuda}`,
        unidad: recibo.unidad,
        montoPagado,
        nuevaDeuda 
      });
    }

    if (action === "reset-deuda") {
      // Reset all debts from previous backup (for testing)
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      
      const { data: edificio } = await supabase
        .from("edificios")
        .select("id")
        .limit(1)
        .single();

      if (!edificio) {
        return NextResponse.json({ error: "No hay edificio" }, { status: 400 });
      }

      // Reset debts to higher values (simulating previous day)
      await supabase
        .from("recibos")
        .update({ deuda: 90000 })
        .eq("edificio_id", edificio.id);

      return NextResponse.json({ success: true, message: "Deudas reseteadas para prueba" });
    }

    return NextResponse.json({ 
      info: "API de prueba",
     acciones: {
        "test-payment": "Simula un pago reduciendo deuda",
        "reset-deuda": "Resetea las deudas para nueva prueba"
      }
    });

  } catch (error: any) {
    console.error("Test error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}