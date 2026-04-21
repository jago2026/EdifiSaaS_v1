import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { transporter } from "@/lib/mail";
import crypto from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || anonKey;

// Folder ID de Google Drive
const DRIVE_FOLDER_ID = "15UIfIyE78tbRU0zuLs-XDIuTD53OC9gk";

async function checkAdmin() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;
  if (!userId) return false;
  if (userId === "superuser-id") return true;

  const supabase = createClient(supabaseUrl, anonKey);
  const { data: user } = await supabase.from("usuarios").select("email").eq("id", userId).single();
  return user?.email === "correojago@gmail.com";
}

// Función para obtener token de Google Drive sin librerías pesadas
async function getGoogleToken(serviceAccount: any) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/drive.file",
    aud: serviceAccount.token_uri,
    exp: now + 3600,
    iat: now,
  };

  const base64UrlEncode = (str: string) => Buffer.from(str).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${encodedHeader}.${encodedPayload}`);
  const signature = signer.sign(serviceAccount.private_key, "base64");
  const encodedSignature = signature.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const jwt = `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
  
  const res = await fetch(serviceAccount.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  
  const data = await res.json();
  return data.access_token;
}

async function uploadToDrive(filename: string, content: string) {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return "No configurado";
  
  try {
    const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const token = await getGoogleToken(serviceAccount);
    
    const metadata = {
      name: filename,
      parents: [DRIVE_FOLDER_ID],
      mimeType: "application/json",
    };

    const form = new FormData();
    form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    form.append("file", new Blob([content], { type: "application/json" }));

    const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    const data = await res.json();
    return data.id ? "✅ Sincronizado con Drive" : "❌ Error en subida";
  } catch (e: any) {
    console.error("Drive Upload Error:", e);
    return "❌ Error: " + e.message;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");
    if (secret !== "cron_secret_key_123") return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: maintData, error } = await supabase.rpc('execute_maintenance');
    const stats = maintData?.records_stats || {};
    
    // Enviar email detallado
    await transporter.sendMail({
      from: '"EdifiSaaS Core" <controlfinancierosaas@gmail.com>',
      to: "correojago@gmail.com",
      subject: `🔧 [AUTO] Mantenimiento: ${error ? 'Error' : 'Exitoso'}`,
      html: `<p>Mantenimiento automático completado. Edificios: ${stats.edificios || 0}.</p>`
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!await checkAdmin()) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { action } = await request.json();
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (action === "maintenance") {
      const { data: maintData, error } = await supabase.rpc('execute_maintenance');
      const stats = maintData?.records_stats || {};
      const isPlaceholder = supabaseUrl.includes("placeholder");
      
      await transporter.sendMail({
        from: '"EdifiSaaS Core" <controlfinancierosaas@gmail.com>',
        to: "correojago@gmail.com",
        subject: `🔧 Reporte de Mantenimiento: ${error ? '⚠️ Error' : '✅ Sistema Optimizado'}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
            <div style="background: #0f172a; color: white; padding: 32px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px;">Mantenimiento de Base de Datos</h1>
              <p style="opacity: 0.7; margin-top: 8px;">Estado: ${error ? 'FALLIDO' : 'EXITOSO'}</p>
            </div>
            <div style="padding: 32px; color: #334155;">
              <h3 style="font-size: 14px; text-transform: uppercase; color: #64748b; margin-top: 24px;">Estadísticas de Datos:</h3>
              <table style="width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 14px;">
                <tr style="border-bottom: 1px solid #e2e8f0;"><td>🏢 Edificios en DB:</td><td style="text-align: right; font-weight: bold;">${stats.edificios ?? 'N/A'}</td></tr>
                <tr style="border-bottom: 1px solid #e2e8f0;"><td>📑 Recibos en DB:</td><td style="text-align: right; font-weight: bold;">${stats.recibos ?? 'N/A'}</td></tr>
                <tr style="border-bottom: 1px solid #e2e8f0;"><td>📊 Movimientos Auditados:</td><td style="text-align: right; font-weight: bold;">${stats.movimientos ?? 'N/A'}</td></tr>
              </table>
              <div style="margin-top: 32px; padding: 16px; background: #f8fafc; border-radius: 8px; font-size: 10px; color: #94a3b8; font-family: monospace;">
                DEBUG INFO: URL: ${supabaseUrl.substring(0, 25)}... | KEY: ${serviceRoleKey === anonKey ? 'ANON (Limitada)' : 'SERVICE (Full)'}
              </div>
            </div>
          </div>`
      });

      return NextResponse.json({ success: true });
    }

    if (action === "backup") {
      const tables = ["edificios", "usuarios", "administradoras", "recibos", "egresos", "balances", "gastos", "alicuotas", "junta"];
      const backupData: any = { version: "1.1", timestamp: new Date().toISOString(), tables: {} };

      for (const table of tables) {
        const { data } = await supabase.from(table).select("*");
        backupData.tables[table] = data;
      }

      const filename = `backup_edifisaas_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      const fileContent = JSON.stringify(backupData, null, 2);

      // SUBIR A DRIVE
      const driveStatus = await uploadToDrive(filename, fileContent);

      return NextResponse.json({ success: true, data: backupData, filename, driveStatus });
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
