import { NextResponse } from "next/server";
import { sendContactEmail } from "@/lib/mail";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, edificio, rol, email, whatsapp, mensaje } = body;

    // Send emails using the library already configured with SMTP
    await sendContactEmail({
      nombre,
      edificio,
      rol,
      email,
      whatsapp,
      mensaje
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in contact API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
