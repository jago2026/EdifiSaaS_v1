'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building, Users, BarChart3, Settings, LogOut, Trash2, Edit, 
  RefreshCw, ChevronDown, ChevronUp, Plus, Save, X, Eye,
  Search, ShieldCheck, CreditCard, LayoutDashboard, Database,
  AlertTriangle, CheckCircle2, Clock, Star, Zap, Crown
} from 'lucide-react';

interface Edificio {
  id: string;
  nombre: string;
  codigo_edificio: string;
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
  plan: string;
}

interface PlanConfig {
  id?: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  unit_limit: number;
  features: string[];
  is_popular: boolean;
  badge: string;
  display_order: number;
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

const PLAN_BADGES: Record<string, any> = {
  'Básico':      { icon: Zap, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  'Profesional': { icon: Star, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  'Empresarial': { icon: Crown, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  'IA':          { icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
};

interface Administradora {
  id: string;
  nombre: string;
  url_login: string;
  url_recibos: string;
  url_recibo_mes: string;
  url_egresos: string;
  url_gastos: string;
  url_balance: string;
  url_alicuotas: string;
  created_at: string;
}

type AdminSection = 'dashboard' | 'edificios' | 'administradoras' | 'pagos' | 'auditoria' | 'planes';

export default function AdminPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<AdminSection>('edificios');
  const [edificios, setEdificios] = useState<Edificio[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingBuilding, setEditingBuilding] = useState<Edificio | null>(null);
  const [actionMsg, setActionMsg] = useState('');
  const [stats, setStats] = useState({ 
    total: 0, activos: 0, prueba: 0, suspendidos: 0, inactivos: 0 
  });
  const [administradoras, setAdministradoras] = useState<Administradora[]>([]);
  const [editingAdmin, setEditingAdmin] = useState<Partial<Administradora> | null>(null);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  
  // Planes config state
  const [planesConfigs, setPlanesConfigs] = useState<PlanConfig[]>([]);
  const [loadingPlanes, setLoadingPlanes] = useState(false);
  const [savingPlanes, setSavingPlanes] = useState(false);

  const loadEdificios = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/edificios?action=list');
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Falla en el túnel de datos");

      const blds = (data.data || []) as Edificio[];
      setEdificios(blds);
      
      setStats({
        total: blds.length,
        activos: blds.filter(b => b.status === 'Activo').length,
        prueba: blds.filter(b => b.status === 'Prueba' || !b.status).length,
        suspendidos: blds.filter(b => b.status === 'Suspendido').length,
        inactivos: blds.filter(b => b.status === 'Inactivo').length,
      });
    } catch (err: any) {
      console.error("Admin Load Error:", err);
      setActionMsg(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadAdministradoras = async () => {
    setLoadingAdmins(true);
    try {
      const res = await fetch('/api/admin/administradoras');
      const data = await res.json();
      if (res.ok) {
        setAdministradoras(data.data || []);
      }
    } catch (err) {
      console.error("Error loading admins:", err);
    } finally {
      setLoadingAdmins(false);
    }
  };

  const loadPlanesConfigs = async () => {
    setLoadingPlanes(true);
    try {
      const res = await fetch('/api/admin/planes');
      const data = await res.json();
      if (res.ok && data.data) {
        setPlanesConfigs(data.data);
      }
    } catch (err) {
      console.error("Error loading planes:", err);
    } finally {
      setLoadingPlanes(false);
    }
  };

  useEffect(() => { 
    loadEdificios();
    loadAdministradoras();
    loadPlanesConfigs();
  }, []);

  const handleSavePlanes = async () => {
    setSavingPlanes(true);
    try {
      const res = await fetch('/api/admin/planes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planes: planesConfigs })
      });
      
      if (res.ok) {
        setActionMsg('✅ Configuración de planes guardada');
        setTimeout(() => setActionMsg(''), 3000);
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar');
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSavingPlanes(false);
    }
  };

  const handleStatusChange = async (building: Edificio, newStatus: string) => {
    try {
      const res = await fetch('/api/admin/edificios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          id: building.id,
          data: { status: newStatus }
        })
      });
      
      if (res.ok) {
        setActionMsg(`✅ "${building.nombre}" → ${newStatus}`);
        setTimeout(() => setActionMsg(''), 3000);
        loadEdificios();
      }
    } catch (err) {
      alert("Error al cambiar estado");
    }
  };

  const handleUpdateBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBuilding) return;
    
    try {
      const res = await fetch('/api/admin/edificios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          id: editingBuilding.id,
          data: {
            nombre: editingBuilding.nombre,
            codigo_edificio: editingBuilding.codigo_edificio,
            monthly_fee: editingBuilding.monthly_fee,
            discount_pct: editingBuilding.discount_pct,
            payment_day: editingBuilding.payment_day,
            notes: editingBuilding.notes,
            plan: editingBuilding.plan
          }
        })
      });
      
      if (res.ok) {
        setActionMsg(`✅ Datos actualizados`);
        setEditingBuilding(null);
        setTimeout(() => setActionMsg(''), 3000);
        loadEdificios();
      }
    } catch (err) {
      alert("Error al guardar");
    }
  };

  const filteredEdificios = edificios.filter(e => 
    e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && edificios.length === 0) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="text-indigo-200 font-bold uppercase tracking-widest text-xs">Accediendo al Core del Sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex overflow-hidden font-sans">
      <aside className="w-64 bg-[#1e293b] border-r border-slate-700 flex flex-col z-50">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-white font-black text-lg tracking-tighter uppercase">Admin Master</h2>
              <p className="text-[10px] text-indigo-400 font-bold tracking-widest">SaaS CONTROL</p>
            </div>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'dashboard', label: 'Dashboard Global', icon: LayoutDashboard },
              { id: 'edificios',  label: 'Gestionar Edificios', icon: Building },
              { id: 'administradoras', label: 'Administradoras', icon: Settings },
              { id: 'planes',     label: 'Configurar Planes', icon: CreditCard },
              { id: 'pagos',      label: 'Cobranza y Pagos', icon: BarChart3 },
              { id: 'auditoria',  label: 'Auditoría Global', icon: Database },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id as AdminSection)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${
                  activeSection === item.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-700">
          <button onClick={() => router.push('/admin/login')} className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 transition-colors font-bold text-sm">
            <LogOut className="w-4 h-4" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative">
        <header className="sticky top-0 z-40 bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-800 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 bg-slate-800/50 border border-slate-700 rounded-2xl px-4 py-2 w-96">
            <Search className="w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar edificio o plan..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none text-white text-sm focus:ring-0 w-full outline-none"
            />
          </div>
          <div className="flex items-center gap-3">
             <button onClick={loadEdificios} className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all border border-slate-800">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
             </button>
             <div className="flex items-center gap-3 bg-slate-800 rounded-full pl-2 pr-4 py-1.5 border border-slate-700">
                <div className="w-7 h-7 bg-indigo-500 rounded-full flex items-center justify-center font-black text-xs text-white">A</div>
                <span className="text-white text-xs font-bold uppercase tracking-widest">Admin Master</span>
             </div>
          </div>
        </header>

        {actionMsg && (
          <div className="fixed top-20 right-8 z-50 bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-2xl font-bold flex items-center gap-3 animate-in slide-in-from-right">
            <CheckCircle2 className="w-5 h-5" />
            {actionMsg}
          </div>
        )}

        <div className="p-8">
          {activeSection === 'edificios' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
                {[
                  { label: 'Total',       value: stats.total,       bg: 'bg-blue-500/20',   ic: 'text-blue-500',   Icon: Building },
                  { label: 'Activos',     value: stats.activos,     bg: 'bg-green-500/20',  ic: 'text-green-500',  Icon: CheckCircle2 },
                  { label: 'En Prueba',   value: stats.prueba,      bg: 'bg-amber-500/20',  ic: 'text-amber-400',  Icon: Clock },
                  { label: 'Suspendidos', value: stats.suspendidos, bg: 'bg-red-500/20',    ic: 'text-red-500',    Icon: AlertTriangle },
                  { label: 'Inactivos',   value: stats.inactivos,   bg: 'bg-slate-500/20',  ic: 'text-slate-400',  Icon: Trash2 },
                ].map((s) => (
                  <div key={s.label} className="bg-[#1e293b] rounded-3xl p-6 border border-slate-700/50 shadow-xl">
                    <div className="flex flex-col gap-4">
                      <div className={`w-12 h-12 ${s.bg} rounded-2xl flex items-center justify-center shadow-inner`}>
                        <s.Icon className={`w-6 h-6 ${s.ic}`} />
                      </div>
                      <div>
                        <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest mb-1">{s.label}</p>
                        <p className="text-3xl font-black text-white">{s.value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-[#1e293b] rounded-[2rem] border border-slate-700/50 shadow-2xl overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/20">
                  <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Base de Datos de Clientes</h2>
                  <span className="bg-indigo-500/10 text-indigo-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">
                    {filteredEdificios.length} RESULTADOS
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-slate-800/50">
                      <tr>
                        {['Edificio', 'Sincronización', 'Plan Contratado', 'Tarifa/mes', 'Estado', 'Acciones']
                          .map(h => (
                            <th key={h} className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-700">{h}</th>
                          ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {filteredEdificios.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-20 text-center">
                            <div className="flex flex-col items-center gap-2 opacity-30">
                              <Building className="w-12 h-12 text-slate-500" />
                              <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No se encontraron edificios</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredEdificios.map((b) => {
                        const status = b.status || 'Prueba';
                        const isInactive = status === 'Inactivo';
                        const plan = b.plan || 'Básico';
                        const PlanIcon = PLAN_BADGES[plan]?.icon || Zap;
                        
                        return (
                          <React.Fragment key={b.id}>
                            <tr className={`hover:bg-indigo-500/5 transition-all group ${isInactive ? 'opacity-40 grayscale' : ''}`}>
                              <td className="px-6 py-5">
                                <p className="text-white font-black text-base tracking-tighter group-hover:text-indigo-300 transition-colors">{b.nombre}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-indigo-400 text-[9px] font-mono font-black uppercase tracking-tighter">COD: {b.codigo_edificio || '---'}</span>
                                  <span className="text-slate-500 text-[9px] font-mono opacity-50 uppercase tracking-tighter">ID: {b.id.substring(0,8)}...</span>
                                  <span className="text-slate-500 text-[9px] font-bold uppercase">{b.unidades || 0} UNIDADES</span>
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                {b.ultima_sincronizacion
                                  ? <div className="space-y-0.5">
                                      <p className="text-slate-200 font-bold text-xs">{new Date(b.ultima_sincronizacion).toLocaleDateString('es-ES')}</p>
                                      <p className="text-indigo-400 font-black text-[9px] uppercase tracking-widest">{new Date(b.ultima_sincronizacion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                  : <span className="text-slate-600 italic text-[10px] font-bold uppercase">Sin Actividad</span>}
                              </td>
                              <td className="px-6 py-5">
                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-700/50 ${PLAN_BADGES[plan]?.bg || 'bg-slate-500/10'}`}>
                                  <PlanIcon className={`w-3 h-3 ${PLAN_BADGES[plan]?.color || 'text-slate-400'}`} />
                                  <span className={`text-[10px] font-black uppercase tracking-widest ${PLAN_BADGES[plan]?.color || 'text-slate-400'}`}>{plan}</span>
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-slate-100 text-lg tracking-tighter">${(b.monthly_fee || 0).toLocaleString()}</span>
                                  {b.discount_pct > 0 && <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-black px-2 py-0.5 rounded-full">-{b.discount_pct}%</span>}
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                <select 
                                  value={status}
                                  onChange={(e) => handleStatusChange(b, e.target.value)}
                                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg border appearance-none cursor-pointer focus:outline-none transition-all ${STATUS_COLORS[status] || STATUS_COLORS['Prueba']}`}
                                >
                                  {Object.keys(STATUS_CYCLE).map(st => (
                                    <option key={st} value={st} className="bg-[#1e293b] text-white">{st}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => setExpandedId(expandedId === b.id ? null : b.id)} className="p-2 text-slate-400 hover:bg-slate-700 rounded-xl transition-all" title="Ver detalles">
                                    {expandedId === b.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </button>
                                  <button onClick={() => setEditingBuilding(b)} className="p-2 text-indigo-400 hover:bg-indigo-500/20 rounded-xl transition-all" title="Configuración SaaS">
                                    <Settings className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => router.push(`/dashboard?edificio=${b.id}`)} className="p-2 text-purple-400 hover:bg-purple-500/20 rounded-xl transition-all" title="Ver Dashboard">
                                    <Eye className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {expandedId === b.id && (
                              <tr className="bg-[#0f172a]/50 shadow-inner">
                                <td colSpan={6} className="px-10 py-10 border-x-4 border-indigo-600/20">
                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                                    <div className="space-y-3">
                                      <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest border-b border-indigo-500/10 pb-2">Información del Cliente</p>
                                      <div className="space-y-1">
                                        <p className="text-slate-500 text-[10px] uppercase font-bold">Fecha de Registro</p>
                                        <p className="text-slate-100 font-bold text-sm">{new Date(b.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                      </div>
                                      <div className="space-y-1 pt-2">
                                        <p className="text-slate-500 text-[10px] uppercase font-bold">Día de Facturación</p>
                                        <p className="text-slate-100 font-bold text-sm">Día {b.payment_day || 5} de cada mes</p>
                                      </div>
                                    </div>

                                    <div className="space-y-3">
                                      <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest border-b border-emerald-500/10 pb-2">Estatus Financiero</p>
                                      <div className="space-y-1">
                                        <p className="text-slate-500 text-[10px] uppercase font-bold">Último Pago</p>
                                        <div className="flex items-center gap-2">
                                          <p className="text-slate-100 font-bold text-sm">{b.last_payment_date ? new Date(b.last_payment_date).toLocaleDateString('es-ES') : 'SIN PAGOS'}</p>
                                          {b.last_payment_amount > 0 && <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-lg font-black text-[10px] tracking-tighter">${b.last_payment_amount}</span>}
                                        </div>
                                      </div>
                                      <div className="space-y-1 pt-2">
                                        <p className="text-slate-500 text-[10px] uppercase font-bold">Proyectado Mensual</p>
                                        <p className="text-slate-100 font-bold text-sm">${((b.monthly_fee || 0) * (1 - (b.discount_pct || 0)/100)).toFixed(2)}</p>
                                      </div>
                                    </div>

                                    <div className="space-y-3 col-span-2">
                                      <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest border-b border-indigo-500/10 pb-2 text-right">Bitácora y Notas</p>
                                      <div className="bg-slate-800/80 p-5 rounded-[1.5rem] border border-slate-700/50 h-24 overflow-y-auto">
                                        <p className="text-slate-400 text-xs italic leading-relaxed">{b.notes || 'Sin observaciones.'}</p>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      }))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeSection === 'planes' && (
            <div className="space-y-8 animate-in fade-in zoom-in duration-300">
               <div className="flex justify-between items-end">
                  <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Configurador de Planes SaaS</h2>
                    <p className="text-slate-400 text-sm mt-2">Personaliza la oferta comercial que ven los clientes en la página principal.</p>
                  </div>
                  <button 
                    onClick={handleSavePlanes}
                    disabled={savingPlanes}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-3 transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-50"
                  >
                    {savingPlanes ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Guardar Cambios Globales
                  </button>
               </div>

               {loadingPlanes ? (
                 <div className="py-20 text-center">
                    <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Cargando catálogo...</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {planesConfigs.map((plan, idx) => (
                      <div key={idx} className={`bg-[#1e293b] rounded-[2.5rem] border p-8 transition-all ${plan.is_popular ? 'border-indigo-500 shadow-2xl shadow-indigo-500/10' : 'border-slate-700/50'}`}>
                         <div className="flex justify-between items-start mb-6">
                            <input 
                              type="text" 
                              value={plan.name}
                              onChange={(e) => {
                                const newPlanes = [...planesConfigs];
                                newPlanes[idx].name = e.target.value;
                                setPlanesConfigs(newPlanes);
                              }}
                              className="bg-transparent border-b border-slate-700 text-white font-black text-xl uppercase tracking-tighter w-full focus:border-indigo-500 outline-none pb-1"
                            />
                         </div>

                         <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                               <div>
                                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Mensual ($)</label>
                                  <input 
                                    type="number"
                                    value={plan.price_monthly}
                                    onChange={(e) => {
                                      const newPlanes = [...planesConfigs];
                                      newPlanes[idx].price_monthly = Number(e.target.value);
                                      setPlanesConfigs(newPlanes);
                                    }}
                                    className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-white font-black text-sm"
                                  />
                               </div>
                               <div>
                                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Anual ($)</label>
                                  <input 
                                    type="number"
                                    value={plan.price_yearly}
                                    onChange={(e) => {
                                      const newPlanes = [...planesConfigs];
                                      newPlanes[idx].price_yearly = Number(e.target.value);
                                      setPlanesConfigs(newPlanes);
                                    }}
                                    className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-white font-black text-sm"
                                  />
                               </div>
                            </div>

                            <div>
                               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Límite Unidades (0=∞)</label>
                               <input 
                                 type="number"
                                 value={plan.unit_limit}
                                 onChange={(e) => {
                                   const newPlanes = [...planesConfigs];
                                   newPlanes[idx].unit_limit = Number(e.target.value);
                                   setPlanesConfigs(newPlanes);
                                 }}
                                 className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-white font-black text-sm"
                               />
                            </div>

                            <div>
                               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Características (JSON Array)</label>
                               <textarea 
                                 value={JSON.stringify(plan.features)}
                                 onChange={(e) => {
                                    try {
                                      const feats = JSON.parse(e.target.value);
                                      if (Array.isArray(feats)) {
                                        const newPlanes = [...planesConfigs];
                                        newPlanes[idx].features = feats;
                                        setPlanesConfigs(newPlanes);
                                      }
                                    } catch(e) {}
                                 }}
                                 rows={4}
                                 className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-slate-400 font-mono text-[10px] resize-none"
                               />
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                               <span className="text-[10px] font-bold text-slate-500 uppercase">¿Es Popular?</span>
                               <button 
                                 onClick={() => {
                                    const newPlanes = [...planesConfigs];
                                    newPlanes[idx].is_popular = !newPlanes[idx].is_popular;
                                    setPlanesConfigs(newPlanes);
                                 }}
                                 className={`w-10 h-5 rounded-full transition-all relative ${plan.is_popular ? 'bg-indigo-600' : 'bg-slate-700'}`}
                               >
                                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${plan.is_popular ? 'right-1' : 'left-1'}`} />
                               </button>
                            </div>
                         </div>
                      </div>
                    ))}
                 </div>
               )}
            </div>
          )}

          {(activeSection === 'administradoras' || activeSection === 'pagos' || activeSection === 'auditoria' || activeSection === 'dashboard') && (
            <div className="flex flex-col items-center justify-center py-40 bg-slate-800/20 rounded-[3rem] border-2 border-dashed border-slate-800 text-center">
               <AlertTriangle className="w-16 h-16 text-slate-700 mb-4" />
               <h3 className="text-slate-500 font-black uppercase tracking-widest">Módulo en Desarrollo</h3>
               <p className="text-slate-600 text-xs mt-2">Esta facilidad estará disponible próximamente en el Master Control.</p>
            </div>
          )}
        </div>

        {editingBuilding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#0f172a]/95 backdrop-blur-xl">
            <div className="bg-[#1e293b] w-full max-w-xl rounded-[2.5rem] border border-slate-700 shadow-2xl overflow-hidden">
              <div className="bg-indigo-600 px-10 py-8 flex justify-between items-center">
                <h3 className="text-white font-black uppercase tracking-tighter text-2xl italic">Suscripción SaaS</h3>
                <button onClick={() => setEditingBuilding(null)} className="text-white/50 hover:text-white transition-colors bg-white/10 p-2 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleUpdateBuilding} className="p-10 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tarifa Mensual ($)</label>
                    <input 
                      type="number" step="0.01"
                      value={editingBuilding.monthly_fee}
                      onChange={(e) => setEditingBuilding({...editingBuilding, monthly_fee: Number(e.target.value)})}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl px-6 py-4 text-white font-black text-lg focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Descuento (%)</label>
                    <input 
                      type="number" 
                      value={editingBuilding.discount_pct}
                      onChange={(e) => setEditingBuilding({...editingBuilding, discount_pct: Number(e.target.value)})}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl px-6 py-4 text-white font-black text-lg focus:outline-none focus:border-emerald-500 transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Plan Contratado</label>
                  <select 
                    value={editingBuilding.plan || 'Básico'}
                    onChange={(e) => setEditingBuilding({...editingBuilding, plan: e.target.value})}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl px-6 py-4 text-white font-black text-sm focus:outline-none focus:border-indigo-500 shadow-inner outline-none appearance-none"
                  >
                    <option value="Básico">Básico (hasta 30 unidades)</option>
                    <option value="Profesional">Profesional (hasta 50 unidades)</option>
                    <option value="Empresarial">Empresarial (Ilimitado)</option>
                    <option value="IA">Inteligencia Artificial (Ilimitado)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Código Edificio (6 dígitos)</label>
                    <input 
                      type="text" maxLength={6}
                      value={editingBuilding.codigo_edificio}
                      onChange={(e) => setEditingBuilding({...editingBuilding, codigo_edificio: e.target.value})}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl px-6 py-4 text-white font-black text-lg focus:outline-none focus:border-indigo-500 shadow-inner"
                      placeholder="000001"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Día Facturación</label>
                    <input 
                      type="number" min="1" max="31"
                      value={editingBuilding.payment_day}
                      onChange={(e) => setEditingBuilding({...editingBuilding, payment_day: Number(e.target.value)})}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl px-6 py-4 text-white font-black text-lg focus:outline-none focus:border-indigo-500 shadow-inner"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Notas Administrativas</label>
                  <textarea 
                    value={editingBuilding.notes}
                    onChange={(e) => setEditingBuilding({...editingBuilding, notes: e.target.value})}
                    rows={3}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-3xl px-6 py-5 text-white font-medium text-sm focus:outline-none focus:border-indigo-500 transition-all shadow-inner resize-none"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setEditingBuilding(null)} className="flex-1 bg-slate-700 text-white font-black uppercase text-[11px] py-5 rounded-[1.5rem] hover:bg-slate-600">Cancelar</button>
                  <button type="submit" className="flex-[1.5] bg-indigo-600 text-white font-black uppercase text-[11px] py-5 rounded-[1.5rem] hover:bg-indigo-500 flex items-center justify-center gap-3">
                    <Save className="w-4 h-4" /> Actualizar Core
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <footer className="p-8 text-center border-t border-slate-800 opacity-30 text-[10px] text-slate-700 font-black uppercase tracking-[0.5em]">
           Control de Operaciones SaaS — EdifiSaaS v1.0
        </footer>
      </main>
    </div>
  );
}
