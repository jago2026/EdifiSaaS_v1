import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder"; // Use service role for backend updates

// HIDROCAPITAL SCRAPER
async function consultarHidrocapital(nic: string) {
  const URL_BASE = 'https://pagoenlinea.hidrocapital.gob.ve/multistep.php';
  try {
    const formData = new URLSearchParams();
    formData.append('nombre', nic);

    const response = await fetch(URL_BASE, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const html = await response.text();
    
    // Extracción usando Regex similar al AppScript
    const contratoMatch = html.match(/id="nic"[^>]*value='([^']+)'/);
    const recibosMatch = html.match(/id="numerorecibos"[^>]*value='([^']+)'/);
    const deudaMatch = html.match(/id="deudatotal"[^>]*value='([^']+)'/);

    if (contratoMatch && recibosMatch && deudaMatch) {
      return {
        exitoso: true,
        contrato: contratoMatch[1],
        recibos: parseInt(recibosMatch[1]),
        deuda: parseFloat(deudaMatch[1].replace(/,/g, '')),
      };
    }
    return { exitoso: false, error: "No se pudieron extraer los datos del HTML" };
  } catch (error: any) {
    return { exitoso: false, error: error.message };
  }
}

// CORPOELEC SCRAPER
async function consultarCorpoelec(nic: string) {
  const URL_CONSULTA = 'https://ov-capital.corpoelec.gob.ve/index.php/Login/consultaSaldo';
  try {
    const formData = new URLSearchParams();
    formData.append('ncc', nic);
    formData.append('id', '');

    const response = await fetch(URL_CONSULTA, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const html = await response.text();
    
    // Extracción de datos basada en los IDs confirmados en el AppScript
    const getTxt = (id: string) => {
      let m = html.match(new RegExp(`id=${id}>([^<]+)`, 'i'));
      if (m) return m[1].replace(/&nbsp;/g, ' ').trim();
      m = html.match(new RegExp(`id="${id}">([^<]+)`, 'i'));
      if (m) return m[1].replace(/&nbsp;/g, ' ').trim();
      return null;
    };

    const totalPagarStr = getTxt('l0012051');
    const titular = getTxt('l0004018');
    const cuentaContrato = getTxt('l0003018');

    if (totalPagarStr) {
      // Formato venezolano: 1.234,56 -> 1234.56
      const deuda = parseFloat(totalPagarStr.replace(/\./g, '').replace(',', '.'));
      return {
        exitoso: true,
        titular,
        cuentaContrato,
        deuda,
      };
    }
    return { exitoso: false, error: "No se pudo parsear el saldo" };
  } catch (error: any) {
    return { exitoso: false, error: error.message };
  }
}

export async function POST(request: Request) {
  try {
    const { configId, edificioId } = await request.json();
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get config
    const { data: config, error: configError } = await supabase
      .from("servicios_publicos_config")
      .select("*")
      .eq("id", configId)
      .single();

    if (configError || !config) {
      return NextResponse.json({ error: "Configuración no encontrada" }, { status: 404 });
    }

    let result: any = { exitoso: false };

    if (config.tipo === 'hidrocapital') {
      result = await consultarHidrocapital(config.identificador);
    } else if (config.tipo === 'corpoelec') {
      result = await consultarCorpoelec(config.identificador);
    } else if (config.tipo === 'cantv') {
      // CANTV en el AppScript era una solicitud de confirmación por email, no un scraper
      // Por ahora lo marcamos como recordatorio enviado
      result = { exitoso: true, recordatorio: true, deuda: 0 };
    }

    // Save result to history
    const { error: insertError } = await supabase
      .from("servicios_publicos_consultas")
      .insert({
        config_id: config.id,
        edificio_id: config.edificio_id,
        monto: result.deuda || 0,
        recibos_pendientes: result.recibos || 0,
        estado: result.exitoso ? 'exitoso' : 'error',
        detalles: result,
        error_msg: result.error || null
      });

    if (result.exitoso) {
      await supabase
        .from("servicios_publicos_config")
        .update({
          ultimo_monto: result.deuda || 0,
          ultima_consulta: new Date().toISOString()
        })
        .eq("id", config.id);
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Consultar SP error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
