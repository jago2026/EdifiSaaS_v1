import { NextResponse } from 'next/server';

// SCRAPER HIDROCAPITAL
async function consultarHidrocapital(nic: string) {
  const URL_BASE = 'https://pagoenlinea.hidrocapital.gob.ve/multistep.php';
  console.log(`[SP][HIDROCAPITAL] Iniciando consulta para: ${nic}`);
  try {
    const formData = new URLSearchParams();
    formData.append('nombre', nic);
    const response = await fetch(URL_BASE, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(25000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const html = await response.text();
    
    // Regex más flexibles (comillas simples o dobles)
    const contratoMatch = html.match(/id=["']nic["'][^>]*value=['"]([^'"]+)['"]/i);
    const recibosMatch = html.match(/id=["']numerorecibos["'][^>]*value=['"]([^'"]+)['"]/i);
    const deudaMatch = html.match(/id=["']deudatotal["'][^>]*value=['"]([^'"]+)['"]/i);

    if (contratoMatch && recibosMatch && deudaMatch) {
      return {
        exitoso: true,
        deuda: parseFloat(deudaMatch[1].replace(/,/g, '')),
        recibos: parseInt(recibosMatch[1]),
        contrato: contratoMatch[1]
      };
    }
    
    // Fallback: buscar por nombre de input si el ID falló
    const deudaFallback = html.match(/name=["']deudatotal["'][^>]*value=['"]([^'"]+)['"]/i);
    if (deudaFallback && recibosMatch) {
        return {
          exitoso: true,
          deuda: parseFloat(deudaFallback[1].replace(/,/g, '')),
          recibos: parseInt(recibosMatch[1]),
          contrato: nic
        };
    }

    if (html.includes("No se encontraron registros") || html.includes("Cero deuda") || html.includes("No presenta deuda") || html.includes("Deuda: 0")) {
      return { exitoso: true, deuda: 0, recibos: 0, contrato: nic };
    }
    
    console.log("[SP][HIDROCAPITAL] HTML length:", html.length, "No se encontraron patrones conocidos.");
    return { exitoso: false, error: "No se pudieron extraer los datos. Formato del portal puede haber cambiado." };
  } catch (error: any) {
    console.error("Error Hidrocapital:", error);
    return { exitoso: false, error: error.name === 'TimeoutError' ? "Tiempo de espera agotado (Hidrocapital lento)" : error.message };
  }
}

// SCRAPER CORPOELEC
async function consultarCorpoelec(ncc: string) {
  const URL_CONSULTA = 'https://ov-capital.corpoelec.gob.ve/index.php/Login/consultaSaldo';
  console.log(`[SP][CORPOELEC] Iniciando consulta para: ${ncc}`);
  try {
    const formData = new URLSearchParams();
    formData.append('ncc', ncc);
    
    // Intentar con una configuración de fetch más robusta
    const response = await fetch(URL_CONSULTA, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Origin': 'https://ov-capital.corpoelec.gob.ve',
        'Referer': 'https://ov-capital.corpoelec.gob.ve/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(25000)
    });

    if (!response.ok) {
        if (response.status === 403) throw new Error("Acceso denegado por el portal (bloqueo de IP)");
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    const getTxt = (id: string) => {
      let m = html.match(new RegExp(`id=${id}>([^<]+)`, 'i'));
      if (m) return m[1].replace(/&nbsp;/g, ' ').trim();
      m = html.match(new RegExp(`id="${id}">([^<]+)`, 'i'));
      if (m) return m[1].replace(/&nbsp;/g, ' ').trim();
      m = html.match(new RegExp(`id='${id}'>([^<]+)`, 'i'));
      if (m) return m[1].replace(/&nbsp;/g, ' ').trim();
      return null;
    };
    
    const totalPagarStr = getTxt('l0012051');
    const titular = getTxt('l0004018');
    
    if (totalPagarStr) {
      const numericDeuda = parseFloat(totalPagarStr.replace(/\./g, '').replace(',', '.'));
      return {
        exitoso: true,
        deuda: isNaN(numericDeuda) ? 0 : numericDeuda,
        totalPagarStr,
        titular: titular || "Titular no disponible",
        cuentaContrato: ncc
      };
    }
    
    if (html.includes("No se encontraron registros") || html.includes("Saldo: 0")) {
        return { exitoso: true, deuda: 0, titular: "N/D", cuentaContrato: ncc };
    }

    return { exitoso: false, error: "El portal de Corpoelec no devolvió un saldo válido. Verifique el NCC." };
  } catch (error: any) {
    console.error("Error Corpoelec:", error);
    let errorMsg = error.message;
    if (error.name === 'TimeoutError') errorMsg = "El portal de Corpoelec no responde (Timeout)";
    if (errorMsg.includes("fetch failed")) errorMsg = "Error de conexión con Corpoelec (Portal caído o IP bloqueada)";
    return { exitoso: false, error: errorMsg };
  }
}

export async function POST(request: Request) {
  try {
    const { tipo, identificador } = await request.json();
    console.log(`[SP] Consultando ${tipo}: ${identificador}`);

    let result: any = { exitoso: false };

    if (tipo?.toLowerCase() === 'hidrocapital') {
      result = await consultarHidrocapital(identificador);
    } else if (tipo?.toLowerCase() === 'corpoelec') {
      result = await consultarCorpoelec(identificador);
    } else if (tipo?.toLowerCase() === 'cantv') {
      result = { 
        exitoso: true, 
        deuda: 0, 
        msg: "CANTV no dispone de portal de consulta en línea." 
      };
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[SP] Error general en /consultar:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
