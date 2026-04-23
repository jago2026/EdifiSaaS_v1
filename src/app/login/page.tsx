"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const emailParam = searchParams.get("email");
    const passwordParam = searchParams.get("password");
    
    if (emailParam) setEmail(emailParam);
    else setEmail("correojago@gmail.com");

    if (passwordParam) setPassword(passwordParam);
    else setPassword("12345678");
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al iniciar sesión");
      }

      if (email === "admin" && password === "13408559") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function checkMaintenance() {
      try {
        const res = await fetch('/api/admin/settings?key=maintenance_mode');
        const data = await res.json();
        if (res.ok && data.value === true) {
          setIsMaintenance(true);
        }
      } catch (e) {}
    }
    checkMaintenance();
  }, []);

  const [isMaintenance, setIsMaintenance] = useState(false);

  if (isMaintenance) {
    return (
      <main className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 w-full">
        <div className="max-w-xl w-full text-center space-y-12">
          <div className="w-32 h-32 bg-amber-500/10 text-amber-500 rounded-[2.5rem] flex items-center justify-center mx-auto animate-pulse border border-amber-500/20 shadow-2xl shadow-amber-500/10">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="space-y-6">
            <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic">Sistema en Mantenimiento</h1>
            <p className="text-slate-400 text-xl font-medium leading-relaxed max-w-md mx-auto">
              Estamos realizando mejoras críticas en la plataforma para ofrecerte un mejor servicio. Por favor, intenta ingresar más tarde.
            </p>
          </div>
          <Link href="/" className="inline-block bg-white text-[#0f172a] px-12 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition shadow-2xl">
            Volver al Inicio
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Usuario o Correo</label>
          <input 
            type="text" 
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            placeholder="tu@email.com o admin" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
          <input 
            type="password" 
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            placeholder="Tu contraseña" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button 
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? "Iniciando..." : "Iniciar sesión"}
        </button>
      </form>
      <p className="text-center text-sm text-gray-600 mt-6">
        ¿No tienes cuenta?{" "}
        <Link href="/register" className="text-blue-600 font-medium hover:underline">
          Regístrate gratis
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <span className="font-bold text-xl text-gray-800">CondominioSaaS</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Iniciar sesión</h1>
          <p className="text-gray-600">Accede a tu cuenta</p>
        </div>
        <Suspense fallback={<div className="text-center">Cargando...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}