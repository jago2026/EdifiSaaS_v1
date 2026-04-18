'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building, User, Lock, LogIn } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (username === 'admin' && password === '13408559') {
      router.push('/admin');
    } else {
      setError('Usuario o clave incorrecta');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">EdifiSaaS</h1>
            <p className="text-slate-400 text-sm mt-1">Panel de Administración</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-slate-400 text-sm mb-2">Usuario</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-blue-500"
                  placeholder="admin"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-2">Clave</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-blue-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-2 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password || !username}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <LogIn className="w-5 h-5" />
              {loading ? 'Validando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700 text-center">
            <button
              onClick={() => router.push('/login')}
              className="text-slate-400 hover:text-white text-sm"
            >
              ← Volver al login de usuario
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}