"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DemoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDemoLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "demo", password: "demo" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        router.push("/dashboard");
      } else {
        setError(data.error || "Error al iniciar demo");
      }
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 group">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <span className="text-white font-black text-2xl">E</span>
            </div>
            <span className="font-black text-2xl text-gray-900 tracking-tighter">EdifiSaaS</span>
          </Link>
          <h1 className="text-4xl font-black text-gray-900 mb-3 tracking-tight">Demo Interactiva del Sistema</h1>
          <p className="text-gray-600 text-lg">Explora la potencia de EdifiSaaS con datos reales anonimizados</p>
        </div>

        {/* BOTÓN DE ACCESO DIRECTO DESTACADO */}
        <div className="bg-white border-2 border-indigo-600 rounded-3xl p-8 mb-12 shadow-2xl shadow-indigo-100 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest">
            Acceso Inmediato
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-4">¿Quieres ver cómo funciona por dentro?</h2>
          <p className="text-gray-600 mb-8 max-w-lg mx-auto">
            Haz clic abajo para entrar directamente al panel de control con el usuario de prueba. Podrás ver gráficos, balances, egresos y recibos en tiempo real.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button 
              onClick={handleDemoLogin}
              disabled={loading}
              className={`w-full sm:w-auto bg-indigo-600 text-white px-8 py-5 rounded-2xl text-xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-95 flex items-center justify-center gap-3 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <>
                  <span className="animate-spin text-2xl">🔄</span>
                  Iniciando Demo...
                </>
              ) : (
                <>
                  🚀 Acceso Directo
                </>
              )}
            </button>

            <Link 
              href="/login?email=demo&password=demo"
              className="w-full sm:w-auto bg-white border-4 border-indigo-600 text-indigo-600 px-8 py-5 rounded-2xl text-xl font-black hover:bg-indigo-50 transition-all shadow-xl shadow-indigo-100 active:scale-95 flex items-center justify-center gap-3"
            >
              🔑 Ingresar a Demo
            </Link>
          </div>
          
          {error && <p className="text-red-600 mt-4 font-bold">{error}</p>}
          
          <p className="text-[10px] text-gray-400 mt-6 uppercase font-bold tracking-widest">
            Entrarás con el usuario: <span className="text-indigo-600">demo</span> / clave: <span className="text-indigo-600">demo</span>
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="text-indigo-600">📊</span> Visualización de Datos
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                <div className="text-2xl font-black text-indigo-600 mb-1">Bs. 450.230,00</div>
                <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Balance Total en Caja</div>
              </div>
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="text-2xl font-black text-emerald-600 mb-1">Bs. 85.400,00</div>
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Cobranza del Mes</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="text-indigo-600">📋</span> Gestión de Gastos
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-sm font-bold text-gray-700">Mantenimiento Ascensor</span>
                <span className="text-sm font-black text-red-600">- Bs. 4.500</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-sm font-bold text-gray-700">Pago Electricidad</span>
                <span className="text-sm font-black text-red-600">- Bs. 1.200</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-sm font-bold text-gray-700">Sueldo Conserje</span>
                <span className="text-sm font-black text-red-600">- Bs. 8.000</span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center text-gray-400 text-xs">
          <p>© 2026 EdifiSaaS - Sistema de Gestión de Condominios Inteligente</p>
        </div>
      </div>
    </main>
  );
}
