import { supabase } from './db.js';
import { decrypt } from './utils.js';

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export function cleanHtml(text: string): string {
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

export function parseMonto(text: string): number {
  if (!text) return 0;
  let cleaned = text.replace(/[^\d.,-]/g, "");
  if (!cleaned) return 0;
  let numStr = cleaned.replace(/\./g, "").replace(",", ".");
  return parseFloat(numStr) || 0;
}

export async function loginToAdmin(buildingId: number): Promise<string> {
  const { data } = await supabase
    .from('configuracion')
    .select('*')
    .eq('building_id', buildingId)
    .single();

  if (!data) throw new Error('Configuración no encontrada');

  const password = decrypt(data.admin_password_encrypted);

  const form = new URLSearchParams();
  form.append('contrasena', password);
  form.append('contrasena11', password);
  form.append('B1', 'Entrar');

  const baseUrl = new URL(data.url_login).origin;
  const res = await fetch(`${baseUrl}/control.php`, {
    method: 'POST',
    body: form,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': USER_AGENT },
    redirect: 'manual',
  });

  const cookieHeader = res.headers.get('set-cookie') || '';
  const match = cookieHeader.match(/PHPSESSID=([^;]+)/);
  if (!match) throw new Error('Login fallido - PHPSESSID no encontrado');

  return `PHPSESSID=${match[1]}`;
}

export async function downloadReceipts(sessionCookie: string, baseUrl: string): Promise<any[]> {
  const res = await fetch(`${baseUrl}/condlin.php?r=5`, {
    headers: { Cookie: sessionCookie, 'User-Agent': USER_AGENT }
  });
  const html = await res.text();
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
    const deudaCell = cleanHtml(cells[3]);
    if (propietario.includes("TOTALES")) continue;
    
    const matchUSD = deudaCell.match(/\(([^\)]+)\)/);
    const mUSD = matchUSD ? Math.abs(parseMonto(matchUSD[1])) : 0;
    const mBS = parseMonto(deudaCell.split(" ").pop() || "");
    
    results.push({
      unidad,
      propietario,
      num_recibos: parseInt(cleanHtml(cells[2])) || 0,
      deuda: mBS,
      deuda_usd: mUSD
    });
  }
  return results;
}

export async function downloadExpenses(sessionCookie: string, baseUrl: string): Promise<any[]> {
  const res = await fetch(`${baseUrl}/condlin.php?r=21`, {
    headers: { Cookie: sessionCookie, 'User-Agent': USER_AGENT }
  });
  const html = await res.text();
  const results: any[] = [];
  const tableMatch = html.match(/<table[^>]*class="table table-bordered"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return results;
  const rows = tableMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
  
  for (const row of rows) {
    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
    if (!cells || cells.length < 4) continue;
    const texts = cells.map(c => cleanHtml(c));
    if (texts[0].includes("(G)") || texts[1].includes("TOTAL EGRESOS")) continue;
    if (!texts[0].match(/\d{2}-\d{2}-\d{4}/)) continue;
    
    results.push({
      fecha: texts[0],
      beneficiario: texts[1],
      descripcion: texts[2],
      monto: parseMonto(texts[3])
    });
  }
  return results;
}

export async function downloadGastos(sessionCookie: string, baseUrl: string): Promise<any[]> {
  const res = await fetch(`${baseUrl}/condlin.php?r=3`, {
    headers: { Cookie: sessionCookie, 'User-Agent': USER_AGENT }
  });
  const html = await res.text();
  const results: any[] = [];
  const tableMatch = html.match(/<table[^>]*class="table table-bordered"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return results;
  const rows = tableMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
  
  for (const row of rows) {
    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
    if (!cells || cells.length < 3) continue;
    const code = cleanHtml(cells[0]);
    const desc = cleanHtml(cells[1]);
    if (desc.includes("TOTAL GASTOS") || desc.includes("FONDO DE RESERVA")) continue;
    if (code.match(/^\d+$/)) {
      results.push({
        codigo: code,
        descripcion: desc,
        monto: parseMonto(cleanHtml(cells[2]))
      });
    }
  }
  return gastos;
}

export async function downloadAlicuotas(sessionCookie: string, baseUrl: string): Promise<any[]> {
  const res = await fetch(`${baseUrl}/condlin.php?r=23`, {
    headers: { Cookie: sessionCookie, 'User-Agent': USER_AGENT }
  });
  const html = await res.text();
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
    
    results.push({ unidad, propietario, alicuota: alicuotaVal });
  }
  return results;
}

export async function downloadBalance(sessionCookie: string, baseUrl: string): Promise<any> {
  const res = await fetch(`${baseUrl}/condlin.php?r=2`, {
    headers: { Cookie: sessionCookie, 'User-Agent': USER_AGENT }
  });
  const html = await res.text();
  const balance: any = {};
  const allTables = html.match(/<table[^>]*>([\s\S]*?)<\/table>/g) || [];
  for (const t of allTables) {
    const rows = t.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
    for (const row of rows) {
      const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
      if (!cells || cells.length < 2) continue;
      const desc = cleanHtml(cells[0]).toUpperCase();
      const val = parseMonto(cleanHtml(cells[1]));
      const saldo = cells[2] ? parseMonto(cleanHtml(cells[2])) : val;
      
      if (desc.includes("SALDO DE CAJA MES ANTERIOR")) balance.saldo_anterior = val;
      else if (desc.includes("COBRANZA DEL MES")) balance.cobranza_mes = val;
      else if (desc.includes("GASTOS FACTURADOS EN EL MES COMUNES")) balance.gastos_facturados = val;
      else if (desc.includes("SALDO ACTUAL DISPONIBLE EN CAJA")) balance.saldo_disponible = saldo;
      else if (desc.includes("TOTAL CONDOMINIOS POR COBRAR")) balance.total_por_cobrar = saldo;
      else if (desc.includes("FONDO DE RESERVA")) balance.fondo_reserva = saldo || val;
    }
  }
  return balance;
}
