import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import crypto from "crypto";


const SMTP_HOST = "smtp.gmail.com";
const SMTP_PORT = 587;
const SMTP_USER = "controlfinancierosaas@gmail.com";
const SMTP_PASS = "bjedepzgbococwsl";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://edifi-saa-s-v1.vercel.app";

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 });
    }

    
    const cleanEmail = email.trim().toLowerCase();

    // 1. Buscar en usuarios
    const { data: userData, error: userError } = await supabase
      .from("usuarios")
      .select("id, email, first_name")
      .ilike("email", cleanEmail)
      .single();

    // 2. Buscar en junta si no se encontró en usuarios
    let targetTable = "usuarios";
    let targetUser = userData;

    if (!userData) {
      const { data: memberData, error: memberError } = await supabase
        .from("junta")
        .select("id, email, nombre")
        .ilike("email", cleanEmail)
        .single();
      
      if (memberData) {
        targetTable = "junta";
        targetUser = {
          id: memberData.id,
          email: memberData.email,
          first_name: memberData.nombre?.split(" ")[0] || "Usuario"
        };
      }
    }

    // Si no se encuentra, respondemos con éxito de todos modos por seguridad (no revelar emails)
    if (!targetUser) {
      return NextResponse.json({ success: true, message: "Email enviado si existe en el sistema" });
    }

    // 3. Generar token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000); // 1 hora

    // 4. Guardar token en la tabla correspondiente
    const { error: updateError } = await supabase
      .from(targetTable)
      .update({
        reset_token: token,
        reset_token_expires: expires.toISOString()
      })
      .eq("id", targetUser.id);

    if (updateError) throw updateError;

    // 5. Enviar email
    const resetUrl = `${BASE_URL}/reset-password?token=${token}`;

    await transporter.sendMail({
      from: `"SaaS - Recuperación" <${SMTP_USER}>`,
      to: cleanEmail,
      subject: "Recuperación de contraseña - SaaS",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
          <div style="background: #1a73e8; color: white; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Recuperación de Contraseña</h1>
          </div>
          <div style="padding: 24px; color: #444; line-height: 1.6;">
            <p>Hola, <strong>${targetUser.first_name}</strong>,</p>
            <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en el Sistema SaaS.</p>
            <p>Si no realizaste esta solicitud, puedes ignorar este correo de forma segura.</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetUrl}" style="background: #1a73e8; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Restablecer mi Contraseña</a>
            </div>
            <p style="font-size: 12px; color: #888;">Este enlace expirará en 1 hora. Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:</p>
            <p style="font-size: 12px; color: #1a73e8; word-break: break-all;">${resetUrl}</p>
          </div>
          <div style="background: #f8f9fa; padding: 16px; text-align: center; font-size: 12px; color: #999;">
            © ${new Date().getFullYear()} EdifiSaaS - Sistema de Gestión de Condominios
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true, message: "Email enviado" });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 });
  }
}
