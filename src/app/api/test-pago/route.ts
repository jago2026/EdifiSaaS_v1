import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const edificioId = searchParams.get("edificioId");
    const unidad = searchParams.get("unidad");
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === "test-payment") {
      const today = new Date().toISOString().split("T")[0];
      
      let targetEdificioId = edificioId;
      if (!targetEdificioId) {
        const { data: ed } = await supabase.from("edificios").select("id").limit(1).single();
        targetEdificioId = ed?.id;
      }

      if (!targetEdificioId) return NextResponse.json({ error: "No hay edificio" }, { status: 400 });

      let query = supabase.from("recibos").select("id, unidad, deuda, propietario").eq("edificio_id", targetEdificioId).gt("deuda", 0);
      if (unidad) query = query.eq("unidad", unidad);
      
      const { data: recibo } = await query.limit(1).single();

      if (!recibo) return NextResponse.json({ error: "No hay recibos con deuda para los criterios" }, { status: 400 });

      const isTotal = searchParams.get("type") === "total";
      const montoPagado = isTotal ? recibo.deuda : (parseFloat(searchParams.get("amount") || "0") || Math.min(recibo.deuda, 5000));
      const nuevaDeuda = Math.max(0, recibo.deuda - montoPagado);

      await supabase.from("recibos").update({ 
        deuda: nuevaDeuda,
        deuda_usd: nuevaDeuda / 45.50,
        actualizado_en: today 
      }).eq("id", recibo.id);

      await supabase.from("movimientos_dia").insert({
        edificio_id: targetEdificioId,
        tipo: "recibo",
        descripcion: `PAGO ${isTotal ? 'TOTAL' : 'PARCIAL'} ${recibo.unidad} - ${recibo.propietario}`,
        monto: montoPagado,
        fecha: today,
        unidad_apartamento: recibo.unidad,
        propietario: recibo.propietario,
        fuente: "test",
        detectado_en: today,
      });

      // Also record in pagos_recibos for KPIs
      await supabase.from("pagos_recibos").insert({
        edificio_id: targetEdificioId,
        unidad: recibo.unidad,
        propietario: recibo.propietario,
        mes: today.substring(0, 7),
        monto: montoPagado,
        fecha_pago: today,
        source: "test"
      });

      return NextResponse.json({ success: true, message: `Pago ${isTotal ? 'TOTAL' : 'PARCIAL'} registrado para ${recibo.unidad}`, montoPagado, nuevaDeuda });
    }

    if (action === "bulk-test-payment") {
      const count = parseInt(searchParams.get("count") || "5");
      const today = new Date().toISOString().split("T")[0];
      
      let targetEdificioId = edificioId;
      if (!targetEdificioId) {
        const { data: ed } = await supabase.from("edificios").select("id").limit(1).single();
        targetEdificioId = ed?.id;
      }
      if (!targetEdificioId) return NextResponse.json({ error: "No hay edificio" }, { status: 400 });

      const { data: recibos } = await supabase.from("recibos")
        .select("id, unidad, deuda, propietario")
        .eq("edificio_id", targetEdificioId)
        .gt("deuda", 0)
        .limit(count);

      if (!recibos || recibos.length === 0) return NextResponse.json({ error: "No hay recibos con deuda" }, { status: 400 });

      const results = [];
      for (const recibo of recibos) {
        const montoPagado = Math.min(recibo.deuda, Math.floor(Math.random() * 5000) + 1000);
        const nuevaDeuda = Math.max(0, recibo.deuda - montoPagado);

        await supabase.from("recibos").update({ 
          deuda: nuevaDeuda,
          deuda_usd: nuevaDeuda / 45.50,
          actualizado_en: today 
        }).eq("id", recibo.id);

        await supabase.from("movimientos_dia").insert({
          edificio_id: targetEdificioId,
          tipo: "recibo",
          descripcion: `PAGO MASIVO PRUEBA ${recibo.unidad} - ${recibo.propietario}`,
          monto: montoPagado,
          fecha: today,
          unidad_apartamento: recibo.unidad,
          propietario: recibo.propietario,
          fuente: "test_bulk",
          detectado_en: today,
        });

        await supabase.from("pagos_recibos").insert({
          edificio_id: targetEdificioId,
          unidad: recibo.unidad,
          propietario: recibo.propietario,
          mes: today.substring(0, 7),
          monto: montoPagado,
          fecha_pago: today,
          source: "test_bulk"
        });
        
        results.push({ unidad: recibo.unidad, montoPagado });
      }

      return NextResponse.json({ success: true, message: `Pagos masivos procesados: ${results.length}`, results });
    }

    if (action === "reset-deuda") {
      let targetEdificioId = edificioId;
      if (!targetEdificioId) {
        const { data: ed } = await supabase.from("edificios").select("id").limit(1).single();
        targetEdificioId = ed?.id;
      }
      if (!targetEdificioId) return NextResponse.json({ error: "No hay edificio" }, { status: 400 });

      await supabase.from("recibos").update({ deuda: 25000, deuda_usd: 25000/45.5 }).eq("edificio_id", targetEdificioId);
      return NextResponse.json({ success: true, message: "Deudas reseteadas a Bs. 25.000 para pruebas" });
    }

    return NextResponse.json({ 
      info: "API de prueba de pagos",
      endpoint: "/api/test-pago",
      params: {
        action: "test-payment | reset-deuda",
        edificioId: "UUID opcional",
        unidad: "Opcional",
        type: "total | partial",
        amount: "Monto para partial"
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
