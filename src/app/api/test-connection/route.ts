import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

async function testLoginRascaCielo(urlLogin: string, password: string): Promise<{ success: boolean; cookie?: string; error?: string; html?: string }> {
  try {
    const urlObj = new URL(urlLogin.startsWith("http") ? urlLogin : `https://${urlLogin}`);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    
    // ALWAYS use condlin.php for login - FORCE IT regardless of what's in database
    let loginUrl = baseUrl + "/condlin.php";
    console.log("DEBUG: Input URL was:", urlLogin);
    console.log("DEBUG: Using LOGIN URL:", loginUrl);
    console.log("DEBUG: Password length:", password.length);
    
    // Step 1: Get initial cookie from login page
    const initRes = await fetch(loginUrl, {
      method: "GET",
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    const initCookies = initRes.headers.get("set-cookie") || "";
    console.log("DEBUG: Initial cookies:", initCookies?.substring(0, 50));
    
// Step 2: POST login with credentials
    const formData = new URLSearchParams();
    formData.append("clave", password);
    formData.append("entrar", "Entrar");
    
    // Make POST request first (don't follow redirects yet)
    const postRes = await fetch(loginUrl, {
      method: "POST",
      redirect: "manual",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": loginUrl,
        "Cookie": initCookies,
        "Upgrade-Insecure-Requests": "1",
      },
      body: formData.toString(),
    });
    
    // Follow any HTTP redirects manually
    let finalRes = postRes;
    let finalHtml = "";
    let redirects = 0;
    
    while (redirects < 5) {
      finalHtml = await finalRes.text();
      const location = finalRes.headers.get("location");
      
      if (location && !location.includes("indice") && redirects < 3) {
        console.log("DEBUG: Following redirect to:", location);
        finalRes = await fetch(location, {
          method: "GET",
          redirect: "manual",
          headers: {
            "Cookie": initCookies,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });
        redirects++;
        continue;
      }
      break;
    }
    
    const html = finalHtml;
    console.log("DEBUG: Final response status:", finalRes.status);
    console.log("DEBUG: HTML length:", html.length);
    console.log("DEBUG: HTML sample:", html.substring(0, 150));
    
    // Try to get PHPSESSID from headers (after redirects)
    let setCookie = finalRes.headers.get("set-cookie") || "";
    let phpsessid = setCookie.match(/PHPSESSID=([^;]+)/);
    console.log("DEBUG: Set-Cookie after:", setCookie?.substring(0, 50));
    
    // If no cookie, try the init cookie
    if (!phpsessid && initCookies.includes("PHPSESSID=")) {
      phpsessid = initCookies.match(/PHPSESSID=([^;]+)/);
    }
    
    // If not in headers, try from HTML
    if (!phpsessid) {
      phpsessid = html.match(/PHPSESSID=([a-zA-Z0-9]+)/);
    }
    
    // Check for login error
    if (html.toLowerCase().includes("incorrecta") || html.includes("Acceso Denegado")) {
      return { success: false, error: "Contraseña incorrecta" };
    }
    
    if (!phpsessid) {
      console.log("DEBUG: No PHPSESSID found anywhere");
      return { success: false, error: "No se recibió cookie de sesión", html: html.substring(0, 500) };
    }

    const cookie = `PHPSESSID=${phpsessid[1]}`;
    console.log("DEBUG: SUCCESS! Cookie:", cookie);
    return { success: true, cookie };
  } catch (error: any) {
    return { success: false, error: error.message || "Error de conexión" };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, password, urlLogin } = body;

    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (!password || !urlLogin) {
      return NextResponse.json({ error: "Faltan parámetros (password, urlLogin)" }, { status: 400 });
    }

    console.log("Testing connection to:", urlLogin);

    const result = await testLoginRascaCielo(urlLogin, password);

    console.log("Test result:", result);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Conexión exitosa. La contraseña es correcta.",
        details: {
          cookie_received: true,
          cookie: result.cookie?.substring(0, 30) + "..."
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || "Error al conectar",
        html_preview: result.html
      });
    }

  } catch (error: any) {
    console.error("Test connection error:", error);
    return NextResponse.json({ error: error.message || "Error al probar conexión" }, { status: 500 });
  }
}