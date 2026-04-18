import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  cookieStore.delete("user_id");
  
  const origin = new URL(request.url).origin;
  return NextResponse.redirect(new URL("/login", origin));
}