import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, edificio, rol, email, whatsapp, mensaje } = body;

    // Here you would typically integrate with an email service like Resend, SendGrid, etc.
    // For now, we simulate a successful email send to the administrator
    console.log(`Email to correojago@gmail.com: New lead from ${nombre} (${edificio}) - Role: ${rol}, WA: ${whatsapp}`);
    console.log(`Message: ${mensaje}`);

    // And an email to the user
    console.log(`Email to ${email}: Thank you for your interest! We will contact you soon.`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
