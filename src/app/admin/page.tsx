'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { 
  Building, Users, BarChart3, Settings, LogOut, Trash2, Edit, 
  RefreshCw, ChevronDown, ChevronUp, Plus, Save, X, Eye 
} from 'lucide-react';

interface Edificio {
  id: string;
  nombre: string;
  usuario_id: string;
  admin_id: string;
  url_login: string;
  ultima_sincronizacion: string;
  created_at: string;
  status: string;
  monthly_fee: number;
  discount_pct: number;
  payment_day: number;
  last_payment_date: string;
  last_payment_amount: number;
  notes: string;
  unidades: number;
}

const STATUS_CYCLE: Record<string, string> = {
  'Prueba':     'Activo',
  'Activo':     'Suspendido',
  'Suspendido': 'Prueba',
  'Inactivo':   'Prueba',
};

const STATUS_COLORS: Record<string, string> = {
  'Activo':     'bg-green-500/20 text-green-400 border border-green-500/30',
  'Prueba':     'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  'Suspendido': 'bg-red-500/20 text-red-400 border border-red-500/30',
  'Inactivo':   'bg-slate-500/20 text-slate-400 border border-slate-500/30',
};

const GEAR_COLORS: Record<string, string> = {
  'Prueba':     'text-amber-400 hover:bg-amber-500/20',
  'Activo':     'text-green-400 hover:bg-green-500/20',
  'Suspendido': 'text-slate-400 hover:bg-slate-500/20',
  'Inactivo':   'text-blue-400 hover:bg-blue-500/20',
};

const GEAR_TITLES: Record<string, string> = {
  'Prueba':     'Cambiar a Activo',
  'Activo':     'Cambiar a Suspendido',
  'Suspendido': 'Volver a Prueba',
  'Inactivo':   'Reactivar como Prueba',
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
  const [editingBuilding, setEditingBuilding] = useState<Edificio | null>(null);
  const [actionMsg, setActionMsg] = useState('');
  const [stats, setStats] = useState({ 
    total: 0, 
    activos: 0, 
    prueba: 0, 
    suspendidos: 0,
    inactivos: 0 
  });

  const loadEdificios = async () => {
    setLoading(true);
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('edificios')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error loading edificios:", error);
      setLoading(false);
      return;
    }

    const blds = (data || []) as Edificio[];
    setEdificios(blds);
    
    setStats({
      total: blds.length,
      activos: blds.filter(b => b.status === 'Activo').length,
      prueba: blds.filter(b => b.status === 'Prueba' || !b.status).length,
      suspendidos: blds.filter(b => b.status === 'Suspendido').length,
      inactivos: blds.filter(b => b.status === 'Inactivo').length,
    });
    
    setLoading(false);
  };

  useEffect(() => { 
    loadEdificios();
  }, []);

  const handleToggleStatus = async (building: Edificio) => {
    const supabase = getSupabase();
    const currentStatus = building.status || 'Prueba';
    const newStatus = STATUS_CYCLE[currentStatus] ?? 'Activo';
    
    const { error } = await supabase
      .from('edificios')
      .update({ status: newStatus })
      .eq('id', building.id);
      
    if (!error) {
      setActionMsg(`✅ "${building.nombre}" → ${newStatus}`);
      setTimeout(() => setActionMsg(''), 3000);
      loadEdificios();
    }
  };

  const handleDeactivate = async (building: Edificio) => {
    const confirmed = window.confirm(
      `¿Desactivar el edificio "${building.nombre}"?\n\n` +
      `Pasará a estado INACTIVO.\n` +
      `Los usuarios ya no podrán sincronizar datos.\n` +
      `El historial de datos se conserva intacto.`
    );
    if (!confirmed) return;
    
    const supabase = getSupabase();
    const { error } = await supabase
      .from('edificios')
      .update({ status: 'Inactivo' })
      .eq('id', building.id);
      
    if (!error) {
      setActionMsg(`🚫 "${building.nombre}" marcado como Inactivo`);
      setTimeout(() => setActionMsg(''), 3000);
      loadEdificios();
    } else {
      alert('Error: ' + error.message);
    }
  };

  const handleUpdateBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBuilding) return;
    
    const supabase = getSupabase();
    const { error } = await supabase
      .from('edificios')
      .update({
        nombre: editingBuilding.nombre,
        monthly_fee: editingBuilding.monthly_fee,
        discount_pct: editingBuilding.discount_pct,
        payment_day: editingBuilding.payment_day,
        notes: editingBuilding.notes
      })
      .eq('id', editingBuilding.id);
      
    if (!error) {
      setActionMsg(`✅ Datos de "${editingBuilding.nombre}" actualizados`);
      setEditingBuilding(null);
      setTimeout(() => setActionMsg(''), 3000);
      loadEdificios();
    } else {
      alert('Error al actualizar: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-white">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Cargando...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 font-sans tracking-tight">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 rotate-3">
              <Building className="w-7 h-7 text-white -rotate-3" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white uppercase tracking-tighter">Panel Master SaaS</h1>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">EdifiSaaS v1.0 — Administrador Principal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadEdificios} className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-all" title="Recargar">
              <RefreshCw className="w-5 h-5" />
            </button>
            <button onClick={() => router.push('/admin/login')} className="flex items-center gap-2 bg-slate-700 text-slate-100 hover:bg-red-600 hover:text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg">
              <LogOut className="w-4 h-4" />
              Salir
            </button>
          </div>
        </div>
      </header>

      {actionMsg && (
        <div className="fixed top-4 right-4 z-50 bg-indigo-600 border border-indigo-500 text-white px-6 py-4 rounded-2xl shadow-2xl text-sm font-bold animate-bounce">
          {actionMsg}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total',       value: stats.total,       bg: 'bg-blue-500/20',   icon_color: 'text-blue-500',   Icon: Building },
            { label: 'Activos',     value: stats.activos,     bg: 'bg-green-500/20',  icon_color: 'text-green-500',  Icon: Users },
            { label: 'En Prueba',   value: stats.prueba,      bg: 'bg-amber-500/20',  icon_color: 'text-amber-500',  Icon: BarChart3 },
            { label: 'Suspendidos', value: stats.suspendidos, bg: 'bg-red-500/20',    icon_color: 'text-red-500',    Icon: Settings },
            { label: 'Inactivos',   value: stats.inactivos,   bg: 'bg-slate-500/20',  icon_color: 'text-slate-400',  Icon: Trash2 },
          ].map(({ label, value, bg, icon_color, Icon }) => (
            <div key={label} className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl hover:border-slate-600 transition-all">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 ${bg} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner`}>
                  <Icon className={`w-6 h-6 ${icon_color}`} />
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest mb-1">{label}</p>
                  <p className="text-3xl font-black text-white">{value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Leyenda ciclo */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 mb-6 flex flex-wrap gap-4 items-center text-[10px] uppercase font-black tracking-widest shadow-inner">
          <span className="text-indigo-400">⚙️ FLUJO DE ESTADOS:</span>
          {['Prueba', 'Activo', 'Suspendido'].map((s, i, arr) => (
            <span key={s} className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full ${STATUS_COLORS[s]}`}>{s}</span>
              {i < arr.length - 1 && <span className="text-slate-600 text-lg">→</span>}
            </span>
          ))}
          <span className="text-slate-600 text-lg">→</span>
          <span className="text-slate-500 ml-4">| 🗑️ MARCAR COMO</span>
          <span className={`px-3 py-1 rounded-full ${STATUS_COLORS['Inactivo']}`}>INACTIVO</span>
        </div>

        {/* Tabla */}
        <div className="bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden shadow-2xl">
          <div className="px-8 py-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
            <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Edificios Registrados</h2>
            <span className="bg-indigo-500/10 text-indigo-400 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">{edificios.length} registrados</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-slate-700/30">
                <tr>
                  {['Edificio', 'Admin ID', 'Unidades', 'Sincronización', 'Tarifa/mes', 'Estado', 'Acciones']
                    .map(h => (
                      <th key={h} className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap border-b border-slate-700">{h}</th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {edificios.map((b) => {
                  const status = b.status || 'Prueba';
                  const isInactive = status === 'Inactivo';
                  return (
                    <React.Fragment key={b.id}>
                      <tr className={`hover:bg-indigo-500/5 transition-colors ${isInactive ? 'opacity-40 grayscale' : ''}`}>
                        <td className="px-6 py-5">
                          <p className="text-white font-black text-base tracking-tighter">{b.nombre}</p>
                          <p className="text-slate-500 text-[10px] font-mono mt-1 opacity-50">{b.id}</p>
                        </td>
                        <td className="px-6 py-5 text-slate-400 text-xs font-mono">{b.admin_id || '—'}</td>
                        <td className="px-6 py-5 text-slate-300 font-black text-center">{b.unidades || 0}</td>
                        <td className="px-6 py-5 text-xs whitespace-nowrap">
                          {b.ultima_sincronizacion
                            ? <div className="space-y-1">
                                <p className="text-slate-200 font-bold">{new Date(b.ultima_sincronizacion).toLocaleDateString('es-ES')}</p>
                                <p className="text-indigo-400 font-black text-[10px] uppercase">{new Date(b.ultima_sincronizacion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
                              </div>
                            : <span className="text-slate-600 italic font-medium">Nunca</span>}
                        </td>
                        <td className="px-6 py-5 text-slate-400 whitespace-nowrap">
                          {b.monthly_fee != null ? <span className="font-black text-slate-100 text-lg">${b.monthly_fee.toLocaleString()}</span> : <span className="text-slate-600">—</span>}
                          {b.discount_pct != null && b.discount_pct > 0 && <span className="text-emerald-400 text-[10px] font-black ml-2 bg-emerald-500/10 px-2 py-0.5 rounded-full">-{b.discount_pct}%</span>}
                        </td>
                        <td className="px-6 py-5">
                          <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg ${STATUS_COLORS[status] || STATUS_COLORS['Prueba']}`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <button onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                              className="p-2 text-slate-400 hover:bg-slate-700 rounded-xl transition-all" title="Detalles">
                              {expandedId === b.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </button>
                            <button onClick={() => setEditingBuilding(b)}
                              className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-xl transition-all" title="Editar Suscripción">
                              <Edit className="w-5 h-5" />
                            </button>
                            <button onClick={() => router.push(`/dashboard?edificio=${b.id}`)}
                              className="p-2 text-purple-400 hover:bg-purple-500/20 rounded-xl transition-all" title="Ver Sistema">
                              <Eye className="w-5 h-5" />
                            </button>
                            <button onClick={() => handleToggleStatus(b)}
                              className={`p-2 rounded-xl transition-all shadow-lg ${GEAR_COLORS[status] || GEAR_COLORS['Prueba']}`}
                              title={GEAR_TITLES[status] || 'Cambiar estado'}>
                              <Settings className="w-5 h-5" />
                            </button>
                            {!isInactive && (
                              <button onClick={() => handleDeactivate(b)}
                                className="p-2 text-red-400 hover:bg-red-500/20 rounded-xl transition-all" title="Suspender Acceso">
                                <Trash2 className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedId === b.id && (
                        <tr className="bg-slate-900/60 shadow-inner">
                          <td colSpan={7} className="px-8 py-8 border-x-4 border-indigo-600/20">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-10 text-sm">
                              <div className="space-y-2">
                                <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">Fecha de Registro</p>
                                <p className="text-slate-100 font-bold text-base">{new Date(b.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                              </div>
                              <div className="space-y-2">
                                <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">Corte de Facturación</p>
                                <p className="text-slate-100 font-bold text-base">{b.payment_day != null ? `Día ${b.payment_day} de cada mes` : 'Por definir'}</p>
                              </div>
                              <div className="space-y-2">
                                <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">Último Pago Confirmado</p>
                                <p className="text-slate-100 font-bold text-base flex items-center gap-2">
                                  {b.last_payment_date ? new Date(b.last_payment_date).toLocaleDateString('es-ES') : 'Sin pagos'}
                                  {b.last_payment_amount != null && b.last_payment_amount > 0 && <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-lg font-black text-xs shadow-inner">${b.last_payment_amount.toLocaleString()}</span>}
                                </p>
                              </div>
                              <div className="space-y-2 col-span-full md:col-span-1">
                                <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">Notas del Administrador</p>
                                <p className="text-slate-400 text-xs italic bg-slate-800 p-4 rounded-2xl border border-slate-700 shadow-inner leading-relaxed">{b.notes || 'No se han registrado observaciones para este edificio.'}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {edificios.length === 0 && (
            <div className="p-16 text-center text-slate-500 bg-slate-800/50">
              <Building className="w-16 h-16 mx-auto mb-4 opacity-10" />
              <p className="font-black uppercase tracking-widest text-xs">No hay edificios registrados en la plataforma</p>
            </div>
          )}
        </div>

        {/* Modal Edición */}
        {editingBuilding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-800 w-full max-w-lg rounded-3xl border border-slate-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="bg-indigo-600 px-8 py-6 flex justify-between items-center">
                <div>
                  <h3 className="text-white font-black uppercase tracking-tighter text-xl">Suscripción SaaS</h3>
                  <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest">Configurar Edificio: {editingBuilding.nombre}</p>
                </div>
                <button onClick={() => setEditingBuilding(null)} className="text-white/50 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleUpdateBuilding} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tarifa Mensual ($)</label>
                    <input 
                      type="number" 
                      value={editingBuilding.monthly_fee}
                      onChange={(e) => setEditingBuilding({...editingBuilding, monthly_fee: Number(e.target.value)})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-3.5 text-white font-bold focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Descuento (%)</label>
                    <input 
                      type="number" 
                      value={editingBuilding.discount_pct}
                      onChange={(e) => setEditingBuilding({...editingBuilding, discount_pct: Number(e.target.value)})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-3.5 text-white font-bold focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Día de Facturación</label>
                    <input 
                      type="number" 
                      min="1" max="31"
                      value={editingBuilding.payment_day}
                      onChange={(e) => setEditingBuilding({...editingBuilding, payment_day: Number(e.target.value)})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-3.5 text-white font-bold focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre Comercial</label>
                    <input 
                      type="text" 
                      value={editingBuilding.nombre}
                      onChange={(e) => setEditingBuilding({...editingBuilding, nombre: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-3.5 text-white font-bold focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Notas Administrativas</label>
                  <textarea 
                    value={editingBuilding.notes}
                    onChange={(e) => setEditingBuilding({...editingBuilding, notes: e.target.value})}
                    rows={3}
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-white font-medium text-sm focus:outline-none focus:border-indigo-500 transition-all shadow-inner resize-none"
                    placeholder="Escribe aquí acuerdos especiales o recordatorios..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setEditingBuilding(null)} className="flex-1 bg-slate-700 text-white font-black uppercase text-[10px] tracking-widest py-4 rounded-2xl hover:bg-slate-600 transition-all">
                    Cancelar
                  </button>
                  <button type="submit" className="flex-2 bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest py-4 px-10 rounded-2xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <p className="mt-8 text-[10px] text-slate-600 text-center font-black uppercase tracking-[0.3em] opacity-40">
          SaaS de Control Financiero de Condominios — Panel Maestro de Operaciones
        </p>
      </div>
    </div>
  );
}
