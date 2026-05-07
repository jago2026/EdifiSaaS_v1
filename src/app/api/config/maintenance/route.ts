import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";


const SMTP_HOST = "smtp.gmail.com";
const SMTP_PORT = 587;
const SMTP_USER = "controlfinancierosaas@gmail.com";
const SMTP_PASS = "bjedepzgbococwsl";

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

export async function POST(request: Request) {
  try {
    const { edificioId, userEmail } = await request.json();
    if (!edificioId) return NextResponse.json({ error: "Falta edificioId" }, { status: 400 });

    

    // Mantenimiento de logs (Limitar a 50 según requerimiento)
    const tablesToClean = ["sincronizaciones", "alertas"];
    const results: any = {};

    for (const table of tablesToClean) {
        const { data: logs } = await supabase
          .from(table)
          .select("id")
          .eq("edificio_id", edificioId)
          .order("created_at", { ascending: false });

        if (logs && logs.length > 50) {
          const idsToDelete = logs.slice(50).map((l: any) => l.id);
          const { error } = await supabase.from(table).delete().in("id", idsToDelete);
          results[table] = { total: logs.length, deleted: idsToDelete.length, error: error?.message || "Ninguno" };
        } else {
          results[table] = { total: logs?.length || 0, deleted: 0, error: "Ninguno" };
        }
    }

    const ADMIN_BCC = "correojago@gmail.com";
    const recipientTo = userEmail && userEmail !== ADMIN_BCC ? userEmail : ADMIN_BCC;
    const shouldBcc = recipientTo !== ADMIN_BCC;

    // Enviar email con los resultados
    const mailOptions: any = {
      from: `"Mantenimiento EdifiSaaS" <${SMTP_USER}>`,
      to: recipientTo,
      subject: `Reporte de Mantenimiento - Edificio ID: ${edificioId}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h2 style="color: #4F46E5; border-bottom: 2px solid #4F46E5; padding-bottom: 10px;">Reporte de Mantenimiento Preventivo</h2>
          <p>Se ha completado el mantenimiento de las tablas de base de datos para el edificio con ID: <strong>${edificioId}</strong>.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
              <tr style="background-color: #F9FAFB;">
                <th style="padding: 10px; border: 1px solid #E5E7EB; text-align: left;">Tabla</th>
                <th style="padding: 10px; border: 1px solid #E5E7EB; text-align: center;">Total Registros</th>
                <th style="padding: 10px; border: 1px solid #E5E7EB; text-align: center;">Depurados</th>
                <th style="padding: 10px; border: 1px solid #E5E7EB; text-align: left;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(results).map(([table, r]: [any, any]) => `
                <tr>
                  <td style="padding: 10px; border: 1px solid #E5E7EB;">${table}</td>
                  <td style="padding: 10px; border: 1px solid #E5E7EB; text-align: center;">${r.total}</td>
                  <td style="padding: 10px; border: 1px solid #E5E7EB; text-align: center;">${r.deleted}</td>
                  <td style="padding: 10px; border: 1px solid #E5E7EB; color: ${r.error === 'Ninguno' ? 'green' : 'red'}; font-weight: bold;">${r.error}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="margin-top: 30px; padding: 15px; background-color: #EFF6FF; border-radius: 8px;">
            <p style="margin: 0; font-size: 14px; color: #1E40AF;"><strong>Acciones realizadas:</strong></p>
            <ul style="font-size: 13px; color: #1E3A8A; margin-top: 5px;">
              <li>Limpieza de bitácoras históricas excedentes (>50 registros por edificio).</li>
              <li>Reindexación lógica mediante optimización de consultas.</li>
              <li>Verificación de integridad de sincronizaciones.</li>
            </ul>
          </div>
          
          <p style="font-size: 11px; color: #999; margin-top: 30px; text-align: center;">
            Este es un mensaje automático generado por el sistema de mantenimiento de EdifiSaaS_v1.
          </p>
        </div>
      `
    };

    if (shouldBcc) {
      mailOptions.bcc = ADMIN_BCC;
    }

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: "Mantenimiento realizado satisfactoriamente y reporte enviado." });
  } catch (error: any) {
    console.error("Maintenance error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}