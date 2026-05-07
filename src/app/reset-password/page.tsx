"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  if (!token) {
    return (
      <div className="text-center p-8 bg-red-50 rounded-2xl border border-red-100">
        <p className="text-red-600 font-medium mb-4">Token de recuperación no válido o ausente.</p>
        <Link href="/login" className="text-blue-600 hover:underline text-sm font-bold">Volver al inicio de sesión</Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Las contraseñas no coinciden." });
      return;
    }
    if (password.length < 6) {
      setMessage({ type: "error", text: "La contraseña debe tener al menos 6 caracteres." });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: "¡Contraseña actualizada con éxito! Redirigiendo al inicio de sesión..." });
        setTimeout(() => router.push("/login"), 3000);
      } else {
        setMessage({ type: "error", text: data.error || "Error al restablecer la contraseña" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error de conexión. Intente de nuevo." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
      {message.text && (
        <div className={`mb-6 p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          {message.text}
        </div>
      )}

      {message.type !== 'success' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Nueva contraseña</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none pr-12" 
                placeholder="Mínimo 6 caracteres" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.025 10.025 0 014.132-5.411m0 0L21 21m-2.102-2.102A10.064 10.064 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.059 10.059 0 01-4.293 5.707M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar nueva contraseña</label>
            <input 
              type={showPassword ? "text" : "password"} 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" 
              placeholder="Repita su contraseña" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          
          <button 
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-lg disabled:opacity-50"
          >
            {loading ? "Actualizando..." : "Restablecer contraseña"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 py-12 px-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <span className="font-bold text-xl text-gray-800">CondominioSaaS</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Nueva Contraseña</h1>
          <p className="text-gray-600 text-sm">Ingrese su nueva clave de acceso.</p>
        </div>

        <Suspense fallback={<div className="text-center p-8 bg-white rounded-2xl shadow-xl">Cargando...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
