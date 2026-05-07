import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { formatNumber } from "@/lib/formatters";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function parseMonto(text: string): number {
  if (!text) return 0;
  // Limpiar caracteres no numéricos excepto los separadores
  let cleaned = text.replace(/[^\d.,-]/g, "");
  if (!cleaned) return 0;

  // Caso 1: Tiene puntos y comas (Formato VE: 1.234,56)
  if (cleaned.includes(".") && cleaned.includes(",")) {
    return parseFloat(cleaned.replace(/\./g, "").replace(",", ".")) || 0;
  }

  // Caso 2: Tiene solo comas (Formato VE simple: 1234,56)
  if (cleaned.includes(",")) {
    return parseFloat(cleaned.replace(",", ".")) || 0;
  }

  // Caso 3: Tiene solo puntos
  if (cleaned.includes(".")) {
    const parts = cleaned.split(".");
    const lastPart = parts[parts.length - 1];
    // Si la última parte tiene 2 dígitos, es muy probable que sea decimal (Formato US: 1234.56)
    // O si tiene 3 dígitos y no hay más puntos (Formato US: 1.234 - improbable para moneda pero posible)
    if (lastPart.length === 2 || (lastPart.length === 3 && parts.length === 1)) {
      return parseFloat(cleaned) || 0;
    }
    // Si tiene 3 dígitos y es un separador de miles (Formato VE: 1.234)
    if (lastPart.length === 3) {
      return parseFloat(cleaned.replace(/\./g, "")) || 0;
    }
  }

  return parseFloat(cleaned) || 0;
}

async function generateHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function normalizeFecha(fecha: string): string {
  if (!fecha) return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  // Si ya es ISO (YYYY-MM-DD), devolverla tal cual
  if (fecha.match(/^\d{4}-\d{2}-\d{2}$/)) return fecha;
  
  const match = fecha.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Caracas',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

// Extraer código de unidad de forma más robusta (ej: "08-C - NOMBRE" -> "08-C", "APTO 08-C" -> "08-C")
function extractUnitCode(raw: string): string {
  if (!raw) return "";
  let text = raw.toUpperCase().trim();
  
  // 1. Quitar prefijos comunes si existen (APTO, APARTAMENTO, CASA, UNIDAD, UNIT, etc.)
  const prefixes = ["APTO", "APARTAMENTO", "CASA", "UNIDAD", "UNIT", "LOCAL"];
  for (const p of prefixes) {
    if (text.startsWith(p + " ")) {
      text = text.replace(p + " ", "").trim();
      break;
    }
  }

  // 2. Si tiene guion con espacios " - ", tomar la primera parte (estándar RascaCielo)
  if (text.includes(" - ")) {
    return text.split(" - ")[0].trim();
  }

  // 3. Si no tiene " - " pero tiene espacios, y la primera parte parece un código (ej: "08-C NOMBRE")
  // Un código suele tener números o guiones y ser corto.
  const parts = text.split(" ");
  if (parts.length > 1) {
    const firstPart = parts[0];
    // Si la primera parte contiene números o es muy corta, es probable que sea el código
    if (/\d/.test(firstPart) || firstPart.length <= 5) {
      return firstPart;
    }
  }

  return text;
}

// Función auxiliar para deduplicar arrays de objetos basados en propiedades clave
function deduplicateItems(items: any[], keys: string[]): any[] {
  const seen = new Set();
  return items.filter(item => {
    const val = keys.map(k => {
      const v = item[k];
      return typeof v === 'number' ? v.toFixed(2) : String(v || '').trim().toUpperCase();
    }).join('|');
    if (seen.has(val)) return false;
    seen.add(val);
    return true;
  });
}

function normalizeMes(mesStr: string): string {
  const match = mesStr?.match(/^(\d{2})-(\d{4})$/);
  if (match) return `${match[2]}-${match[1]}`;
  const caracasNow = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Caracas',
    year: 'numeric',
    month: '2-digit'
  }).format(new Date());
  return caracasNow;
}

function cleanHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&Aacute;/g, "Á")
    .replace(/&Eacute;/g, "É")
    .replace(/&Iacute;/g, "Í")
    .replace(/&Oacute;/g, "Ó")
    .replace(/&Uacute;/g, "Ú")
    .replace(/&aacute;/g, "á")
    .replace(/&eacute;/g, "é")
    .replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó")
    .replace(/&uacute;/g, "ú")
    .replace(/&ntilde;/g, "ñ")
    .replace(/&Ntilde;/g, "Ñ")
    .replace(/&nbsp;/g, " ")
    .replace(/&TIMES;/gi, "")
    .replace(/&#8209;/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

async function loginToRascaCielo(urlLogin: string, password: string): Promise<{ cookie: string, sid: string } | null> {
  try {
    const baseUrl = new URL(urlLogin).origin;
    const formData = new URLSearchParams();
    formData.append("contrasena", password);
    formData.append("contrasena11", password);
    formData.append("B1", "Entrar");
    const res = await fetch(`${baseUrl}/control.php`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT, "Referer": `${baseUrl}/indice.htm` },
      body: formData.toString(),
      redirect: "manual",
    });
    const setCookies = res.headers.get("set-cookie") || "";
    const sidMatch = setCookies.match(/PHPSESSID=([^;]+)/);
    if (!sidMatch) return null;
    const sid = sidMatch[1];
    const cookieHeader = `PHPSESSID=${sid}`;
    await fetch(`${baseUrl}/indice.htm`, { headers: { "Cookie": cookieHeader, "User-Agent": USER_AGENT } });
    return { cookie: cookieHeader, sid };
  } catch (error) { return null; }
}

async function fetchPageWithCookie(url: string, session: { cookie: string, sid: string }): Promise<string | null> {
  try {
    const separator = url.includes('?') ? '&' : '?';
    const res = await fetch(`${url}${separator}PHPSESSID=${session.sid}`, {
      method: "GET",
      headers: { "Cookie": session.cookie, "User-Agent": USER_AGENT, "Referer": "https://admlaideal.com.ve/condlin.php" },
    });
    return await res.text();
  } catch (error) { return null; }
}

function parseReciboDetalle(html: string): any[] {
  if (!html) return [];
  const results: any[] = [];

  // Buscar todas las filas de tabla en el documento de forma global
  const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];

  console.log(`[parseReciboDetalle] Analizando ${rows.length} filas...`);

  for (const rowContent of rows) {
    // Buscar celdas <td> (no th para saltar encabezados)
    const cells = rowContent.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
    if (!cells || cells.length < 2) continue;

    const cellTexts = cells.map(c => cleanHtml(c).trim());

    // Saltar filas de encabezado / totales de navegación
    const rowText = cellTexts.join(' ').toUpperCase();
    if (rowText.includes('CÓDIGO') || rowText.includes('CONCEPTO') || rowText.includes('DESCRIPCI')) continue;

    // ── Detectar código en la primera celda ──────────────────────────
    // El código del recibo de RascaCielo es siempre numérico (ej. 00007, 00101, 99997)
    let code = cellTexts[0];
    const isCodeCell = /^\d{3,6}$/.test(code.replace(/[^0-9]/g, '')) && code.length <= 8;

    let desc = '';
    let montoRaw = '';
    let cuotaRaw = '';

    if (isCodeCell) {
      // Formato estándar: [codigo, descripcion, monto, cuota_parte]
      desc      = cellTexts[1] || '';
      montoRaw  = cellTexts[2] || '';
      cuotaRaw  = cellTexts[3] || '';
    } else {
      // Sin código: [descripcion, monto, cuota_parte] o similar
      code = '';
      desc      = cellTexts[0];
      montoRaw  = cellTexts[1] || '';
      cuotaRaw  = cellTexts[2] || '';
    }

    desc = desc.replace(/\s+/g, ' ').trim();
    if (!desc || desc.length < 2) continue;

    const upperDesc = desc.toUpperCase();

    // Saltar encabezados de columna
    if (upperDesc === 'MONTO' || upperDesc === 'CUOTA PARTE' || upperDesc === 'DESCRIPCIÓN' || upperDesc === 'DESCRIPCION') continue;

    // Calcular valores numéricos
    // Si cuotaRaw está vacío, intentar buscar el último valor numérico en las celdas restantes
    let foundMonto = parseMonto(montoRaw);
    let foundCuota = parseMonto(cuotaRaw);

    // Para filas que tienen montos negativos (ej. -0,65 o -12.885,61) parseMonto ya los maneja
    // pero el string del HTML puede tener el signo antes del número: limpiar si corresponde
    if (montoRaw.trim().startsWith('-') && foundMonto > 0) foundMonto = -foundMonto;
    if (cuotaRaw.trim().startsWith('-') && foundCuota > 0) foundCuota = -foundCuota;

    // Si no obtuvimos ningún monto, intentar escanear desde el final de la fila
    if (foundMonto === 0 && foundCuota === 0) {
      let montoCount = 0;
      for (let i = cellTexts.length - 1; i >= 0; i--) {
        const v = parseMonto(cellTexts[i]);
        if (v !== 0) {
          if (montoCount === 0) { foundCuota = v; montoCount++; }
          else if (montoCount === 1) { foundMonto = v; break; }
        }
      }
      if (montoCount === 1) { foundMonto = foundCuota; foundCuota = 0; }
    }

    // Clasificar tipo de ítem
    let itemType = 'gasto';
    if (upperDesc.includes('FONDO DE RESERVA') || upperDesc.includes('FONDO PRESTACIONES') ||
        upperDesc.includes('FONDO TRABAJOS') || upperDesc.includes('FONDO INTERESES') ||
        upperDesc.includes('FONDO DIFERENCIAL')) {
      itemType = 'fondo';
    } else if (upperDesc.includes('TOTAL GASTOS COMUNES') || upperDesc.includes('TOTAL FONDOS') ||
               upperDesc.includes('TOTAL FONDOS Y GASTOS') || upperDesc.includes('TOTAL RECIBO') ||
               upperDesc.includes('GASTOS COMUNES SEGÚN') || upperDesc.includes('GASTOS COMUNES SEGUN')) {
      itemType = 'subtotal';
    }

    // Solo guardar si tiene monto o cuota (incluyendo negativos)
    if (foundMonto !== 0 || foundCuota !== 0) {
      results.push({
        codigo: code,
        descripcion: desc,
        monto: foundMonto,
        cuota_parte: foundCuota,
        tipo: itemType
      });
    }
  }

  // Deduplicación estricta: solo eliminar filas EXACTAMENTE iguales (mismo codigo+desc+monto+cuota)
  // Permite que el mismo código aparezca con diferente descripción/monto (ej. 00007, 00101, 00500, 00706)
  const finalResults = results.filter((item, index, self) =>
    index === self.findIndex((t) => (
      t.codigo === item.codigo &&
      t.descripcion === item.descripcion &&
      Math.abs(t.monto - item.monto) < 0.01 &&
      Math.abs(t.cuota_parte - item.cuota_parte) < 0.01
    ))
  );

  console.log(`[parseReciboDetalle] Finalizado. Encontrados ${finalResults.length} ítems válidos.`);
  return finalResults;
}

function parseReceiptMonthlySummary(html: string): number {
  if (!html) return 0;
  const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    const rowText = cleanHtml(row).toUpperCase();
    if (rowText.includes("TOTAL RECIBO")) {
      const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
      if (cells && cells.length > 0) {
        for (let j = cells.length - 1; j >= 0; j--) {
          const val = parseMonto(cleanHtml(cells[j]));
          if (val > 0) return val;
        }
      }
    }
  }
  return 0;
}

function parseRecibosTableAll(html: string): { data: any[], isComplete: boolean } {
  const results: any[] = [];
  const upperHtml = html?.toUpperCase() || "";
  // Ampliamos el criterio de completitud para ser más flexibles con distintos formatos de tabla
  const isComplete = upperHtml.includes("TOTALES") || 
                     upperHtml.includes("TOTAL:") || 
                     upperHtml.includes("TOTAL GENERAL") || 
                     upperHtml.includes("TOTAL DEUDORES") ||
                     upperHtml.includes("SUMA TOTAL");
  
  const tableMatch = html.match(/<table[^>]*class="[^"]*table-bordered[^"]*"[^>]*>([\s\S]*?)<\/table>/i) || 
                     html.match(/<table[^>]*class="table-bordered"[^>]*>([\s\S]*?)<\/table>/i) ||
                     html.match(/<table[^>]*>([\s\S]*?PROPIETARIO[\s\S]*?DEUDA[\s\S]*?)<\/table>/i);
  if (!tableMatch) return { data: results, isComplete: false };
  
  const rows = tableMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
  for (const row of rows) {
    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
    if (!cells || cells.length < 4) continue;
    const unidad = cleanHtml(cells[0]);
    const propietario = cleanHtml(cells[1]);
    const numRecibosCell = cleanHtml(cells[2]);
    const deudaCell = cleanHtml(cells[3]);
    
    const propUpper = propietario.toUpperCase();
    if (propUpper.includes("TOTALES") || propUpper.includes("TOTAL GENERAL") || propUpper.includes("TOTAL:")) continue;
    if (!unidad || unidad.length > 25) continue; // Unidades pueden ser un poco largas a veces

    const matchUSD = deudaCell.match(/\(([^\)]+)\)/);
    const mUSD = matchUSD ? Math.abs(parseMonto(matchUSD[1])) : 0;
    const bsMatch = deudaCell.match(/\)\s*[&nbsp;]*\s*([\d.,]+)$/) || [null, deudaCell.split(" ").pop()];
    const mBS = parseMonto(bsMatch[1] || "");

    if (mUSD === 0 && mBS === 0) continue;

    const nRec = parseInt(numRecibosCell) || 0;
    results.push({ unidad, propietario, num_recibos: nRec, deuda_usd: mUSD, deuda: mBS });
  }
  return { data: results, isComplete };
}

function parseEgresosTableAll(html: string): any[] {
  const results: any[] = [];
  const tableMatch = html.match(/<table[^>]*class="[^"]*table-bordered[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return results;
  const rows = tableMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
  for (const row of rows) {
    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
    if (!cells || cells.length < 4) continue;
    const texts = cells.map(c => cleanHtml(c));
    if (texts[0].includes("(G)") || texts[1].includes("TOTAL EGRESOS") || texts[1].includes("TOTAL GENERAL")) continue;
    if (!texts[0].match(/\d{2}-\d{2}-\d{4}/)) continue;
    const m = parseMonto(texts[3]);
    results.push({ fecha: texts[0], beneficiario: texts[1], operacion: texts[2], monto: m });
  }
  return results;
}

function parseIngresosTable(html: string): any[] {
  if (!html) return [];
  const results: any[] = [];
  
  // Intentar encontrar la tabla por clase primero, luego por contenido
  let tableContent = "";
  const tableMatch = html.match(/<table[^>]*class="[^"]*table-bordered[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  
  if (tableMatch) {
    tableContent = tableMatch[1];
  } else {
    // Fallback: Buscar tabla que contenga "TOTAL COBRADO" o encabezados típicos
    const allTables = html.match(/<table[^>]*>([\s\S]*?)<\/table>/gi) || [];
    for (const t of allTables) {
      const upperT = t.toUpperCase();
      if (upperT.includes("TOTAL COBRADO") || (upperT.includes("FECHA") && upperT.includes("MONTO"))) {
        tableContent = t;
        break;
      }
    }
  }

  if (!tableContent) {
    console.log("[parseIngresosTable] No se encontró la tabla de ingresos en el HTML.");
    return [];
  }

  const rows = tableContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
  for (const row of rows) {
    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
    if (!cells || cells.length < 4) continue;
    const texts = cells.map(c => cleanHtml(c));
    
    // Saltamos encabezados y totales
    if (texts[1].includes("TOTAL COBRADO") || texts[1].includes("TOTAL GENERAL") || texts[1].toUpperCase().includes("PROPIETARIO") || texts[1].toUpperCase().includes("BENEFICIARIO")) continue;
    
    // Validar que la primera celda sea una fecha
    if (!texts[0].match(/\d{2}-\d{2}-\d{4}/)) continue;

    const m = parseMonto(texts[3]);
    if (m > 0) {
      results.push({ 
        fecha: texts[0], 
        beneficiario: texts[1], 
        descripcion: texts[2], 
        monto: m 
      });
    }
  }
  return results;
}

function parseGastosTable(html: string): any[] {
  if (!html) return [];
  const results: any[] = [];
  
  // Intentar extraer el mes del encabezado (ej: 04-2026 o 04/2026 o "MES: ABRIL 2026")
  // Soporte para nombres de meses en español
  const mesesEspanol = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
  let fallbackDate = null;

  // 1. Buscar formato numérico MM-YYYY o MM/YYYY
  const monthMatch = html.match(/(\d{2})[\s\-‑\/](\d{4})/);
  if (monthMatch) {
     const mm = monthMatch[1];
     const yyyy = monthMatch[2];
     const lastDay = new Date(parseInt(yyyy), parseInt(mm), 0).getDate();
     fallbackDate = `${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`;
  } else {
     // 2. Buscar nombres de meses
     const upperHtml = html.toUpperCase();
     for (let i = 0; i < mesesEspanol.length; i++) {
       if (upperHtml.includes(mesesEspanol[i])) {
          // Intentar encontrar el año cerca del mes
          const yearMatch = upperHtml.match(new RegExp(mesesEspanol[i] + "[\\s]*(\\d{4})"));
          if (yearMatch) {
            const mm = String(i + 1).padStart(2, '0');
            const yyyy = yearMatch[1];
            const lastDay = new Date(parseInt(yyyy), parseInt(mm), 0).getDate();
            fallbackDate = `${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`;
            break;
          }
       }
     }
  }

  if (fallbackDate) {
    console.log(`[parseGastosTable] Mes detectado en HTML. Usando fallback: ${fallbackDate}`);
    
    // CORRECCIÓN: Si el mes detectado es el mes actual, NO usar el día 31 si estamos antes de esa fecha.
    // Usar el día actual para que no aparezca en el futuro en el flujo de caja.
    const now = new Date();
    const currentYYYYMM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (fallbackDate.startsWith(currentYYYYMM)) {
      const currentDay = String(now.getDate()).padStart(2, '0');
      fallbackDate = `${currentYYYYMM}-${currentDay}`;
      console.log(`[parseGastosTable] Ajustando fallback al día de hoy para el mes en curso: ${fallbackDate}`);
    }
  }

  const allTables = html.match(/<table[^>]*>([\s\S]*?)<\/table>/gi) || [];
  console.log(`[parseGastosTable] Aggressive scan of ${allTables.length} tables.`);
  
  for (const tableContent of allTables) {
    const upperT = tableContent.toUpperCase();
    if (upperT.includes("CONCEPTO") || upperT.includes("TOTAL") || upperT.includes("GASTO") || upperT.includes("DETALLE")) {
      const rows = tableContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
      for (const row of rows) {
        const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
        if (!cells || cells.length < 2) continue;
        
        const code = cleanHtml(cells[0]).trim();
        const desc = cleanHtml(cells[1]).trim();
        let montoRaw = "";
        let fecha = null;

        // Intentar detectar si la tabla tiene 4 columnas (Fecha, Codigo, Concepto, Monto)
        if (cells.length >= 4) {
          const possibleDate = cleanHtml(cells[0]);
          if (possibleDate.match(/\d{2}-\d{2}-\d{4}/)) {
            fecha = possibleDate;
            const code4 = cleanHtml(cells[1]).trim();
            const desc4 = cleanHtml(cells[2]).trim();
            montoRaw = cleanHtml(cells[3]);
            
            if (code4 && desc4 && !results.find(r => r.codigo === code4 && r.monto === parseMonto(montoRaw))) {
               results.push({
                 fecha: fecha,
                 codigo: code4,
                 descripcion: desc4,
                 monto: parseMonto(montoRaw)
               });
               continue;
            }
          }
        }
        
        // Formato estándar 3 columnas (Codigo, Concepto, Monto)
        montoRaw = cells.length >= 3 ? cleanHtml(cells[2]) : "";
        
        if (!code || code === "&nbsp;" || code.length > 15) continue;
        if (code.toUpperCase().includes("COD") || code.toUpperCase().includes("CONCEPTO") || code.toUpperCase().includes("FECHA")) continue;
        
        // CORRECCIÓN: No saltar "FONDO" a menos que sea un total de fondos.
        // El usuario necesita ver el "FONDO DE RESERVA" en el detalle.
        const upperDesc = desc.toUpperCase();
        if (upperDesc.includes("TOTAL GASTOS COMUNES") || upperDesc.includes("TOTAL FONDOS")) continue;
        
        if (code && desc && desc.length > 3 && !results.find(r => r.codigo === code && r.monto === parseMonto(montoRaw))) {
          results.push({
            codigo: code,
            descripcion: desc,
            monto: parseMonto(montoRaw),
            fecha: fallbackDate // Usar el fin de mes detectado en el encabezado (o el día de hoy si es el mes actual)
          });
        }
      }
    }
  }
  
  console.log("[parseGastosTable] Aggressive parsing found items:", results.length);
  return results;
}

function parseAlicuotasTable(html: string): any[] {
  const results: any[] = [];
  const tableMatch = html.match(/<table[^>]*class="table table-bordered"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return results;
  const rows = tableMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
  for (const row of rows) {
    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
    if (!cells || cells.length < 3) continue;
    const unidad = cleanHtml(cells[0]);
    const propietario = cleanHtml(cells[1]);
    const alicuotaVal = parseMonto(cleanHtml(cells[2]));
    if (propietario.includes("TOTALES") || !unidad || unidad.length > 15) continue;
    results.push({ unidad, propietario, alicuota: alicuotaVal, sincronizado: true });
  }
  return results;
}

function parseBalanceFull(html: string): any {
  const balance: any = {};
  
  const cleanHtmlOnly = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ');

  const rawText = cleanHtmlOnly
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8209;/g, '-')
    .replace(/&times;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
    
  const text = rawText.toUpperCase();
  
  console.log(`Balance Text Clean (primeros 1000 chars): ${text.substring(0, 1000)}`);
  
  const extractVal = (keywords: string[]) => {
    for (const kw of keywords) {
      const idx = text.indexOf(kw.toUpperCase());
      if (idx !== -1) {
        // Extend search to 200 chars after keyword
        const start = idx + kw.length;
        const end = Math.min(start + 200, text.length);
        const sub = text.substring(start, end);
        // Check if there's a negative sign BEFORE the number
        const negMatch = sub.match(/^[\s-]+(-?[\d.,]+)/);
        const posMatch = sub.match(/^[\s]*(-?[\d.,]+)/);
        const match = negMatch || posMatch;
        if (match) {
          let val = parseMonto(match[1]);
          // If starts with negative sign, make it negative
          if (match[0].includes('-') && !match[1].startsWith('-') && val > 0) {
            val = -Math.abs(val);
          }
          return val;
        }
      }
    }
    return null;
  };

  // CAJA - extract with wider search for negatives
  balance.saldo_anterior = extractVal(["SALDO DE CAJA MES ANTERIOR", "SALDO ANTERIOR", "CAJA ANTERIOR", "SALDO MES ANTERIOR"]);
  balance.cobranza_mes = extractVal(["COBRANZA DEL MES", "TOTAL COBRADO", "INGRESOS DEL MES", "TOTAL INGRESOS", "RECIBOS COBRADOS"]);
  // GASTOS separated
  balance.gastos_comunes = extractVal(["GASTOS FACTURADOS EN EL MES COMUNES"]);
  balance.gastos_no_comunes = extractVal(["GASTOS FACTURADOS EN EL MES NO COMUNES"]);
  balance.gastos_facturados = (balance.gastos_comunes || 0) + (balance.gastos_no_comunes || 0);
  // OTROS INGRESOS/EGRESOS
  balance.ajuste_pago_tiempo = extractVal(["DESC/DIF CAMBIARIO PAGO A TIEMPO", "DESC/DIF CAMBIARIO PAGO"]) || 0;
  balance.fondo_intereses_mov = extractVal(["FONDO INTERESES MORATORIOS"]) || 0;
  balance.saldo_disponible = extractVal(["SALDO ACTUAL DISPONIBLE EN CAJA", "SALDO ACTUAL DISPONIBLE", "SALDO DISPONIBLE", "SALDO EN CAJA", "DISPONIBILIDAD EN CAJA"]);
  
  // CUENTAS POR COBRAR
  balance.recibos_mes = extractVal(["RECIBOS DE CONDOMINIOS DEL MES", "EMISION DEL MES", "TOTAL RECIBOS DEL MES", "EMISION TOTAL"]);
  balance.total_por_cobrar = extractVal(["TOTAL CONDOMINIOS POR COBRAR", "TOTAL POR COBRAR", "SALDO POR COBRAR", "CUENTAS POR COBRAR"]);
  balance.condominios_atrasados = extractVal(["CONDOMINIOS ATRASADOS"]) || 0;
  balance.condominios_adelantados = extractVal(["CONDOMINIOS ADELANTADOS"]) || 0;
  balance.condominios_sobrantes = extractVal(["CONDOMINIOS SOBRANTES"]) || 0;
  
  // RESERVAS - with historical values (mes anterior + movimiento)
  balance.fondo_reserva_mes_anterior = extractVal(["FONDO DE RESERVA MES ANTERIOR", "FONDO RESERVA MES ANTERIOR"]) || 0;
  balance.fondo_reserva_mov = extractVal(["FONDO DE RESERVA"]) || 0;
  balance.fondo_reserva = extractVal(["SALDO FONDO DE RESERVA", "FONDO DE RESERVA", "RESERVA SALDO", "SALDO RESERVA"]) || balance.fondo_reserva_mes_anterior + balance.fondo_reserva_mov;
  
  balance.fondo_prestaciones = extractVal(["SALDO FONDO DE PRESTACIONES SOCIALES", "FONDO PRESTACIONES"]) || 0;
  balance.fondo_trabajos_varios = extractVal(["SALDO FONDO TRABAJOS VARIOS", "FONDO TRABAJOS VARIOS"]) || 0;
  balance.fondo_intereses = extractVal(["SALDO FONDO INTERESES MORATORIOS", "FONDO INTERESES MORATORIOS"]) || 0;
  
  balance.fondo_diferencial_mes_anterior = extractVal(["FONDO DIFERENCIAL CAMBIARIO TASA BCV MES ANTERIOR", "DIFERENCIAL CAMBIARIO MES ANTERIOR"]) || 0;
  balance.fondo_diferencial_mov = extractVal(["FONDO DIFERENCIAL CAMBIARIO TASA BCV"]) || 0;
  balance.fondo_diferencial_cambiario = extractVal(["SALDO FONDO DIFERENCIAL CAMBIARIO TASA BCV", "FONDO DIFERENCIAL CAMBIARIO"]) || balance.fondo_diferencial_mes_anterior + balance.fondo_diferencial_mov;
  
  balance.ajuste_alicuota = extractVal(["SALDO AJUSTE DIFERENCIA ALICUOTA", "AJUSTE DIFERENCIA ALICUOTA"]) || 0;

  if (!Object.values(balance).some(v => v !== null && v !== 0)) {
    console.log("Aviso: Falló extracción por texto, intentando fallback de tablas...");
    const allTables = html.match(/<table[^>]*>([\s\S]*?)<\/table>/g) || [];
    for (const t of allTables) {
       const rows = t.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
       for (const row of rows) {
          const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
          if (!cells || cells.length < 2) continue;
          const desc = cleanHtml(cells[0]).toUpperCase();
          const val = parseMonto(cleanHtml(cells[1]));
          if (val < 0.01) continue;
          
          if (desc.includes("SALDO ANTERIOR")) balance.saldo_anterior = val;
          else if (desc.includes("COBRANZA") || desc.includes("COBRADO")) balance.cobranza_mes = val;
          else if (desc.includes("GASTOS") || desc.includes("EGRESOS")) balance.gastos_facturados = val;
          else if (desc.includes("DISPONIBLE") || desc.includes("EN CAJA")) balance.saldo_disponible = val;
       }
    }
  }

  const found = Object.values(balance).some(v => v !== null && v !== 0);
  if (found) {
    const keys = ["saldo_anterior", "cobranza_mes", "gastos_facturados", "gastos_comunes", "gastos_no_comunes", "saldo_disponible", "recibos_mes", "total_por_cobrar", "condominios_atrasados", "condominios_adelantados", "condominios_sobrantes", "fondo_reserva", "fondo_reserva_mes_anterior", "fondo_reserva_mov", "fondo_prestaciones", "fondo_trabajos_varios", "fondo_intereses", "fondo_intereses_mov", "fondo_diferencial_cambiario", "fondo_diferencial_mes_anterior", "fondo_diferencial_mov", "ajuste_pago_tiempo", "ajuste_alicuota"];
    keys.forEach(k => { if (balance[k] === null || balance[k] === undefined) balance[k] = 0; });
    return balance;
  }

  return null;
}

async function limitLogs(supabase: any, table: string, edificioId: string, limit: number = 50) {
  try {
    const { data: logs } = await supabase
      .from(table)
      .select("id")
      .eq("edificio_id", edificioId)
      .order("created_at", { ascending: false });

    if (logs && logs.length > limit) {
      const idsToDelete = logs.slice(limit).map((l: any) => l.id);
      await supabase.from(table).delete().in("id", idsToDelete);
    }
  } catch (e) {
    console.error(`Error limiting logs for ${table}:`, e);
  }
}

export async function POST(request: Request) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Caracas',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
  let currentBuildingId: string | null = null;

  try {
    const body = await request.json();
    const { userId, mes, sync_recibos, sync_egresos, sync_gastos, sync_alicuotas, sync_balance } = body;

    // Obtener tasa de cambio BCV al inicio para usarla en todos los procesos
    const { data: tasaDataTop } = await supabase.from("tasas_cambio").select("tasa_dolar").order("fecha", { ascending: false }).limit(1).single();
    const tasaActual = tasaDataTop?.tasa_dolar || 45.50;

    // PROTECTION FOR DEMO MODE
    if (userId === "00000000-0000-0000-0000-000000000000") {
      console.log("[SYNC] Simulated sync for demo user");
      return NextResponse.json({ 
        success: true, 
        isDemo: true,
        message: "Sincronización simulada exitosa en modo demo",
        stats: { recibos: 42, egresos: 12, gastos: 8, alicuotas: 40, recibo_total: 2500.50 } 
      });
    }

    const mesEstandar = normalizeMes(mes);
    
    const doSyncRecibos = sync_recibos !== false;
    const doSyncEgresos = sync_egresos !== false;
    const doSyncGastos = sync_gastos !== false;
    const doSyncAlicuotas = sync_alicuotas !== false;
    const doSyncBalance = sync_balance !== false;

    const { data: building } = await supabase.from("edificios").select("*").eq("usuario_id", userId).single();
    if (!building) return NextResponse.json({ error: "Edificio no encontrado" }, { status: 404 });
    
    // UNIT LIMIT CHECK BY PLAN
    const plan = building.plan || 'Esencial';
    const limit = plan === 'Esencial' ? 30 : plan === 'Profesional' ? 50 : 999999;
    
    if ((building.unidades || 0) > limit) {
      return NextResponse.json({ 
        error: `Límite de unidades excedido para el plan ${plan}. Tu edificio tiene ${building.unidades} unidades y tu plan permite hasta ${limit}. Por favor mejora tu plan.` 
      }, { status: 403 });
    }

    currentBuildingId = building.id;
    const session = await loginToRascaCielo(building.url_login, building.admin_secret);
    if (!session) {
      await supabase.from("sincronizaciones").insert({ edificio_id: building.id, tipo: "sync", estado: "error", error: "Fallo de login" });
      await limitLogs(supabase, "sincronizaciones", building.id);
      return NextResponse.json({ error: "Fallo Login" }, { status: 400 });
    }

    const baseUrl = new URL(building.url_login).origin.replace("http://", "https://");
    
    // Convert mes (mm-yyyy) to dd-mm-yyyy (last day of month) for historical months
    let comboValue = mes;
    if (mes && mes.includes("-")) {
      const [mm, yyyy] = mes.split("-");
      const mmNum = parseInt(mm, 10);
      const yyyyNum = parseInt(yyyy, 10);
      const lastDay = new Date(yyyyNum, mmNum, 0).getDate();
      comboValue = `${String(lastDay).padStart(2, '0')}-${mm}-${yyyy}`;
    }

    const fetchWithRetry = async (urlPath: string) => {
      const separator = urlPath.includes('?') ? '&' : '?';
      const fullUrl = `${baseUrl}/${urlPath}${separator}PHPSESSID=${session.sid}`;
      console.log(`Fetching: ${fullUrl}`);
      
      const res = await fetch(fullUrl, {
        method: "GET",
        headers: { 
          "Cookie": session.cookie, 
          "User-Agent": USER_AGENT, 
          "Referer": `${baseUrl}/condlin.php?r=1` 
        },
      });
      let text = await res.text();
      
      // Si la página es muy corta (página de error/login), intentar con el formato MM-YYYY
      if (text.length < 5000 && urlPath.includes("combo=") && mes && mes.includes("-")) {
        console.log(`Page seems too short (${text.length}). Retrying with MM-YYYY format...`);
        const cleanPath = urlPath.split('&combo=')[0];
        const retryUrl = `${baseUrl}/${cleanPath}${separator}combo=${mes}&PHPSESSID=${session.sid}`;
        const res2 = await fetch(retryUrl, {
          method: "GET",
          headers: { "Cookie": session.cookie, "User-Agent": USER_AGENT, "Referer": `${baseUrl}/condlin.php?r=1` },
        });
        text = await res2.text();
      }
      
      // Si sigue siendo corta, no usar fallback de "sin combo", simplemente devolver lo que hay o null
      if (text.length < 5000) {
        console.log(`Warning: Content for ${urlPath} is still too short (${text.length}). Extraction might fail.`);
      }
      
      return text;
    };

    // Fetches secuenciales
    let hRec = null, hEgr = null, hGas = null, hBal = null, hAli = null, hRecSummary = null, hIng = null;
    const comboParam = mes ? `&combo=${comboValue}` : "";

    // 1. Balance (Fija el mes en la sesión de la administradora)
    hBal = await fetchWithRetry(`condlin.php?r=2${comboParam}`);
    await new Promise(r => setTimeout(r, 3000));

    // 2. Ingresos (Cobranza detectada) - SIEMPRE SE EJECUTA
    hIng = await fetchWithRetry(`condlin.php?r=1${comboParam}`);
    await new Promise(r => setTimeout(r, 3000));

    // Memoria de detección para esta sesión de sync (evitar doble detección r=1 vs deuda)
    const detectedInSession = new Set<string>();

    if (doSyncRecibos) {
      hRec = await fetchWithRetry(`condlin.php?r=5${comboParam}`);
      await new Promise(r => setTimeout(r, 3000));
      hRecSummary = await fetchWithRetry(`condlin.php?r=4${comboParam}`);
      await new Promise(r => setTimeout(r, 3000));
    }
    if (doSyncEgresos) {
      hEgr = await fetchWithRetry(`condlin.php?r=21${comboParam}`);
      await new Promise(r => setTimeout(r, 3000));
    }
    if (doSyncGastos) {
      hGas = await fetchWithRetry(`condlin.php?r=3${comboParam}`);
      await new Promise(r => setTimeout(r, 3000));
    }
    if (doSyncAlicuotas) {
      hAli = await fetchWithRetry(`condlin.php?r=23${comboParam}`);
    }

    console.log(`Sync Debug [${mesEstandar}]: Scraping completed.`);
    console.log(`- hRec: ${hRec ? hRec.length : 0} chars`);
    console.log(`- hBal: ${hBal ? hBal.length : 0} chars`);
    console.log(`- hIng (Ingresos): ${hIng ? hIng.length : 0} chars`);
    console.log(`- hGas (Gastos): ${hGas ? hGas.length : 0} chars`);

    const recResult = hRec ? parseRecibosTableAll(hRec) : { data: [], isComplete: true };
    const allRecibos = recResult.data;
    const isRecibosComplete = recResult.isComplete;

    const allEgresos = hEgr ? deduplicateItems(parseEgresosTableAll(hEgr), ['fecha', 'beneficiario', 'monto']) : [];
    const allIngresos = hIng ? deduplicateItems(parseIngresosTable(hIng), ['fecha', 'beneficiario', 'monto']) : [];
    const allGastos = hGas ? deduplicateItems(parseGastosTable(hGas), ['codigo', 'monto', 'descripcion']) : [];
    const balance = hBal ? parseBalanceFull(hBal) : null;
    const allAlicuotas = hAli ? parseAlicuotasTable(hAli) : [];
    const monthlyReceiptTotal = hRecSummary ? parseReceiptMonthlySummary(hRecSummary) : 0;
    const detailedReceiptItems = hRecSummary ? parseReciboDetalle(hRecSummary) : [];

    // --- SEGURIDAD: VALIDAR LECTURA COMPLETA ---
    if (doSyncRecibos && !isRecibosComplete && hRec && hRec.length > 5000) {
      await supabase.from("alertas").insert({
        edificio_id: building.id,
        tipo: "error",
        titulo: "❌ Lectura de Recibos Incompleta",
        descripcion: "El portal de la administradora entregó una respuesta parcial (no se encontró la fila de TOTALES). Se canceló la detección de pagos automáticos para proteger tus datos. Reintenta en unos minutos.",
        fecha: today
      });
      return NextResponse.json({ error: "Lectura incompleta del portal (Falta fila TOTALES). Reintente." }, { status: 400 });
    }

    // --- SEGURIDAD: VALIDAR UMBRAL DE UNIDADES ---
    const totalAptosConfig = building.unidades || 0;
    if (doSyncRecibos && totalAptosConfig > 0 && allRecibos.length === 0 && !mes) {
      if (!isRecibosComplete) {
        return NextResponse.json({ error: "El portal devolvió 0 recibos pero la lectura parece incompleta." }, { status: 400 });
      }
    }

    // FALLBACK EXTREMO: Si no hay gastos ni detalles, intentar extraer del HTML del Balance (hBal)
    if (doSyncGastos && allGastos.length === 0 && detailedReceiptItems.length === 0 && hBal) {
      console.log("Fallback: Intentando extraer gastos desde el HTML del Balance...");
      const tableMatch = hBal.match(/<table[^>]*class="[^"]*table-bordered[^"]*"[^>]*>([\s\S]*?)<\/table>/i) ||
                         hBal.match(/<table[^>]*>([\s\S]*?TOTAL GASTOS COMUNES[\s\S]*?)<\/table>/i);
      if (tableMatch) {
        const fallbackGastos = parseGastosTable(hBal);
        if (fallbackGastos.length > 0) {
          console.log(`Fallback exitoso: ${fallbackGastos.length} gastos encontrados en Balance`);
          allGastos.push(...fallbackGastos);
        }
      }
    }

    console.log(`- Parsed Recibos: ${allRecibos.length}`);
    console.log(`- Parsed Ingresos: ${allIngresos.length}`);
    console.log(`- Parsed Balance: ${balance ? "SI" : "NO"}`);
    console.log(`- Parsed Gastos Table: ${allGastos.length} items`);
    console.log(`- Parsed Recibo Total: ${monthlyReceiptTotal}`);
    console.log(`- Parsed Detailed Items (Gastos): ${detailedReceiptItems.length}`);

    if (doSyncRecibos) {
      // 1. Obtener deudores actuales en nuestra DB antes de limpiar (Movido aquí para evitar ReferenceError)
      const { data: deudoresAntes } = await supabase
        .from("recibos")
        .select("unidad, propietario, deuda")
        .eq("edificio_id", building.id);

      // --- LOGS INICIALES EN ALERTAS ---
      const deudoresAntesCount = new Set(deudoresAntes?.map(d => d.unidad) || []).size;
      const deudoresAntesNormalizados = new Set(deudoresAntes?.map(d => extractUnitCode(d.unidad)) || []).size;
      const montoTotalLocal = deudoresAntes?.reduce((sum, d) => sum + Number(d.deuda || 0), 0) || 0;
      const montoTotalPortal = allRecibos.reduce((sum, r) => sum + Number(r.deuda || 0), 0);
      
      await supabase.from("alertas").insert({
        edificio_id: building.id,
        tipo: "info",
        titulo: "🔄 Sincronización de Recibos Iniciada",
        descripcion: `Estado actual: DB Local (${deudoresAntesCount} inmuebles, ${deudoresAntesNormalizados} códigos únicos, Bs. ${formatNumber(montoTotalLocal)}) vs Portal (${allRecibos.length} inmuebles, Bs. ${formatNumber(montoTotalPortal)}). Iniciando conciliación...`,
        fecha: today
      });

      if (allRecibos.length > 0) {
        console.log(`Guardando ${allRecibos.length} recibos para ${mesEstandar}`);
      }

      if (allRecibos.length > 0) {
        // Deduplicar allRecibos antes de guardar para evitar inconsistencias
        const uniqueRecibosMap = new Map();
        allRecibos.forEach(r => {
          const key = `${r.unidad}-${Math.round(r.deuda * 100) / 100}`;
          if (!uniqueRecibosMap.has(key)) uniqueRecibosMap.set(key, r);
        });
        const deduplicatedRecibos = Array.from(uniqueRecibosMap.values());

        const recibosToSave = deduplicatedRecibos.map(r => ({
          edificio_id: building.id,
          unidad: r.unidad,
          propietario: r.propietario,
          num_recibos: r.num_recibos,
          deuda: r.deuda,
          deuda_usd: r.deuda_usd,
          sincronizado: true,
          actualizado_en: today,
          mes: mesEstandar
        }));

        // 2. Limpieza del mes actual
        await supabase.from("recibos").delete().match({ edificio_id: building.id, mes: mesEstandar });
        
        // 3. Insertar nuevos datos
        const { error: recErr } = await supabase.from("recibos").insert(recibosToSave);
        if (recErr) console.error("Error guardando recibos:", recErr);
      } else {
        // Si no hay recibos nuevos, igual limpiamos el mes actual para reflejar la realidad del portal
        await supabase.from("recibos").delete().match({ edificio_id: building.id, mes: mesEstandar });
      }

      // 4. DETECCIÓN DE PAGOS POR DESAPARICIÓN Y PAGOS PARCIALES
      // Normalización de unidades para comparación robusta (usando solo el código base ej: "08-C")
      const unidadesAhora = new Set(allRecibos.map(r => extractUnitCode(r.unidad)));
      
      // Mapa de deuda actual por unidad normalizada (después del sync)
      const deudaAhora = new Map<string, number>();
      allRecibos.forEach(r => {
        const key = extractUnitCode(r.unidad);
        deudaAhora.set(key, (deudaAhora.get(key) || 0) + Number(r.deuda || 0));
      });

      const deudoresAnteriores = deudoresAntes || [];
      // Usamos un Set de códigos normalizados para saber qué unidades tenían deuda
      const codigosAnterioresUnicos = Array.from(new Set(deudoresAnteriores.map(d => extractUnitCode(d.unidad))));
      
      // SAFEGUARD: If allRecibos is empty but we had many debtors before, it's likely a month rollover
      // or a glitch. We should NOT clear the table if it's a glitch.
      const isPossibleRollover = allRecibos.length === 0 && codigosAnterioresUnicos.length > 5;
      
      // NUEVO UMBRAL DE SEGURIDAD: Si desaparecen más del 40% de los deudores de golpe, sospechar.
      const pctDesaparecidos = codigosAnterioresUnicos.length > 0 ? (codigosAnterioresUnicos.length - unidadesAhora.size) / codigosAnterioresUnicos.length : 0;
      const isSuspiciousMassPayment = pctDesaparecidos > 0.40 && codigosAnterioresUnicos.length > 10;

      if (isPossibleRollover || isSuspiciousMassPayment) {
        const razon = isPossibleRollover ? "Posible Rollover" : "Detección Masiva Sospechosa (>40%)";
        await supabase.from("alertas").insert({
          edificio_id: building.id,
          tipo: "warning",
          titulo: `⚠️ ${razon}`,
          descripcion: `Se detectó que ${codigosAnterioresUnicos.length - unidadesAhora.size} inmuebles ya no figuran con deuda. Por seguridad, se suspendió la detección automática. Si esto es correcto, vuelve a sincronizar en unos minutos.`,
          fecha: today
        });
        console.log(`[SYNC] ${razon}. Skipping auto-detection.`);
      } else {
        // Proceder con la detección
        let pagosDetectadosSync = 0;
        let montoTotalDetectadoSync = 0;

        for (const codigoPrevio of codigosAnterioresUnicos) {
          const unidadKey = codigoPrevio;
          
          if (!unidadesAhora.has(unidadKey)) {
            // Filtrar todas las deudas de esta unidad (por código normalizado)
            const deudasUnidadRaw = deudoresAnteriores.filter(d => extractUnitCode(d.unidad) === unidadKey);
            
            // DEDUPLICAR deudas locales antes de sumar (evita multiplicación por duplicidad en DB)
            const uniqueDeudasMap = new Map();
            deudasUnidadRaw.forEach(d => {
              const key = `${d.propietario}-${Math.round((d.deuda || 0) * 100) / 100}`;
              if (!uniqueDeudasMap.has(key)) uniqueDeudasMap.set(key, d);
            });
            const deudasUnidad = Array.from(uniqueDeudasMap.values());

            const montoTotalPagado = deudasUnidad.reduce((sum, d) => sum + Number(d.deuda || 0), 0);
            const propietario = deudasUnidad[0]?.propietario || "Copropietario";
            const normalizedUnitPrev = unidadKey;

            if (montoTotalPagado > 0) {
              console.log(`[PAGO-TOTAL-DETECTADO] Unidad ${normalizedUnitPrev} pagó Bs. ${montoTotalPagado}`);
              
              // Marcar como detectado en esta sesión para evitar doble detección r=1
              detectedInSession.add(`${normalizedUnitPrev}|${Number(montoTotalPagado).toFixed(2)}`);
              
              // [FIX ULTRA-ROBUSTO] Verificar si ya existe este pago
              const { data: existingPago } = await supabase
                .from("pagos_recibos")
                .select("id")
                .eq("edificio_id", building.id)
                .eq("unidad", normalizedUnitPrev)
                .gte("monto", Number(montoTotalPagado) - 0.01)
                .lte("monto", Number(montoTotalPagado) + 0.01)
                .limit(1);

              if (!existingPago || existingPago.length === 0) {
                pagosDetectadosSync++;
                montoTotalDetectadoSync += montoTotalPagado;

                // A. Registrar en la tabla histórica pagos_recibos
                await supabase.from("pagos_recibos").insert({
                  edificio_id: building.id,
                  unidad: normalizedUnitPrev,
                  propietario: propietario,
                  mes: mesEstandar,
                  monto: montoTotalPagado,
                  monto_usd: tasaActual > 0 ? (montoTotalPagado / tasaActual) : 0,
                  tasa_bcv: tasaActual,
                  fecha_pago: today,
                  source: 'deteccion_automatica',
                  verificado: true
                });

                // B. Generar alerta de pago asumido
                await supabase.from("alertas").insert({
                  edificio_id: building.id,
                  tipo: "success",
                  titulo: "✅ Deuda Cancelada (Auto)",
                  descripcion: `La unidad ${unidadKey} (${propietario}) ha saldado su deuda total de Bs. ${formatNumber(montoTotalPagado)}. Detectado por conciliación de lista.`,
                  fecha: today
                });

                // C. Registrar en movimientos general
                const hashMov = await generateHash(`PAGO_AUTO|${building.id}|${unidadKey}|${montoTotalPagado}|${today}`);
                await supabase.from("movimientos").upsert({
                  edificio_id: building.id,
                  tipo: "recibo",
                  descripcion: `PAGO TOTAL DETECTADO - Unidad ${unidadKey}`,
                  monto: montoTotalPagado,
                  fecha: today,
                  hash: hashMov,
                  sincronizado: true
                }, { onConflict: 'edificio_id,hash' });

                // D. Registrar en movimientos_dia para el informe diario
                await supabase.from("movimientos_dia").insert({
                  edificio_id: building.id,
                  tipo: "recibo",
                  descripcion: `PAGO TOTAL - Unidad ${unidadKey} (${propietario})`,
                  monto: montoTotalPagado,
                  fecha: today,
                  fuente: "deteccion_automatica",
                  detectado_en: today,
                  unidad_apartamento: unidadKey,
                  propietario: propietario
                });
              } else {
                console.log(`[PAGO-TOTAL] Saltando duplicado para unidad ${unidadKey}`);
              }
            }

            // E. LIMPIEZA TOTAL: Borrar deudas de esta unidad en CUALQUIER mes previo (por código normalizado)
            // Primero obtenemos las unidades reales que coinciden con este código
            const rawDeudasABorrar = deudoresAnteriores.filter(d => extractUnitCode(d.unidad) === unidadKey);
            for (const d of rawDeudasABorrar) {
              await supabase.from("recibos").delete().match({ edificio_id: building.id, unidad: d.unidad });
            }
          } else {
            // La unidad sigue en la lista de deudores pero con deuda diferente: detectar pago parcial
            const deudasUnidadAntesRaw = deudoresAnteriores.filter(d => extractUnitCode(d.unidad) === unidadKey);
            const uniqueDeudasMap2 = new Map();
            deudasUnidadAntesRaw.forEach(d => {
              const key = `${d.propietario}-${Math.round((d.deuda || 0) * 100) / 100}`;
              if (!uniqueDeudasMap2.has(key)) uniqueDeudasMap2.set(key, d);
            });
            const deudasUnidadAntes = Array.from(uniqueDeudasMap2.values());
            const deudaAnterior = deudasUnidadAntes.reduce((sum, d) => sum + Number(d.deuda || 0), 0);
            const deudaActual = deudaAhora.get(unidadKey) || 0;
            const montoParcial = deudaAnterior - deudaActual;

            if (montoParcial > 0.01) {
              const propietarioParcial = deudasUnidadAntes[0]?.propietario || "Copropietario";
              const normalizedUnitParcial = unidadKey;
              console.log(`[PAGO-PARCIAL-DETECTADO] Unidad ${normalizedUnitParcial} abono Bs. ${montoParcial} (deuda: ${deudaAnterior} -> ${deudaActual})`);

              // Marcar como detectado en esta sesión para evitar doble detección r=1
              detectedInSession.add(`${normalizedUnitParcial}|${Number(montoParcial).toFixed(2)}`);

              // [FIX ULTRA-ROBUSTO] Verificar si ya existe este abono
              const { data: existingParcial } = await supabase
                .from("pagos_recibos")
                .select("id")
                .eq("edificio_id", building.id)
                .eq("unidad", normalizedUnitParcial)
                .gte("monto", Number(montoParcial) - 0.01)
                .lte("monto", Number(montoParcial) + 0.01)
                .limit(1);

              if (!existingParcial || existingParcial.length === 0) {
                pagosDetectadosSync++;
                montoTotalDetectadoSync += montoParcial;

                // Registrar en pagos_recibos
                await supabase.from("pagos_recibos").insert({
                  edificio_id: building.id,
                  unidad: normalizedUnitParcial,
                  propietario: propietarioParcial,
                  mes: mesEstandar,
                  monto: montoParcial,
                  monto_usd: tasaActual > 0 ? (montoParcial / tasaActual) : 0,
                  tasa_bcv: tasaActual,
                  fecha_pago: today,
                  source: 'deteccion_parcial',
                  verificado: false
                });

                // Registrar en movimientos general
                const hashParcial = await generateHash(`PAGO_PARCIAL|${building.id}|${unidadKey}|${montoParcial}|${today}`);
                await supabase.from("movimientos").upsert({
                  edificio_id: building.id,
                  tipo: "recibo",
                  descripcion: `ABONO PARCIAL - Unidad ${unidadKey}`,
                  monto: montoParcial,
                  fecha: today,
                  hash: hashParcial,
                  sincronizado: true
                }, { onConflict: 'edificio_id,hash' });

                // Registrar en movimientos_dia para el informe diario
                await supabase.from("movimientos_dia").insert({
                  edificio_id: building.id,
                  tipo: "recibo",
                  descripcion: `ABONO PARCIAL - Unidad ${unidadKey} (${propietarioParcial})`,
                  monto: montoParcial,
                  fecha: today,
                  fuente: "deteccion_parcial",
                  detectado_en: today,
                  unidad_apartamento: unidadKey,
                  propietario: propietarioParcial
                });

                // Alerta de pago parcial
                await supabase.from("alertas").insert({
                  edificio_id: building.id,
                  tipo: "success",
                  titulo: "💰 Abono Parcial Detectado",
                  descripcion: `La unidad ${unidadKey} (${propietarioParcial}) realizó un abono parcial de Bs. ${formatNumber(montoParcial)}. Deuda anterior: Bs. ${formatNumber(deudaAnterior)}, deuda actual: Bs. ${formatNumber(deudaActual)}.`,
                  fecha: today
                });
              } else {
                console.log(`[PAGO-PARCIAL] Saltando duplicado para unidad ${unidadKey}`);
              }
            }
          }
        }
      }

      // --- LOG FINAL EN ALERTAS ---
      const totalRecibosDespues = allRecibos.length;
      const totalInmueblesDespues = new Set(allRecibos.map(r => r.unidad)).size;
      const montoTotalDespues = allRecibos.reduce((sum, r) => sum + Number(r.deuda || 0), 0);

      await supabase.from("alertas").insert({
        edificio_id: building.id,
        tipo: "info",
        titulo: "🏁 Sincronización Finalizada",
        descripcion: `Resumen: ${pagosDetectadosSync} pagos/abonos detectados (Bs. ${formatNumber(montoTotalDetectadoSync)}). Situación resultante: ${totalRecibosDespues} recibos en ${totalInmueblesDespues} unidades, total Bs. ${formatNumber(montoTotalDespues)}.`,
        fecha: today
      });
    }

    if (doSyncRecibos && detailedReceiptItems.length > 0) {
      console.log(`Guardando ${detailedReceiptItems.length} items de detalle para ${mesEstandar}`);
      
      try {
        const { error: deleteError } = await supabase
          .from("recibos_detalle")
          .delete()
          .eq("edificio_id", building.id)
          .eq("mes", mesEstandar);
        
        if (deleteError) {
          console.log("Delete error, trying insert anyway:", deleteError);
        }
        
        await new Promise(r => setTimeout(r, 500));
        
        const seenInBatch = new Set();
        const itemsToSave = detailedReceiptItems.map(item => {
          let finalCode = item.codigo || "";
          let suffix = 0;
          // Si el código está vacío, usamos S/C (Sin Código)
          if (!finalCode || finalCode.trim() === "") {
            finalCode = "S/C";
          }
          
          let candidate = finalCode;
          while (seenInBatch.has(candidate)) {
            suffix++;
            candidate = `${finalCode}#${suffix}`;
          }
          seenInBatch.add(candidate);
          
          return {
            edificio_id: building.id,
            unidad: 'GENERAL',
            propietario: 'EDIFICIO',
            mes: mesEstandar,
            codigo: candidate,
            descripcion: item.descripcion,
            monto: item.monto,
            cuota_parte: item.cuota_parte,
            tipo: item.tipo || 'gasto_comun'
          };
        });
        
        const { error: detErr } = await supabase.from("recibos_detalle").insert(itemsToSave);
        
        if (detErr && detErr.code === '23505') {
          console.log("Duplicate error, retrying after full delete...");
          await supabase.from("recibos_detalle").delete().eq("edificio_id", building.id).eq("mes", mesEstandar);
          await new Promise(r => setTimeout(r, 500));
          const { error: retryErr } = await supabase.from("recibos_detalle").insert(itemsToSave);
          if (retryErr) {
            console.error("Error guardando detalle recibo (retry):", retryErr);
          } else {
            console.log(`Guardados ${itemsToSave.length} items en recibos_detalle (retry)`);
          }
        } else if (detErr) {
          console.error("Error guardando detalle recibo:", detErr);
        } else {
          console.log(`Guardados ${itemsToSave.length} items en recibos_detalle`);
        }
      } catch (err) {
        console.error("Exception guardando detalle recibo:", err);
      }
    }

    if (doSyncAlicuotas && allAlicuotas.length > 0) {
      await supabase.from("alicuotas").delete().eq("edificio_id", building.id);
      await supabase.from("alicuotas").insert(allAlicuotas.map(a => ({ ...a, edificio_id: building.id })));
      await supabase.from("edificios").update({ unidades: allAlicuotas.length }).eq("id", building.id);
    }

    if (doSyncEgresos || doSyncGastos) {
      await supabase.from("movimientos_dia").delete().eq("edificio_id", building.id).eq("detectado_en", today);
    }

    if (doSyncEgresos) {
      console.log(`Verificando ${allEgresos.length} egresos para ${mesEstandar}`);
      
      // Obtener egresos ya registrados para este mes
      const { data: egresosExistentes } = await supabase
        .from("egresos")
        .select("beneficiario, monto, descripcion")
        .eq("edificio_id", building.id)
        .eq("mes", mesEstandar);

      const existingMap = new Set(egresosExistentes?.map(e => `${e.beneficiario}|${e.monto}`) || []);

      for (const e of allEgresos) {
        // Verificar si ya existe (por beneficiario y monto)
        if (existingMap.has(`${e.beneficiario}|${e.monto}`)) {
          console.log(`[Sync] Egreso ya existe, saltando: ${e.beneficiario} - ${e.monto}`);
          continue;
        }

        const fDB = normalizeFecha(e.fecha);
        const derivedMes = fDB.substring(0, 7); // YYYY-MM
        // Si es una sincronización manual (mes provisto), respetamos el mesEstandar. 
        // Si es automática, usamos el mes derivado de la fecha del egreso.
        const finalMes = mes ? mesEstandar : derivedMes;

        // Hash estable sin la fecha exacta de sincronización si es posible, o simplemente usar upsert con hash único
        // Incluimos la descripción/operación para evitar colisiones entre egresos del mismo monto y beneficiario
        const hash = await generateHash(`EGRESO|${finalMes}|${e.beneficiario}|${e.monto}|${e.operacion}`);
        
        await supabase.from("egresos").upsert({ 
          edificio_id: building.id, 
          fecha: fDB, 
          beneficiario: e.beneficiario, 
          descripcion: e.operacion, 
          monto: e.monto, 
          hash, 
          sincronizado: true, 
          mes: finalMes 
        }, { onConflict: 'edificio_id,hash' });

        const desc = `${e.operacion} - ${e.beneficiario}`;
        await supabase.from("movimientos").upsert({ 
          edificio_id: building.id, 
          tipo: "egreso", 
          descripcion: desc, 
          monto: e.monto, 
          fecha: fDB, 
          hash, 
          sincronizado: true 
        }, { onConflict: 'edificio_id,hash' });

        // SIEMPRE registrar en movimientos_dia si se detectó hoy (independiente de su fecha real)
        // Pero primero verificar si ya se insertó hoy para evitar duplicados en re-sync
        const { data: mExist } = await supabase.from("movimientos_dia")
          .select("id")
          .eq("edificio_id", building.id)
          .eq("tipo", "egreso")
          .eq("descripcion", desc)
          .eq("monto", e.monto)
          .eq("detectado_en", today)
          .limit(1);

        if (!mExist || mExist.length === 0) {
          await supabase.from("movimientos_dia").insert({ 
            edificio_id: building.id, 
            tipo: "egreso", 
            descripcion: desc, 
            monto: e.monto, 
            fecha: fDB, 
            fuente: "egresos", 
            detectado_en: today 
          });
        }
      }
    }

    // PROCESAR INGRESOS DETECTADOS (PAGOS DE CONDOMINIO DE LA LISTA R=1)
    if (allIngresos.length > 0) {
      console.log(`Verificando ${allIngresos.length} ingresos para el mes ${mesEstandar}`);
      
      // Obtener pagos ya registrados para este mes en pagos_recibos
      const { data: pagosExistentes } = await supabase
        .from("pagos_recibos")
        .select("unidad, monto")
        .eq("edificio_id", building.id)
        .eq("mes", mesEstandar);
      
      const existingKeySet = new Set(pagosExistentes?.map(p => `${p.unidad}|${Number(p.monto).toFixed(2)}`) || []);

      for (const ing of allIngresos) {
        const fDB = normalizeFecha(ing.fecha);
        const mesDelPago = fDB.substring(0, 7); 
        const normalizedUnit = extractUnitCode(ing.beneficiario);
        const amountKey = `${normalizedUnit}|${Number(ing.monto).toFixed(2)}`;

        // BLOQUEO: Si ya se detectó por desaparición de deuda en esta misma sesión, saltar
        if (detectedInSession.has(amountKey)) {
          console.log(`[Sync] Pago ya detectado por deuda para ${normalizedUnit}, saltando r=1.`);
          continue;
        }

        // Verificar si ya existe en este mes o si existe globalmente
        if (!existingKeySet.has(amountKey)) {
           // [FIX ULTRA-ROBUSTO] Por si se movió de mes o fecha
           const { data: globalExist } = await supabase
             .from("pagos_recibos")
             .select("id")
             .eq("edificio_id", building.id)
             .eq("unidad", normalizedUnit)
             .gte("monto", Number(ing.monto) - 0.01)
             .lte("monto", Number(ing.monto) + 0.01)
             .limit(1);

           if (!globalExist || globalExist.length === 0) {
             // [Detección de seguridad extra] Verificar por monto con un margen de 0.01 por si acaso
             const { data: globalExistSoft } = await supabase
               .from("pagos_recibos")
               .select("id")
               .eq("edificio_id", building.id)
               .eq("unidad", normalizedUnit)
               .gte("monto", Number(ing.monto) - 0.01)
               .lte("monto", Number(ing.monto) + 0.01)
               .limit(1);
               
             if (globalExistSoft && globalExistSoft.length > 0) {
               console.log(`[Sync] Pago global detectado por margen suave para ${normalizedUnit}, saltando.`);
               continue;
             }
             
          // Guardar en pagos_recibos (centralizado)
          await supabase.from("pagos_recibos").insert({
            edificio_id: building.id,
            unidad: normalizedUnit,
            propietario: ing.beneficiario, // Usamos el nombre completo original
            mes: mesDelPago,
            monto: ing.monto,
            monto_usd: tasaActual > 0 ? (ing.monto / tasaActual) : 0,
            tasa_bcv: tasaActual,
            fecha_pago: fDB,
            source: 'ingresos_r1',
            verificado: true
          });

          // Registrar en movimientos general
          const hashGlob = await generateHash(`ING_GLOB|${building.id}|${ing.beneficiario}|${ing.monto}|${fDB}`);
          await supabase.from("movimientos").upsert({
            edificio_id: building.id,
            tipo: "recibo",
            descripcion: `${ing.descripcion} - ${ing.beneficiario}`,
            monto: ing.monto,
            fecha: fDB,
            hash: hashGlob,
            sincronizado: true
          }, { onConflict: 'edificio_id,hash' });

          // SIEMPRE registrar en movimientos_dia si se detectó hoy
          await supabase.from("movimientos_dia").insert({
            edificio_id: building.id,
            tipo: "recibo",
            descripcion: `${ing.descripcion} - ${ing.beneficiario}`,
            monto: ing.monto,
            fecha: fDB,
            fuente: "ingresos",
            detectado_en: today
          });
// Generar alerta de pago detectado
await supabase.from("alertas").insert({
  edificio_id: building.id,
  tipo: "success",
  titulo: "💰 Pago Detectado",
  descripcion: `Se detectó un nuevo ingreso de Bs. ${ing.monto} correspondiente a ${ing.beneficiario}.`,
  fecha: today
});
}
}
}
}

if (doSyncGastos) {
      // Si estamos en un mes histórico, la fecha del gasto base debe ser el último día de ese mes
      let baseFechaGasto = today;
      if (mes && mes.includes("-")) {
        const [mm, yyyy] = mes.split("-");
        const lastDay = new Date(parseInt(yyyy), parseInt(mm), 0).getDate();
        baseFechaGasto = `${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`;
      } else if (!mes) {
        // Si es sync automático y estamos en los primeros 10 días del mes,
        // y no se detectó fecha en el objeto g, es probable que el portal aún muestre el mes anterior.
        const now = new Date();
        if (now.getDate() <= 10) {
          const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
          const pY = prevMonth.getFullYear();
          const pM = String(prevMonth.getMonth() + 1).padStart(2, '0');
          const pD = String(prevMonth.getDate()).padStart(2, '0');
          baseFechaGasto = `${pY}-${pM}-${pD}`;
          console.log(`[Sync] Sync automático detectado en inicio de mes (${now.getDate()} <= 10). Usando fallback mes anterior: ${baseFechaGasto}`);
        }
      }

      // Combinar gastos de la tabla de gastos con los del detalle del recibo si la tabla viene vacía
      let finalGastos = [...allGastos];
      if (finalGastos.length === 0 && detailedReceiptItems.length > 0) {
        console.log("Gastos table empty, using detailedReceiptItems as fallback");
        finalGastos = detailedReceiptItems
          .filter(item => {
             const desc = (item.descripcion || "").toUpperCase();
             // No incluir fondos en gastos comunes
             return !desc.includes("FONDO") && item.codigo !== "00001";
          })
          .map(item => ({
            codigo: item.codigo,
            descripcion: item.descripcion,
            monto: item.monto
          }));
      }

      console.log(`Verificando ${finalGastos.length} gastos para el mes ${mesEstandar}`);
      
      // Obtener gastos ya registrados para este mes
      const { data: gastosExistentes } = await supabase
        .from("gastos")
        .select("codigo, monto, descripcion")
        .eq("edificio_id", building.id)
        .eq("mes", mesEstandar);

      const existingMap = new Set(gastosExistentes?.map(g => `${g.codigo}|${g.monto}`) || []);
      
      for (const g of finalGastos) {
        // Doble verificación: No guardar fondos si se colaron por algún motivo
        const descUpper = (g.descripcion || "").toUpperCase();
        if (descUpper.includes("FONDO") || g.codigo === "00001") {
          console.log(`[Sync] Saltando guardado de fondo detectado en bucle final: ${g.descripcion}`);
          continue;
        }

        // Verificar si ya existe (por código y monto)
        if (existingMap.has(`${g.codigo}|${g.monto}`)) {
          console.log(`[Sync] Gasto ya existe, saltando: ${g.codigo} - ${g.monto}`);
          continue;
        }

        // DETERMINAR LA FECHA DEL GASTO: Usar fecha del registro o fin de mes (ahora fallbackDate es más preciso)
        const fDB = g.fecha ? normalizeFecha(g.fecha) : baseFechaGasto;
        const derivedMes = fDB.substring(0, 7); // YYYY-MM
        // Si es una sincronización manual (mes provisto), respetamos el mesEstandar.
        // Si es automática, usamos el mes derivado de la fecha del gasto.
        const finalMes = mes ? mesEstandar : derivedMes;

        // Incluir la descripción en el hash para evitar colisiones si dos gastos tienen mismo código y monto (ej. ascensores)
        const hash = await generateHash(`GASTO|${g.codigo}|${g.monto}|${g.descripcion}|${finalMes}`);
        const { error: gErr } = await supabase.from("gastos").upsert({ 
          edificio_id: building.id, 
          mes: finalMes, 
          fecha: fDB, 
          codigo: g.codigo, 
          descripcion: g.descripcion, 
          monto: g.monto, 
          hash, 
          sincronizado: true 
        }, { onConflict: 'edificio_id,hash' });
        
        if (gErr) console.error(`Error guardando gasto ${g.codigo}:`, gErr);

        await supabase.from("movimientos").upsert({ 
          edificio_id: building.id, 
          tipo: "gasto", 
          descripcion: g.descripcion, 
          monto: g.monto, 
          fecha: fDB, 
          hash, 
          sincronizado: true 
        }, { onConflict: 'edificio_id,hash' });
        
        // SIEMPRE registrar en movimientos_dia si se detectó hoy
        const { data: mExistGas } = await supabase.from("movimientos_dia")
          .select("id")
          .eq("edificio_id", building.id)
          .eq("tipo", "gasto")
          .eq("descripcion", g.descripcion)
          .eq("monto", g.monto)
          .eq("detectado_en", today)
          .limit(1);

        if (!mExistGas || mExistGas.length === 0) {
          await supabase.from("movimientos_dia").insert({ 
            edificio_id: building.id, 
            tipo: "gasto", 
            descripcion: g.descripcion, 
            monto: g.monto, 
            fecha: fDB, 
            fuente: "gastos", 
            detectado_en: today 
          });
        }
      }
    }

    if (balance) {
      console.log(`Balance detectado para ${mesEstandar}:`, balance);
      if (monthlyReceiptTotal > 0) balance.recibos_mes = monthlyReceiptTotal;
      await supabase.from("balances").delete().match({ edificio_id: building.id, mes: mesEstandar });
      await supabase.from("balances").insert({ ...balance, edificio_id: building.id, mes: mesEstandar, fecha: today, sincronizado: true });
    } else {
      console.log(`No se pudo extraer balance para ${mesEstandar}`);
    }

    const allConcepts: any[] = [];
    
    // 1. De Gastos (r=3)
    (allGastos || []).forEach(g => {
      if (g.codigo && !allConcepts.find(c => c.codigo === g.codigo)) {
        allConcepts.push({ codigo: g.codigo, descripcion: g.descripcion });
      }
    });

    // 2. De Recibos Detallados (r=4)
    (detailedReceiptItems || []).forEach(item => {
      if (item.codigo && !allConcepts.find(c => c.codigo === item.codigo)) {
        allConcepts.push({ codigo: item.codigo, descripcion: item.descripcion });
      }
    });

    // 3. De Egresos (r=21) - Algunos edificios no traen código formal aquí, pero usamos el beneficiario como descripción
    (allEgresos || []).forEach(egr => {
      // Si el egreso tiene algo que parezca un código en la operación
      const possibleCode = egr.operacion?.split(' ')[0] || "";
      if (possibleCode.match(/^[A-Z0-9\-]+$/) && possibleCode.length > 2) {
        if (!allConcepts.find(c => c.codigo === possibleCode)) {
          allConcepts.push({ codigo: possibleCode, descripcion: egr.beneficiario });
        }
      }
    });

    if (allConcepts.length > 0) {
      console.log(`Actualizando ${allConcepts.length} conceptos detectados para ${building.id}`);
      const { data: existingRec } = await supabase.from("gastos_recurrentes").select("codigo, activo, categoria").eq("edificio_id", building.id);
      const existingMap = new Map(existingRec?.map(r => [r.codigo, r]) || []);

      for (const g of allConcepts) {
        const existing = existingMap.get(g.codigo);
        await supabase.from("gastos_recurrentes").upsert({ 
          edificio_id: building.id, 
          codigo: g.codigo, 
          descripcion: g.descripcion, 
          activo: existing ? existing.activo : true,
          categoria: existing ? existing.categoria : "otros"
        }, { onConflict: "edificio_id,codigo" });
      }
    }

    try {
      const { data: tasaData } = await supabase.from("tasas_cambio").select("tasa_dolar").order("fecha", { ascending: false }).limit(1).single();
      const tasa = tasaData?.tasa_dolar || 45.50;
      const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      const diaStr = dias[new Date(today).getDay()];

      // Obtener el mes actual para filtrar recibos (solo deudas del mes actual, como lo hace /api/recibos)
      const currentMes = today.substring(0, 7);

      const { data: recs } = await supabase.from("recibos")
        .select("unidad, deuda, num_recibos, mes")
        .eq("edificio_id", building.id)
        .gt("deuda", 0)
        .eq("mes", currentMes);
      
      // Agrupar por UNIDAD (nombre del apto) para garantizar unicidad real
      const aptosConDeuda = new Map();
      (recs || []).forEach(r => {
        const key = String(r.unidad || 'S/N').trim().toUpperCase();
        if (!aptosConDeuda.has(key)) {
          aptosConDeuda.set(key, {
            unidad: key,
            deuda: Number(r.deuda),
            num_recibos: Number(r.num_recibos || 1)
          });
        } else {
          // Si por alguna razón hay múltiples filas para el mismo apto en esta query, sumamos deuda
          const existing = aptosConDeuda.get(key);
          existing.deuda += Number(r.deuda);
          // El num_recibos debería ser el máximo o el valor que ya traía la fila principal
          existing.num_recibos = Math.max(existing.num_recibos, Number(r.num_recibos || 1));
        }
      });

      const uniqueAptosList = Array.from(aptosConDeuda.values());
      
      // Límite de seguridad: El número de morosos no puede ser mayor que el total de aptos
      const totalAptosEdificio = Math.max(1, Number(building.unidades || 43));
      const recPendientesCount = Math.min(totalAptosEdificio, uniqueAptosList.length);
      const totalDeudaAcum = uniqueAptosList.reduce((sum, r) => sum + r.deuda, 0);
      
      const bal = balance || {};
      const dispTotalBs = Number(bal.saldo_disponible || 0) + Number(bal.fondo_reserva || 0);

      // 1. Snapshot Financiero (control_diario)
      await supabase.from("control_diario").upsert({
        edificio_id: building.id, 
        fecha: today, 
        dia_semana: diaStr,
        saldo_inicial_bs: bal.saldo_anterior || 0, 
        saldo_inicial_usd: tasa > 0 ? (bal.saldo_anterior || 0) / tasa : 0,
        ingresos_bs: bal.cobranza_mes || 0, 
        ingresos_usd: tasa > 0 ? (bal.cobranza_mes || 0) / tasa : 0,
        egresos_bs: bal.gastos_facturados || 0, 
        egresos_usd: tasa > 0 ? (bal.gastos_facturados || 0) / tasa : 0,
        ajustes_bs: bal.ajuste_pago_tiempo || 0, 
        ajustes_usd: tasa > 0 ? (bal.ajuste_pago_tiempo || 0) / tasa : 0,
        saldo_final_bs: bal.saldo_disponible || 0, 
        saldo_final_usd: tasa > 0 ? (bal.saldo_disponible || 0) / tasa : 0,
        tasa_cambio: tasa, 
        recibos_pendientes: recPendientesCount,
        delta_saldo_bs: Number(bal.cobranza_mes || 0) - Number(bal.gastos_facturados || 0),
        fondo_reserva_bs: bal.fondo_reserva || 0, 
        fondo_reserva_usd: tasa > 0 ? (bal.fondo_reserva || 0) / tasa : 0,
        fondo_dif_camb_bs: bal.fondo_diferencial_cambiario || 0, 
        fondo_dif_camb_usd: tasa > 0 ? (bal.fondo_diferencial_cambiario || 0) / tasa : 0,
        fondo_int_mor_bs: bal.fondo_intereses || 0, 
        fondo_int_mor_usd: tasa > 0 ? (bal.fondo_intereses || 0) / tasa : 0,
        total_fondos_bs: bal.fondo_reserva || 0, 
        total_fondos_usd: tasa > 0 ? (bal.fondo_reserva || 0) / tasa : 0,
        disponibilidad_total_bs: dispTotalBs, 
        disponibilidad_total_usd: tasa > 0 ? dispTotalBs / tasa : 0
      }, { onConflict: 'edificio_id,fecha' });

      // 2. Snapshot de Cobranza (historico_cobranza)
      const distRecibos: any = {};
      for (let i = 1; i <= 11; i++) {
        distRecibos[`aptos_${i}_recibo`] = 0;
        distRecibos[`monto_${i}_recibo`] = 0;
      }
      distRecibos[`aptos_12_mas_recibo`] = 0;
      distRecibos[`monto_12_mas_recibo`] = 0;

      uniqueAptosList.forEach(r => {
        const n = Math.min(Number(r.num_recibos || 1), 12);
        const keyApto = n === 12 ? 'aptos_12_mas_recibo' : `aptos_${n}_recibo`;
        const keyMonto = n === 12 ? 'monto_12_mas_recibo' : `monto_${n}_recibo`;
        distRecibos[keyApto]++;
        distRecibos[keyMonto] += r.deuda;
      });

      // Validar que la suma de aptos en la distribución tampoco supere el total
      let sumaAptosDist = 0;
      for (let i = 1; i <= 11; i++) sumaAptosDist += distRecibos[`aptos_${i}_recibo`];
      sumaAptosDist += distRecibos[`aptos_12_mas_recibo`];

      if (sumaAptosDist > totalAptosEdificio) {
          const factor = totalAptosEdificio / sumaAptosDist;
          for (let i = 1; i <= 11; i++) distRecibos[`aptos_${i}_recibo`] = Math.floor(distRecibos[`aptos_${i}_recibo`] * factor);
          distRecibos[`aptos_12_mas_recibo`] = Math.floor(distRecibos[`aptos_12_mas_recibo`] * factor);
      }

      // Obtener pagos de hoy registrados en movimientos_dia
      const { data: pagosHoy } = await supabase.from("movimientos_dia").select("monto").eq("edificio_id", building.id).eq("detectado_en", today).eq("tipo", "ingreso");
      const aptosPagaronHoy = pagosHoy?.length || 0;
      const montoPagadoHoy = (pagosHoy || []).reduce((sum, p) => sum + p.monto, 0);

      // Calcular porcentajes
      const pctPendiente = (recPendientesCount / totalAptosEdificio) * 100;
      const pctPagado = 100 - pctPendiente;

      // Monto Emitido Base (usar el balance si está disponible para saber cuánto se emitió este mes)
      const montoEmitidoBs = bal.recibos_mes || 0;
      const montoEmitidoUsd = tasa > 0 ? montoEmitidoBs / tasa : 0;

      // Calcular montos en USD para guardar en historico_cobranza (el frontend espera valores en USD)
      // Esto asegura consistencia entre monto_pendiente_total y la suma de monto_N_recibo
      const totalDeudaUsd = tasa > 0 ? totalDeudaAcum / tasa : 0;

      await supabase.from("historico_cobranza").upsert({
        edificio_id: building.id,
        fecha: today,
        aptos_pagaron_hoy: aptosPagaronHoy,
        monto_pagado_hoy: montoPagadoHoy,
        aptos_pendientes_total: recPendientesCount,
        monto_pendiente_total: totalDeudaUsd,
        pct_pagado: pctPagado,
        pct_pendiente: pctPendiente,
        monto_emitido_usd_base: montoEmitidoUsd,
        monto_emitido_bs_base: montoEmitidoBs,
        tasa_cambio: tasa,
        // Los montos por bucket ahora también en USD
        aptos_1_recibo: distRecibos.aptos_1_recibo,
        monto_1_recibo: tasa > 0 ? distRecibos.monto_1_recibo / tasa : 0,
        aptos_2_recibo: distRecibos.aptos_2_recibo,
        monto_2_recibo: tasa > 0 ? distRecibos.monto_2_recibo / tasa : 0,
        aptos_3_recibo: distRecibos.aptos_3_recibo,
        monto_3_recibo: tasa > 0 ? distRecibos.monto_3_recibo / tasa : 0,
        aptos_4_recibo: distRecibos.aptos_4_recibo,
        monto_4_recibo: tasa > 0 ? distRecibos.monto_4_recibo / tasa : 0,
        aptos_5_recibo: distRecibos.aptos_5_recibo,
        monto_5_recibo: tasa > 0 ? distRecibos.monto_5_recibo / tasa : 0,
        aptos_6_recibo: distRecibos.aptos_6_recibo,
        monto_6_recibo: tasa > 0 ? distRecibos.monto_6_recibo / tasa : 0,
        aptos_7_recibo: distRecibos.aptos_7_recibo,
        monto_7_recibo: tasa > 0 ? distRecibos.monto_7_recibo / tasa : 0,
        aptos_8_recibo: distRecibos.aptos_8_recibo,
        monto_8_recibo: tasa > 0 ? distRecibos.monto_8_recibo / tasa : 0,
        aptos_9_recibo: distRecibos.aptos_9_recibo,
        monto_9_recibo: tasa > 0 ? distRecibos.monto_9_recibo / tasa : 0,
        aptos_10_recibo: distRecibos.aptos_10_recibo,
        monto_10_recibo: tasa > 0 ? distRecibos.monto_10_recibo / tasa : 0,
        aptos_11_recibo: distRecibos.aptos_11_recibo,
        monto_11_recibo: tasa > 0 ? distRecibos.monto_11_recibo / tasa : 0,
        aptos_12_mas_recibo: distRecibos.aptos_12_mas_recibo,
        monto_12_mas_recibo: tasa > 0 ? distRecibos.monto_12_mas_recibo / tasa : 0,
      }, { onConflict: 'edificio_id,fecha' });

    } catch (e) {
      console.error("Error creating snapshots:", e);
    }

    const totalRecs = allRecibos.length + allEgresos.length + allGastos.length;
    
    try {
      await supabase.from("alertas").insert({
        edificio_id: building.id,
        tipo: "info",
        titulo: `Sincronización ${mes ? "Histórica" : "Diaria"} Exitosa`,
        descripcion: `Se sincronizaron correctamente los datos de ${mes || "el mes actual"}. Se detectaron ${totalRecs} registros nuevos entre recibos, egresos y gastos.`,
        fecha: today
      });
    } catch (e) {
      console.error("Error creating sync alert:", e);
    }

    await supabase.from("sincronizaciones").insert({
      edificio_id: building.id, tipo: mes ? "sync_historica" : "sync_diaria", estado: "completado",
      movimientos_nuevos: totalRecs, detalles: {
        mes: mes || "actual", sync_recibos: doSyncRecibos, sync_egresos: doSyncEgresos, sync_gastos: doSyncGastos,
        sync_alicuotas: doSyncAlicuotas, sync_balance: doSyncBalance,
        stats: { recibos: allRecibos.length, egresos: allEgresos.length, gastos: allGastos.length, alicuotas: allAlicuotas.length, recibo_total: monthlyReceiptTotal }
      }
    });
    await limitLogs(supabase, "sincronizaciones", building.id);
    await limitLogs(supabase, "alertas", building.id);

    await supabase.from("edificios").update({ ultima_sincronizacion: new Date().toISOString() }).eq("id", building.id);
    return NextResponse.json({ success: true, stats: { recibos: allRecibos.length, egresos: allEgresos.length, gastos: allGastos.length, alicuotas: allAlicuotas.length, recibo_total: monthlyReceiptTotal } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}