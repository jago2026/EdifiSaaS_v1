'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Building, Users, BarChart3, Settings, LogOut, Trash2, Edit, RefreshCw, ChevronDown, ChevronUp, Plus, Save, X, Eye } from 'lucide-react';

interface Edificio {
  id: string;
  nombre: string;
  usuario_id: string;
  admin_secret: string;
  url_login: string;
  ultima_sincronizacion: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  'Activo': 'bg-green-500/20 text-green-400 border border-green-500/30',
  'Prueba': 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  'Inactivo': 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder"
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [edificios, setEdificios] = useState<Edificio[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState('');
  const [stats, setStats] = useState({ total: 0, activos: 0, prueba: 0, inactivos: 0 });

  const loadEdificios = async () => {
    setLoading(true);
    const supabase = getSupabase();
    console.log("Loading edificio with env:", process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0,15));
    
    // First check the table exists
    const { data, error } = await supabase
      .from('edificios')
      .select('id, nombre, created_at')
      .limit(20);

    console.log("Edificios data:", data, "error:", error);
    
    setEdificios((data || []) as unknown as Edificio[]);
    
    // Get sync counts
    const { count: syncCount } = await supabase.from('sincronizaciones').select('*', { count: 'exact', head: true });
    
    setStats({
      total: data?.length || 0,
      activos: syncCount || 0,
      prueba: (data?.length || 0) - (syncCount || 0),
      inactivos: 0,
    });
    
    console.log("Loaded:", data?.length || 0, "edificios");
    setLoading(false);
  };

  useEffect(() => { 
    (async () => {
      setLoading(true);
      const supabase = getSupabase();
      const { data } = await supabase.from('edificios').select('id, nombre, created_at').limit(20);
      setEdificios((data || []) as unknown as Edificio[]);
      const { count } = await supabase.from('sincronizaciones').select('*', { count: 'exact', head: true });
      setStats({ total: data?.length || 0, activos: count || 0, prueba: (data?.length || 0) - (count || 0), inactivos: 0 });
      setLoading(false);
    })();
  }, []);

  const handleDelete = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Eliminar "${nombre}"? Los datos se conservarán.`)) return;
    const supabase = getSupabase();
    const { error } = await supabase.from('edificios').update({ admin_secret: null }).eq('id', id);
    if (!error) {
      setActionMsg(`✅ "${nombre}" eliminado`);
      setTimeout(() => setActionMsg(''), 3000);
      loadEdificios();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-white">
          <RefreshCw className="w-5 h-5 animate-spin" /> Cargando...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
              <Building className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Panel de Administración</h1>
              <p className="text-xs text-slate-400">EdifiSaaS — Administrador Principal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadEdificios} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => router.push('/login')} className="flex items-center gap-2 text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-700">
              <LogOut className="w-4 h-4" /> Salir
            </button>
          </div>
        </div>
      </header>

      {actionMsg && (
        <div className="fixed top-4 right-4 z-50 bg-slate-700 border border-slate-600 text-white px-4 py-3 rounded-xl shadow-xl text-sm">
          {actionMsg}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {([
            { label: 'Total Edificios', value: stats.total, bg: 'bg-blue-500/20', ic: 'text-blue-500', Icon: Building },
            { label: 'Sincronizados', value: stats.activos, bg: 'bg-green-500/20', ic: 'text-green-500', Icon: Users },
            { label: 'En Prueba', value: stats.prueba, bg: 'bg-amber-500/20', ic: 'text-amber-500', Icon: BarChart3 },
            { label: 'Inactivos', value: stats.inactivos, bg: 'bg-slate-500/20', ic: 'text-slate-400', Icon: Settings },
          ] as { label: string; value: number; bg: string; ic: string; Icon: React.ElementType }[]).map(({ label, value, bg, ic, Icon }) => (
            <div key={label} className="bg-slate-800 rounded-xl p-5 border border-slate-700">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${ic}`} />
                </div>
                <div>
                  <p className="text-slate-400 text-xs">{label}</p>
                  <p className="text-2xl font-bold text-white">{value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Edificios Registrados</h2>
            <span className="text-slate-400 text-sm">{edificios.length} edificios</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-700/50">
                <tr>
                  {['Edificio', 'URL Login', 'Última Sincronización', 'Creado', 'Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {edificios.map((e) => (
                  <>
                    <tr key={e.id} className="hover:bg-slate-700/30">
                      <td className="px-4 py-4">
                        <p className="text-white font-medium">{e.nombre}</p>
                      </td>
                      <td className="px-4 py-4 text-slate-400 text-xs max-w-xs truncate">{e.url_login || '—'}</td>
                      <td className="px-4 py-4 text-xs whitespace-nowrap">
                        {e.ultima_sincronizacion ? (
                          <span className="text-slate-300">
                            {new Date(e.ultima_sincronizacion).toLocaleDateString('es-ES')} {' '}
                            {new Date(e.ultima_sincronizacion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-4 text-slate-400 text-xs whitespace-nowrap">
                        {e.created_at ? new Date(e.created_at).toLocaleDateString('es-ES') : '—'}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
                            className="p-1.5 text-slate-400 hover:bg-slate-600 rounded-lg">
                            {expandedId === e.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          <button onClick={() => router.push(`/dashboard?edificio=${e.id}`)}
                            className="p-1.5 text-purple-400 hover:bg-purple-500/20 rounded-lg">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(e.id, e.nombre)}
                            className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === e.id && (
                      <tr key={`${e.id}-exp`} className="bg-slate-700/20">
                        <td colSpan={5} className="px-6 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-slate-500 text-xs mb-1">ID</p>
                              <p className="text-slate-300 text-xs">{e.id}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 text-xs mb-1">Usuario ID</p>
                              <p className="text-slate-300 text-xs">{e.usuario_id || '—'}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 text-xs mb-1">Registrado</p>
                              <p className="text-slate-300">{e.created_at ? new Date(e.created_at).toLocaleString('es-ES') : '—'}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 text-xs mb-1">Última Actividad</p>
                              <p className="text-slate-300">{e.ultima_sincronizacion ? new Date(e.ultima_sincronizacion).toLocaleString('es-ES') : 'Nunca'}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
          {edificios.length === 0 && (
            <div className="p-12 text-center text-slate-400">
              <Building className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No hay edificios registrados</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}