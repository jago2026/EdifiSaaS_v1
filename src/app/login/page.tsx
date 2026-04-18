"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("correojago@gmail.com");
  const [password, setPassword] = useState("12345678");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Check for admin login
    if (email === "admin" && password === "13408559") {
      router.push("/admin");
      setLoading(false);
      return;
    }

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

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
      </div>
    </main>
  );
}