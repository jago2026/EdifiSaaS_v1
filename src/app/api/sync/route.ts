import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function parseMonto(text: string): number {
  if (!text) return 0;
  let cleaned = text.replace(/[^\d.,-]/g, "");
  if (!cleaned) return 0;
  let numStr = cleaned.replace(/\./g, "").replace(",", ".");
  return parseFloat(numStr) || 0;
}

async function generateHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function normalizeFecha(fecha: string): string {
  const match = fecha?.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  return new Date().toISOString().split('T')[0];
}

function normalizeMes(mesStr: string): string {
  const match = mesStr?.match(/^(\d{2})-(\d{4})$/);
  return match ? `${match[2]}-${match[1]}` : "2026-04";
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

// --- EXTRACTORES ---

function parseRecibosTableAll(html: string): any[] {
  const results: any[] = [];
  const tableMatch = html.match(/<table[^>]*class="table table-bordered"[^>]*>([\s\S]*?)<\/table>/i) || 
                     html.match(/<table[^>]*class="table-bordered"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return results;
  const rows = tableMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
  for (const row of rows) {
    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
    if (!cells || cells.length < 4) continue;
    const unidad = cleanHtml(cells[0]);
    const propietario = cleanHtml(cells[1]);
    const numRecibosCell = cleanHtml(cells[2]);
    const deudaCell = cleanHtml(cells[3]);
    
    if (propietario.includes("TOTALES")) continue;
    if (!unidad || unidad.length > 15) continue;

    const matchUSD = deudaCell.match(/\(([^\)]+)\)/);
    const mUSD = matchUSD ? Math.abs(parseMonto(matchUSD[1])) : 0;
    const bsMatch = deudaCell.match(/\)\s*[&nbsp;]*\s*([\d.,]+)$/) || [null, deudaCell.split(" ").pop()];
    const mBS = parseMonto(bsMatch[1] || "");

    if (mUSD === 0 && mBS === 0) continue;

    const nRec = parseInt(numRecibosCell) || 0;
    results.push({ unidad, propietario, num_recibos: nRec, deuda_usd: mUSD, deuda: mBS });
  }
  return results;
}

function parseEgresosTableAll(html: string): any[] {
  const results: any[] = [];
  const tableMatch = html.match(/<table[^>]*class="table table-bordered"[^>]*>([\s\S]*?)<\/table>/i);
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

function parseGastosTable(html: string): any[] {
  const results: any[] = [];
  const tableMatch = html.match(/<table[^>]*class="table table-bordered"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return results;
  const tableContent = tableMatch[1];
  const rows = tableContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
  for (const row of rows) {
    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
    if (!cells || cells.length < 3) continue;
    const code = cleanHtml(cells[0]);
    const desc = cleanHtml(cells[1]);
    const montoCell = cleanHtml(cells[2]);
    if (!code || code === '&nbsp;' || code.trim() === '') continue;
    if (desc.includes("TOTAL GASTOS COMUNES:") || desc.includes("TOTAL FONDOS:") || desc.includes("TOTAL FONDOS Y GASTOS") || desc.includes("TOTAL GASTOS:")) {
      continue;
    }
    if (code === "00001" && desc.includes("FONDO DE RESERVA")) {
      continue;
    }
    if (code.match(/^\d+$/)) {
      const m = parseMonto(montoCell);
      if (!desc.includes("TOTAL")) {
        results.push({ codigo: code, descripcion: desc, monto: m });
      }
    }
  }
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
  const allTables = html.match(/<table[^>]*class="table table-bordered"[^>]*>([\s\S]*?)<\/table>/g) || [];
  for (const t of allTables) {
    if (!t.includes("SALDO DE CAJA") && !t.includes("FONDO DE RESERVA") && !t.includes("CUENTAS POR COBRAR")) continue;
    const rows = t.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
    for (const row of rows) {
      const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
      if (!cells || cells.length < 2) continue;
      
      const desc = cleanHtml(cells[0]).toUpperCase();
      const valCell1 = cleanHtml(cells[1]);
      
      // Permitir valores negativos, solo saltar si es puramente una línea de separación
      if (valCell1 === '--------------------') continue;
      
      const val = parseMonto(valCell1);
      const saldo = cells.length >= 3 ? parseMonto(cleanHtml(cells[2])) : 0;
      const hasSaldoValue = cells.length >= 3 && cleanHtml(cells[2]).replace(/[\s,.-]/g, '') !== '';

      if (desc.includes("SALDO DE CAJA MES ANTERIOR")) {
        balance.saldo_anterior = val;
      } else if (desc.includes("COBRANZA DEL MES")) {
        balance.cobranza_mes = val;
      } else if (desc.includes("GASTOS FACTURADOS EN EL MES COMUNES")) {
        balance.gastos_facturados = val;
      } else if (desc.includes("DESC/DIF/CAMB/PAGO A TIEMPO")) {
        balance.ajuste_pago_tiempo = val;
      } else if (desc.includes("SALDO ACTUAL DISPONIBLE EN CAJA")) {
        balance.saldo_disponible = hasSaldoValue ? saldo : val;
      } else if (desc.includes("RECIBOS DE CONDOMINIOS DEL MES")) {
        balance.recibos_mes = val;
      } else if (desc.includes("CONDOMINIOS ATRASADOS")) {
        balance.condominios_atrasados = val;
      } else if (desc.includes("CONDOMINIOS SOBRANTES")) {
        balance.condominios_sobrantes = val;
      } else if (desc.includes("TOTAL CONDOMINIOS POR COBRAR")) {
        balance.total_por_cobrar = hasSaldoValue ? saldo : val;
      } else if (desc.includes("TOTAL CAJA Y POR COBRAR")) {
        balance.total_caja_y_cobrar = hasSaldoValue ? saldo : val;
      } else if (desc.includes("FONDO DE RESERVA")) {
        if (desc.includes("MES ANTERIOR")) balance.fondo_reserva_mes_anterior = val;
        else if (desc.includes("SALDO FONDO DE RESERVA")) balance.fondo_reserva = hasSaldoValue ? saldo : val;
      } else if (desc.includes("PRESTACIONES SOCIALES")) {
        if (desc.includes("MES ANTERIOR")) balance.fondo_prestaciones_mes_anterior = val;
        else if (desc.includes("SALDO FONDO DE PRESTACIONES")) balance.fondo_prestaciones = hasSaldoValue ? saldo : val;
      } else if (desc.includes("TRABAJOS VARIOS")) {
        if (desc.includes("MES ANTERIOR")) balance.fondo_trabajos_varios_mes_anterior = val;
        else if (desc.includes("SALDO FONDO TRABAJOS VARIOS")) balance.fondo_trabajos_varios = hasSaldoValue ? saldo : val;
      } else if (desc.includes("AJUSTE DIFERENCIA ALICUOTA")) {
        if (desc.includes("MES ANTERIOR")) balance.ajuste_alicuota_mes_anterior = val;
        else if (desc.includes("SALDO AJUSTE DIFERENCIA ALICUOTA")) balance.ajuste_alicuota = hasSaldoValue ? saldo : val;
      } else if (desc.includes("INTERESES MORATORIOS")) {
        if (desc.includes("MES ANTERIOR")) balance.fondo_intereses_mes_anterior = val;
        else if (desc.includes("SALDO FONDO INTERESES MORATORIOS")) balance.fondo_intereses = hasSaldoValue ? saldo : val;
      } else if (desc.includes("FONDO DIFERENCIAL CAMBIARIO TASA BCV")) {
        if (desc.includes("MES ANTERIOR")) balance.fondo_diferencial_mes_anterior = val;
        else if (desc.includes("SALDO FONDO DIFERENCIAL CAMBIARIO")) balance.fondo_diferencial_cambiario = hasSaldoValue ? saldo : val;
      } else if (desc.includes("SALDO RESERVAS")) {
        balance.saldo_reservas = hasSaldoValue ? saldo : val;
      }
    }
  }
  return balance;
}

export async function POST(request: Request) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const today = new Date().toISOString().split('T')[0];
  let currentBuildingId: string | null = null;

  try {
    const body = await request.json();
    const { userId, mes } = body;
    const mesEstandar = normalizeMes(mes);
    const { data: building } = await supabase.from("edificios").select("*").eq("usuario_id", userId).single();
    if (!building) return NextResponse.json({ error: "Edificio no encontrado" }, { status: 404 });
    
    currentBuildingId = building.id;
    console.log(`[DEBUG] Iniciando sync para edificio ${building.id} (${building.nombre})`);

    const session = await loginToRascaCielo(building.url_login, building.admin_secret);
    if (!session) {
      // Registrar error en tabla sincronizaciones
      await supabase.from("sincronizaciones").insert({
        edificio_id: building.id,
        tipo: "sync",
        estado: "error",
        error: "Fallo de login en Web Admin. Verifica credenciales."
      });
      // Registrar alerta de error para el usuario
      await supabase.from("alertas").insert({
        edificio_id: building.id,
        tipo: "error",
        titulo: "Error de Sincronización",
        descripcion: "No se pudo iniciar sesión en el portal de la administradora. Verifica las credenciales en configuración.",
        fecha: today
      });
      return NextResponse.json({ error: "Fallo Login" }, { status: 400 });
    }

    const baseUrl = new URL(building.url_login).origin;
    const [hRec, hEgr, hGas, hBal, hAli] = await Promise.all([
      fetchPageWithCookie(`${baseUrl}/condlin.php?r=5`, session),
      fetchPageWithCookie(`${baseUrl}/condlin.php?r=21`, session),
      fetchPageWithCookie(`${baseUrl}/condlin.php?r=3`, session),
      fetchPageWithCookie(`${baseUrl}/condlin.php?r=2`, session),
      fetchPageWithCookie(`${baseUrl}/condlin.php?r=23`, session)
    ]);

    const allRecibos = hRec ? parseRecibosTableAll(hRec) : [];
    const allEgresos = hEgr ? parseEgresosTableAll(hEgr) : [];
    const allGastos = hGas ? parseGastosTable(hGas) : [];
    const balance = hBal ? parseBalanceFull(hBal) : null;
    const allAlicuotas = hAli ? parseAlicuotasTable(hAli) : [];

    console.log(`[DEBUG] Extraídos: Recibos(${allRecibos.length}), Egresos(${allEgresos.length}), Gastos(${allGastos.length}), Alicuotas(${allAlicuotas.length})`);

    // --- GUARDADO ---
    if (allRecibos.length > 0) {
      await supabase.from("recibos").delete().eq("edificio_id", building.id);
      await supabase.from("recibos").insert(allRecibos.map(r => ({ edificio_id: building.id, unidad: r.unidad, propietario: r.propietario, num_recibos: r.num_recibos, deuda: r.deuda, deuda_usd: r.deuda_usd, sincronizado: true, actualizado_en: today })));
    }

    if (allAlicuotas.length > 0) {
      await supabase.from("alicuotas").delete().eq("edificio_id", building.id);
      await supabase.from("alicuotas").insert(allAlicuotas.map(a => ({ ...a, edificio_id: building.id })));
    }

    await supabase.from("movimientos_dia").delete().eq("edificio_id", building.id).eq("detectado_en", today);

    for (const e of allEgresos) {
      const fDB = normalizeFecha(e.fecha);
      const hash = await generateHash(`${fDB}|${e.beneficiario}|${e.monto}`);
      await supabase.from("egresos").upsert({ edificio_id: building.id, fecha: fDB, beneficiario: e.beneficiario, descripcion: e.operacion, monto: e.monto, hash, sincronizado: true, mes: mesEstandar }, { onConflict: 'edificio_id,hash' });
      
      const desc = `${e.operacion} - ${e.beneficiario}`;
      await supabase.from("movimientos").upsert({ edificio_id: building.id, tipo: "egreso", descripcion: desc, monto: e.monto, fecha: fDB, hash, sincronizado: true }, { onConflict: 'edificio_id,hash' });
      if (fDB === today) {
        await supabase.from("movimientos_dia").insert({ edificio_id: building.id, tipo: "egreso", descripcion: desc, monto: e.monto, fecha: fDB, fuente: "egresos", detectado_en: today });
      }
    }

    for (const g of allGastos) {
      const hash = await generateHash(`GASTO|${g.codigo}|${g.monto}|${today}`);
      await supabase.from("gastos").upsert({ edificio_id: building.id, mes: mesEstandar, fecha: today, codigo: g.codigo, descripcion: g.descripcion, monto: g.monto, hash, sincronizado: true }, { onConflict: 'edificio_id,hash' });
      
      await supabase.from("movimientos").upsert({ edificio_id: building.id, tipo: "gasto", descripcion: g.descripcion, monto: g.monto, fecha: today, hash, sincronizado: true }, { onConflict: 'edificio_id,hash' });
      if (mesEstandar === today.substring(0, 7)) {
        await supabase.from("movimientos_dia").insert({ edificio_id: building.id, tipo: "gasto", descripcion: g.descripcion, monto: g.monto, fecha: today, fuente: "gastos", detectado_en: today });
      }
    }

    if (balance) {
      await supabase.from("balances").delete().match({ edificio_id: building.id, mes: mesEstandar });
      await supabase.from("balances").insert({ ...balance, edificio_id: building.id, mes: mesEstandar, fecha: today, sincronizado: true });
    }

    // Registrar éxito en sincronizaciones e insertar Alerta informativa
    const totalRecs = allRecibos.length + allEgresos.length + allGastos.length;
    const mesAlert = mes ? ` para el mes ${mes}` : "";
    await supabase.from("sincronizaciones").insert({
      edificio_id: building.id,
      tipo: "sync",
      estado: "completado",
      movimientos_nuevos: totalRecs,
      error: `Sync OK${mesAlert}: ${allRecibos.length} recibos, ${allEgresos.length} egresos, ${allGastos.length} gastos`
    });

    await supabase.from("alertas").insert({
      edificio_id: building.id,
      tipo: "success",
      titulo: `Sincronización Exitosa${mesAlert}`,
      descripcion: `Se actualizaron ${totalRecs} registros desde el portal Web Admin correspondiente al periodo ${mes || 'actual'}.`,
      fecha: today
    });

    await supabase.from("edificios").update({ ultima_sincronizacion: new Date().toISOString() }).eq("id", building.id);

    return NextResponse.json({ success: true, stats: { recibos: allRecibos.length, egresos: allEgresos.length, gastos: allGastos.length, alicuotas: allAlicuotas.length } });
  } catch (error: any) {
    console.error("[ERROR] Sync catch:", error);
    if (currentBuildingId) {
      await supabase.from("sincronizaciones").insert({
        edificio_id: currentBuildingId,
        tipo: "sync",
        estado: "error",
        error: error.message || "Error desconocido"
      });
      await supabase.from("alertas").insert({
        edificio_id: currentBuildingId,
        tipo: "error",
        titulo: "Error Crítico",
        descripcion: error.message || "Fallo inesperado durante la extracción de datos.",
        fecha: today
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
