import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";

if (!SMTP_USER || !SMTP_PASS) {
  console.warn("⚠️ SMTP_USER o SMTP_PASS no están configurados en las variables de entorno.");
}

export const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

export const sendInvitationEmail = async (recipient: string, nombreMiembro: string, tempPassword: string, edificioNombre: string) => {
  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://edifisaas-v1.vercel.app";
  
  return transporter.sendMail({
    from: `"EdifiSaaS" <${SMTP_USER}>`,
    to: recipient,
    subject: `Bienvenido a la Junta de Condominio - ${edificioNombre}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
        <div style="background: #1a73e8; color: white; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">¡Hola, ${nombreMiembro}!</h1>
        </div>
        <div style="padding: 24px; color: #444; line-height: 1.6;">
          <p>Has sido invitado a participar como miembro de la junta en el sistema de control financiero del edificio <strong>${edificioNombre}</strong>.</p>
          
          <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 24px 0; border: 1px solid #e9ecef;">
            <p style="margin: 0 0 8px 0;"><strong>Tus credenciales de acceso:</strong></p>
            <p style="margin: 4px 0;">📧 Email: ${recipient}</p>
            <p style="margin: 4px 0;">🔑 Clave Inicial: <strong>${tempPassword}</strong></p>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${BASE_URL}/login" style="background: #1a73e8; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">Ingresar al Sistema</a>
          </div>

          <p style="font-size: 13px; color: #666; font-style: italic;">* Por seguridad, el sistema te pedirá cambiar tu clave al ingresar por primera vez.</p>
        </div>
      </div>
    `
  });
};
