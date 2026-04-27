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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const html = await response.text();
    
    // Extracción usando Regex idéntico al AppScript v2
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
    
    // Plan B: Si no hay match, buscar en el texto plano
    if (html.includes("No se encontraron registros") || html.includes("Cero deuda")) {
       return { exitoso: true, contrato: nic, recibos: 0, deuda: 0 };
    }

    return { exitoso: false, error: "No se pudieron extraer los datos del portal de Hidrocapital" };
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
        'User-Agent': 'Mozilla/5.0'
      },
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const html = await response.text();
    
    const getTxt = (id: string) => {
      let m = html.match(new RegExp(`id=${id}>([^<]+)`, 'i'));
      if (m) return m[1].replace(/&nbsp;/g, ' ').trim();
      m = html.match(new RegExp(`id="${id}">([^<]+)`, 'i'));
      if (m) return m[1].replace(/&nbsp;/g, ' ').trim();
      return null;
    };

    // IDs confirmados por la versión 2.0 del AppScript
    const totalPagarStr = getTxt('l0012051');
    const titular = getTxt('l0004018');
    const cuentaContrato = getTxt('l0003018') || getTxt('l0003002');

    if (totalPagarStr) {
      const deuda = parseFloat(totalPagarStr.replace(/\./g, '').replace(',', '.'));
      return {
        exitoso: true,
        titular,
        cuentaContrato,
        deuda,
      };
    }
    return { exitoso: false, error: "El portal de Corpoelec no devolvió un saldo válido" };
  } catch (error: any) {
    return { exitoso: false, error: error.message };
  }
}

async function enviarEmailCANTV(edificioNombre: string, numeroTelf: string) {
  // Esta función llamaría internamente a la API de email para disparar la solicitud a la administradora
  try {
    const host = process.env.NEXT_PUBLIC_BASE_URL || "https://edifi-saa-s-v1.vercel.app";
    await fetch(`${host}/api/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "custom_support", // Reutilizamos custom_support o creamos una nueva acción
        overrideRecipient: "adm_laideal@hotmail.com", // Por defecto segun AppScript
        subject: `Solicitud de Pago CANTV - ${edificioNombre}`,
        customBody: `
          <p>Buen día, representantes de Administradora La Ideal,</p>
          <p>En nombre de la Junta de Condominio de <strong>${edificioNombre}</strong>, solicitamos confirmación del pago del servicio CANTV:</p>
          <ul>
            <li>Línea: <strong>${numeroTelf}</strong></li>
          </ul>
          <p>Agradecemos nos confirmen fecha y monto cancelado para nuestros registros.</p>
          <p>Saludos cordiales.</p>
        `
      })
    });
    return true;
  } catch (e) {
    console.error("Error enviando email CANTV:", e);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const { configId, edificioId } = await request.json();
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: config, error: configError } = await supabase
      .from("servicios_publicos_config")
      .select("*, edificios(nombre)")
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
      const sent = await enviarEmailCANTV(config.edificios?.nombre || "Edificio", config.identificador);
      result = { exitoso: sent, recordatorio: true, deuda: 0, msg: "Solicitud enviada a la administradora" };
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
