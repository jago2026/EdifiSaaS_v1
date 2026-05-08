'use client';

import React, { useState, useEffect } from 'react';
import { formatNumber, formatDate } from '@/lib/formatters';
import { useRouter } from 'next/navigation';
import { 
  Building, Users, BarChart3, Settings, LogOut, Trash2, Edit, 
  RefreshCw, ChevronDown, ChevronUp, Plus, Save, X, Eye,
  Search, ShieldCheck, CreditCard, LayoutDashboard, Database,
  AlertTriangle, CheckCircle2, Clock, Star, Zap, Crown,
  TrendingUp, Wallet, History, UserCheck, MoreVertical, Download, Wrench
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
  'Esencial':    { icon: Zap, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  'Profesional': { icon: Star, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  'Premium':     { icon: Crown, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  'IA':          { icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
};

const getPlanBadge = (planName: string) => {
  const name = (planName || 'Esencial').toLowerCase();
  // Primero coincidencias exactas o prioritarias
  if (name === 'ia' || name.includes('inteligencia')) return { label: 'IA', ...PLAN_BADGES['IA'] };
  if (name.includes('premium') || name.includes('empresarial')) return { label: 'Premium', ...PLAN_BADGES['Premium'] };
  if (name.includes('profesional')) return { label: 'Profesional', ...PLAN_BADGES['Profesional'] };
  return { label: 'Esencial', ...PLAN_BADGES['Esencial'] };
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

type AdminSection = 'dashboard' | 'edificios' | 'administradoras' | 'pagos' | 'auditoria' | 'planes' | 'settings' | 'mantenimiento';

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
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);

  const loadMaintenanceMode = async () => {
    try {
      const res = await fetch('/api/admin/settings?key=maintenance_mode');
      const data = await res.json();
      if (res.ok) setMaintenanceMode(data.value || false);
    } catch (e) {}
  };

  const toggleMaintenanceMode = async () => {
    setLoadingSettings(true);
    try {
      const newVal = !maintenanceMode;
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'maintenance_mode', value: newVal })
      });
      if (res.ok) {
        setMaintenanceMode(newVal);
        setActionMsg(`✅ Modo mantenimiento ${newVal ? 'ACTIVADO' : 'DESACTIVADO'}`);
        setTimeout(() => setActionMsg(''), 3000);
      }
    } catch (e) {}
    setLoadingSettings(false);
  };

  // Master Dashboard Stats
  const [masterStats, setMasterStats] = useState<any>(null);
  const [loadingMaster, setLoadingMaster] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // SaaS Payments State
  const [saasPayments, setSaasPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [newPayment, setNewPayment] = useState({
    edificio_id: '',
    fecha_pago: new Date().toISOString().split('T')[0],
    monto: 0,
    metodo_pago: 'Transferencia',
    referencia: '',
    notas: ''
  });

  const loadMasterDashboard = async () => {
    setLoadingMaster(true);
    try {
      const res = await fetch('/api/admin/dashboard');
      const data = await res.json();
      if (res.ok) setMasterStats(data);
    } catch (e) {}
    setLoadingMaster(false);
  };

  const loadAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const res = await fetch('/api/admin/audit');
      const data = await res.json();
      if (res.ok) setAuditLogs(data.data || []);
    } catch (e) {}
    setLoadingAudit(false);
  };

  const loadSaasPayments = async () => {
    setLoadingPayments(true);
    try {
      const res = await fetch('/api/admin/pagos-saas');
      const data = await res.json();
      if (res.ok) setSaasPayments(data.data || []);
    } catch (e) {}
    setLoadingPayments(false);
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingPayments(true);
    try {
      const res = await fetch('/api/admin/pagos-saas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPayment)
      });
      if (res.ok) {
        setActionMsg('✅ Pago registrado correctamente');
        setShowPaymentModal(false);
        loadSaasPayments();
        loadEdificios();
        setTimeout(() => setActionMsg(''), 3000);
      }
    } catch (e) {}
    setLoadingPayments(false);
  };

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
    if (activeSection === 'edificios') loadEdificios();
    if (activeSection === 'administradoras') loadAdministradoras();
    if (activeSection === 'planes') loadPlanesConfigs();
    if (activeSection === 'settings') loadMaintenanceMode();
    if (activeSection === 'dashboard') loadMasterDashboard();
    if (activeSection === 'auditoria') loadAuditLogs();
    if (activeSection === 'pagos') loadSaasPayments();
  }, [activeSection]);
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

  const handlePlanChange = async (building: Edificio, newPlan: string) => {
    try {
      const res = await fetch('/api/admin/edificios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          id: building.id,
          data: { plan: newPlan }
        })
      });
      
      if (res.ok) {
        setActionMsg(`✅ Plan de "${building.nombre}" actualizado`);
        setTimeout(() => setActionMsg(''), 3000);
        loadEdificios();
      }
    } catch (err) {
      alert("Error al cambiar plan");
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

  const handleSaveAdministradora = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setLoadingAdmins(true);
    try {
      const res = await fetch('/api/admin/administradoras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: editingAdmin.id ? 'update' : 'create',
          id: editingAdmin.id,
          data: {
            nombre: editingAdmin.nombre,
            url_login: editingAdmin.url_login,
            url_recibos: editingAdmin.url_recibos,
            url_recibo_mes: editingAdmin.url_recibo_mes,
            url_egresos: editingAdmin.url_egresos,
            url_gastos: editingAdmin.url_gastos,
            url_balance: editingAdmin.url_balance,
            url_alicuotas: editingAdmin.url_alicuotas,
          }
        })
      });
      if (res.ok) {
        setActionMsg(`✅ Administradora guardada`);
        setEditingAdmin(null);
        loadAdministradoras();
        setTimeout(() => setActionMsg(''), 3000);
      }
    } catch (e) {}
    setLoadingAdmins(false);
  };

  const handleDeleteAdministradora = async (id: string) => {
    if (!confirm('¿Seguro que desea eliminar esta administradora?')) return;
    try {
      const res = await fetch('/api/admin/administradoras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id })
      });
      if (res.ok) {
        setActionMsg('✅ Administradora eliminada');
        loadAdministradoras();
        setTimeout(() => setActionMsg(''), 3000);
      }
    } catch (e) {}
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
              { id: 'mantenimiento', label: 'Mantenimiento', icon: Wrench },
              { id: 'settings',   label: 'Configuración', icon: ShieldCheck },
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
                        {['Edificio', 'Sincronización', 'Plan Contratado', 'Tarifa/mes', 'Trial / Vencimiento', 'Estado', 'Acciones']
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
                        const planBadge = getPlanBadge(b.plan);
                        const PlanIcon = planBadge.icon;
                        
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
                                      <p className="text-slate-200 font-bold text-xs">{formatDate(b.ultima_sincronizacion)}</p>
                                      <p className="text-indigo-400 font-black text-[9px] uppercase tracking-widest">{new Date(b.ultima_sincronizacion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                  : <span className="text-slate-600 italic text-[10px] font-bold uppercase">Sin Actividad</span>}
                              </td>
                              <td className="px-6 py-5">
                                <div className="relative group/plan">
                                  <select
                                    value={planBadge.label}
                                    onChange={(e) => handlePlanChange(b, e.target.value)}
                                    className={`appearance-none pl-8 pr-4 py-1.5 rounded-xl border border-slate-700/50 text-[10px] font-black uppercase tracking-widest cursor-pointer focus:outline-none transition-all ${planBadge.bg} ${planBadge.color} hover:brightness-110`}
                                  >
                                    <option value="Esencial">Esencial</option>
                                    <option value="Profesional">Profesional</option>
                                    <option value="Premium">Premium</option>
                                    <option value="IA">IA</option>
                                  </select>
                                  <PlanIcon className={`w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${planBadge.color}`} />
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-slate-100 text-lg tracking-tighter">${formatNumber(b.monthly_fee || 0)}</span>
                                  {b.discount_pct > 0 && <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-black px-2 py-0.5 rounded-full">-{b.discount_pct}%</span>}
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                {b.trial_end_date ? (
                                  <div className="flex flex-col">
                                    <span className={`text-[10px] font-black uppercase ${new Date(b.trial_end_date) < new Date() ? 'text-red-500' : 'text-amber-500'}`}>
                                      {formatDate(b.trial_end_date)}
                                    </span>
                                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">
                                      {new Date(b.trial_end_date) < new Date() ? 'VENCIDO' : 'EN PRUEBA'}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">PERMANENTE</span>
                                )}
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
                                        <p className="text-slate-100 font-bold text-sm">{formatDate(b.created_at)}</p>
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
                                          <p className="text-slate-100 font-bold text-sm">{b.last_payment_date ? formatDate(b.last_payment_date) : 'SIN PAGOS'}</p>
                                          {b.last_payment_amount > 0 && <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-lg font-black text-[10px] tracking-tighter">${b.last_payment_amount}</span>}
                                        </div>
                                      </div>
                                      <div className="space-y-1 pt-2">
                                        <p className="text-slate-500 text-[10px] uppercase font-bold">Proyectado Mensual</p>
                                        <p className="text-slate-100 font-bold text-sm">${formatNumber(((b.monthly_fee || 0) * (1 - (b.discount_pct || 0)/100)), 2)}</p>
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

          {activeSection === 'administradoras' && (
            <div className="space-y-8">
               <div className="flex justify-between items-center bg-[#1e293b] p-8 rounded-[2.5rem] border border-slate-700/50 shadow-xl">
                  <div>
                    <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">Administradoras Predefinidas</h2>
                    <p className="text-slate-500 text-xs font-bold mt-1">Configura las URLs de acceso para las integraciones</p>
                  </div>
                  <button 
                    onClick={() => setEditingAdmin({ nombre: '', url_login: '' })}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-3"
                  >
                    <Plus className="w-4 h-4" /> Nueva Administradora
                  </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {administradoras.map((admin) => (
                    <div key={admin.id} className="bg-[#1e293b] rounded-[2.5rem] border border-slate-700/50 p-8 hover:border-indigo-500/50 transition-all group">
                       <div className="flex justify-between items-start mb-6">
                          <h3 className="text-white font-black text-xl tracking-tight leading-tight">{admin.nombre}</h3>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => setEditingAdmin(admin)} className="p-2 text-slate-400 hover:text-indigo-400 bg-slate-800 rounded-lg"><Edit className="w-4 h-4" /></button>
                             <button onClick={() => handleDeleteAdministradora(admin.id)} className="p-2 text-slate-400 hover:text-red-400 bg-slate-800 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                          </div>
                       </div>
                       <div className="space-y-4">
                          <div className="bg-[#0f172a] rounded-2xl p-4 border border-slate-800">
                             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">URL Login</p>
                             <p className="text-slate-300 text-[11px] truncate font-mono">{admin.url_login || 'No configurada'}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                             <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-800 text-center">
                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Recibos</p>
                                <CheckCircle2 className={`w-3 h-3 mx-auto ${admin.url_recibos ? 'text-green-500' : 'text-slate-700'}`} />
                             </div>
                             <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-800 text-center">
                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Egresos</p>
                                <CheckCircle2 className={`w-3 h-3 mx-auto ${admin.url_egresos ? 'text-green-500' : 'text-slate-700'}`} />
                             </div>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeSection === 'settings' && (
            <div className="max-w-2xl mx-auto space-y-8">
               <div className="bg-[#1e293b] rounded-[3rem] border border-slate-700 shadow-2xl p-12 text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full -mr-32 -mt-32"></div>
                  <ShieldCheck className="w-20 h-20 text-indigo-500 mx-auto mb-6" />
                  <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic mb-4">Estado del Sistema</h2>
                  <p className="text-slate-400 text-sm mb-12">Control global de acceso a la plataforma para mantenimiento.</p>
                  
                  <div className="bg-[#0f172a] rounded-[2rem] p-10 border border-slate-800 flex flex-col items-center gap-6">
                     <div className="space-y-2">
                        <h3 className="text-white font-black uppercase tracking-widest text-xs">Modo Mantenimiento</h3>
                        <p className="text-slate-500 text-[10px]">Al activar esto, los usuarios verán un aviso de mantenimiento en lugar del login.</p>
                     </div>
                     
                     <button 
                       onClick={toggleMaintenanceMode}
                       disabled={loadingSettings}
                       className={`w-full py-6 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all shadow-2xl ${
                         maintenanceMode 
                         ? 'bg-red-600 text-white hover:bg-red-500 shadow-red-600/20' 
                         : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-600/20'
                       } disabled:opacity-50`}
                     >
                        {loadingSettings ? 'PROCESANDO...' : maintenanceMode ? 'DESACTIVAR MANTENIMIENTO' : 'ACTIVAR MANTENIMIENTO'}
                     </button>
                  </div>
               </div>
            </div>
          )}

          {activeSection === 'dashboard' && (
            <div className="space-y-10">
              {/* Master KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: 'Edificios Totales', value: masterStats?.totalEdificios || 0, icon: Building, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                  { label: 'Unidades SaaS', value: masterStats?.totalUnidades || 0, icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
                  { label: 'Ingresos Históricos', value: `$${formatNumber(masterStats?.totalIngresos || 0)}`, icon: Wallet, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                  { label: 'Conversión SaaS', value: `${Math.round(((masterStats?.statsStatus?.['Activo'] || 0) / (masterStats?.totalEdificios || 1)) * 100)}%`, icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-400/10' },
                ].map((kpi, idx) => (
                  <div key={idx} className="bg-[#1e293b] rounded-[2rem] p-8 border border-slate-700/50 shadow-xl flex items-center gap-6">
                    <div className={`${kpi.bg} p-4 rounded-2xl`}>
                      <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{kpi.label}</p>
                      <p className="text-2xl font-black text-white italic">{kpi.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Distribución de Planes */}
                <div className="bg-[#1e293b] rounded-[2.5rem] border border-slate-700/50 p-8 shadow-xl">
                  <h3 className="text-white font-black uppercase tracking-tighter italic text-xl mb-6">Planes Contratados</h3>
                  <div className="space-y-4">
                    {Object.entries(masterStats?.statsPlanes || {}).map(([plan, count]: [any, any]) => (
                      <div key={plan} className="flex items-center justify-between p-4 bg-[#0f172a] rounded-2xl border border-slate-800">
                        <div className="flex items-center gap-3">
                          <Zap className="w-4 h-4 text-indigo-500" />
                          <span className="text-white font-bold text-sm">{plan}</span>
                        </div>
                        <span className="bg-indigo-600 px-3 py-1 rounded-full text-white font-black text-[10px]">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Auditoría Reciente */}
                <div className="lg:col-span-2 bg-[#1e293b] rounded-[2.5rem] border border-slate-700/50 p-8 shadow-xl">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-white font-black uppercase tracking-tighter italic text-xl">Actividad Crítica</h3>
                    <button onClick={() => setActiveSection('auditoria')} className="text-indigo-400 font-black text-[10px] uppercase tracking-widest hover:text-indigo-300 transition-colors">Ver Todo →</button>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-slate-800">
                    <table className="w-full text-left">
                      <thead className="bg-[#0f172a] text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        <tr>
                          <th className="px-6 py-4">Fecha</th>
                          <th className="px-6 py-4">Edificio</th>
                          <th className="px-6 py-4">Operación</th>
                          <th className="px-6 py-4">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {masterStats?.recentAudit.map((log: any) => (
                          <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="px-6 py-4 text-slate-400 text-xs">{new Date(log.created_at).toLocaleString('es-ES')}</td>
                            <td className="px-6 py-4 text-white font-bold text-xs">{log.edificios?.nombre || 'SISTEMA'}</td>
                            <td className="px-6 py-4">
                              <span className="text-indigo-400 font-black text-[10px] uppercase tracking-widest">{log.operation}</span>
                              <p className="text-[10px] text-slate-500 truncate max-w-[150px]">{log.entity_type}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-[10px] font-black uppercase tracking-widest ${log.status === 'SUCCESS' ? 'text-emerald-500' : 'text-red-500'}`}>
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'pagos' && (
            <div className="space-y-8">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic">Control de Cobranza SaaS</h2>
                  <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-2">Monitoreo de suscripciones y facturación de edificios</p>
                </div>
                <button 
                  onClick={() => setShowPaymentModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/20 flex items-center gap-3"
                >
                  <Plus className="w-4 h-4" /> Registrar Pago SaaS
                </button>
              </div>

              <div className="bg-[#1e293b] rounded-[2.5rem] border border-slate-700/50 shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#0f172a] text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      <tr>
                        <th className="px-8 py-6">Fecha</th>
                        <th className="px-8 py-6">Edificio</th>
                        <th className="px-8 py-6">Monto</th>
                        <th className="px-8 py-6">Método / Ref</th>
                        <th className="px-8 py-6">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {saasPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-8 py-6">
                            <p className="text-white font-bold text-sm">{formatDate(p.fecha_pago)}</p>
                            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Registrado: {new Date(p.created_at).toLocaleDateString()}</p>
                          </td>
                          <td className="px-8 py-6 text-white font-black italic">{p.edificios?.nombre}</td>
                          <td className="px-8 py-6">
                            <span className="text-emerald-400 font-black text-xl italic">${formatNumber(p.monto)}</span>
                          </td>
                          <td className="px-8 py-6">
                            <p className="text-slate-300 font-bold text-xs uppercase tracking-widest">{p.metodo_pago}</p>
                            <p className="text-slate-500 text-[10px] font-mono">{p.referencia}</p>
                          </td>
                          <td className="px-8 py-6">
                            <span className="bg-emerald-500/10 text-emerald-500 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                              Verificado
                            </span>
                          </td>
                        </tr>
                      ))}
                      {saasPayments.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-8 py-20 text-center text-slate-600 font-black uppercase tracking-widest italic">No hay pagos registrados</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'auditoria' && (
            <div className="space-y-8">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic">Auditoría Global</h2>
                  <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-2">Log de operaciones críticas y trazabilidad del sistema</p>
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Buscar en logs..." 
                    className="bg-[#1e293b] border border-slate-700 rounded-2xl pl-12 pr-6 py-4 text-white font-bold text-xs focus:outline-none focus:border-indigo-500 transition-all w-80"
                  />
                </div>
              </div>

              <div className="bg-[#1e293b] rounded-[2.5rem] border border-slate-700/50 shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#0f172a] text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      <tr>
                        <th className="px-8 py-6">Fecha / IP</th>
                        <th className="px-8 py-6">Usuario / Edificio</th>
                        <th className="px-8 py-6">Operación</th>
                        <th className="px-8 py-6">Datos / Detalles</th>
                        <th className="px-8 py-6">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-8 py-6">
                            <p className="text-white font-bold text-xs">{new Date(log.created_at).toLocaleString('es-ES')}</p>
                            <p className="text-slate-500 text-[9px] font-mono">{log.ip_address}</p>
                          </td>
                          <td className="px-8 py-6">
                            <p className="text-slate-200 font-bold text-xs">{log.user_email}</p>
                            <p className="text-indigo-400 font-black text-[10px] uppercase italic">{log.edificios?.nombre || 'SISTEMA MASTER'}</p>
                          </td>
                          <td className="px-8 py-6">
                            <span className="bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">
                              {log.operation}
                            </span>
                            <p className="mt-1 text-slate-500 text-[9px] font-bold uppercase">{log.entity_type}</p>
                          </td>
                          <td className="px-8 py-6">
                            <div className="max-w-xs">
                              {log.data_after && (
                                <p className="text-[10px] text-slate-400 line-clamp-2 font-mono bg-black/20 p-2 rounded">
                                  {JSON.stringify(log.data_after)}
                                </p>
                              )}
                              {!log.data_after && <span className="text-slate-600 italic text-[10px]">Sin detalles extra</span>}
                            </div>
                          </td>
                          <td className="px-8 py-6 text-center">
                            <div className={`w-3 h-3 rounded-full mx-auto shadow-[0_0_10px_rgba(0,0,0,0.5)] ${log.status === 'SUCCESS' ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-red-500 shadow-red-500/50'}`}></div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'mantenimiento' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic">Mantenimiento y Respaldos</h2>
                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-2">Herramientas de exportación de datos y optimización del sistema</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-[#1e293b] rounded-[2.5rem] border border-slate-700/50 p-10 shadow-xl">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="bg-indigo-500/10 p-3 rounded-xl">
                      <Database className="w-6 h-6 text-indigo-500" />
                    </div>
                    <h3 className="text-white font-black uppercase tracking-tighter italic text-xl">Respaldos de Datos</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {[
                      { table: 'edificios', label: 'Maestro de Edificios' },
                      { table: 'pagos_recibos', label: 'Historial de Cobranza' },
                      { table: 'egresos', label: 'Historial de Egresos' },
                      { table: 'audit_logs', label: 'Logs de Auditoría' },
                      { table: 'usuarios', label: 'Base de Usuarios' },
                    ].map((item) => (
                      <button 
                        key={item.table}
                        onClick={async () => {
                          const res = await fetch(`/api/admin/tools/export?table=${item.table}`);
                          const data = await res.json();
                          const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `backup_${item.table}_${new Date().toISOString().split('T')[0]}.json`;
                          a.click();
                        }}
                        className="w-full flex items-center justify-between p-4 bg-[#0f172a] rounded-2xl border border-slate-800 hover:border-indigo-500/50 transition-all group"
                      >
                        <span className="text-slate-300 font-bold text-sm">{item.label}</span>
                        <Download className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-[#1e293b] rounded-[2.5rem] border border-slate-700/50 p-10 shadow-xl">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="bg-amber-500/10 p-3 rounded-xl">
                      <Wrench className="w-6 h-6 text-amber-500" />
                    </div>
                    <h3 className="text-white font-black uppercase tracking-tighter italic text-xl">Herramientas</h3>
                  </div>

                  <div className="space-y-6">
                    <div className="p-6 bg-amber-500/5 rounded-2xl border border-amber-500/10">
                      <h4 className="text-amber-400 font-black text-xs uppercase tracking-widest mb-2">Verificar Integridad</h4>
                      <p className="text-slate-500 text-[10px] mb-4">Escanea la base de datos en busca de huérfanos o registros duplicados.</p>
                      <button className="w-full py-3 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded-xl font-black text-[10px] uppercase tracking-widest border border-amber-500/20 transition-all">
                        Iniciar Escaneo
                      </button>
                    </div>

                    <div className="p-6 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                      <h4 className="text-blue-400 font-black text-xs uppercase tracking-widest mb-2">Logs de Errores</h4>
                      <p className="text-slate-500 text-[10px] mb-4">Ver logs detallados de la última ejecución del cron job global.</p>
                      <button className="w-full py-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-xl font-black text-[10px] uppercase tracking-widest border border-blue-500/20 transition-all">
                        Abrir Visor de Logs
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#0f172a]/95 backdrop-blur-xl">
            <div className="bg-[#1e293b] w-full max-w-xl rounded-[2.5rem] border border-slate-700 shadow-2xl overflow-hidden">
              <div className="bg-emerald-600 px-10 py-8 flex justify-between items-center text-white">
                <h3 className="font-black uppercase tracking-tighter text-2xl italic">Registrar Cobro SaaS</h3>
                <button onClick={() => setShowPaymentModal(false)} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleCreatePayment} className="p-10 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Edificio Cliente</label>
                  <select 
                    required
                    value={newPayment.edificio_id}
                    onChange={(e) => setNewPayment({...newPayment, edificio_id: e.target.value})}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl px-6 py-4 text-white font-bold text-sm focus:outline-none focus:border-emerald-500 transition-all"
                  >
                    <option value="">Selecciona edificio...</option>
                    {edificios.map(b => (
                      <option key={b.id} value={b.id}>{b.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fecha Pago</label>
                    <input 
                      type="date" required
                      value={newPayment.fecha_pago}
                      onChange={(e) => setNewPayment({...newPayment, fecha_pago: e.target.value})}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl px-6 py-4 text-white font-bold text-sm focus:outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Monto ($)</label>
                    <input 
                      type="number" step="0.01" required
                      value={newPayment.monto}
                      onChange={(e) => setNewPayment({...newPayment, monto: Number(e.target.value)})}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl px-6 py-4 text-white font-bold text-sm focus:outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Método</label>
                    <select 
                      value={newPayment.metodo_pago}
                      onChange={(e) => setNewPayment({...newPayment, metodo_pago: e.target.value})}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl px-6 py-4 text-white font-bold text-sm focus:outline-none focus:border-emerald-500 transition-all"
                    >
                      <option value="Transferencia">Transferencia</option>
                      <option value="Pago Móvil">Pago Móvil</option>
                      <option value="Zelle">Zelle</option>
                      <option value="Efectivo">Efectivo</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Referencia</label>
                    <input 
                      type="text" 
                      value={newPayment.referencia}
                      onChange={(e) => setNewPayment({...newPayment, referencia: e.target.value})}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl px-6 py-4 text-white font-bold text-sm focus:outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Notas Internas</label>
                  <textarea 
                    value={newPayment.notas}
                    onChange={(e) => setNewPayment({...newPayment, notas: e.target.value})}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl px-6 py-4 text-white font-bold text-xs focus:outline-none focus:border-emerald-500 transition-all h-20 resize-none"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={loadingPayments}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-6 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-emerald-600/20 disabled:opacity-50"
                >
                  {loadingPayments ? 'PROCESANDO...' : 'CONFIRMAR Y REGISTRAR PAGO'}
                </button>
              </form>
            </div>
          </div>
        )}

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
                    value={editingBuilding.plan || 'Esencial'}
                    onChange={(e) => setEditingBuilding({...editingBuilding, plan: e.target.value})}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl px-6 py-4 text-white font-black text-sm focus:outline-none focus:border-indigo-500 shadow-inner outline-none appearance-none"
                  >
                    <option value="Esencial">Esencial (hasta 30 unidades)</option>
                    <option value="Profesional">Profesional (hasta 50 unidades)</option>
                    <option value="Premium">Premium (Ilimitado)</option>
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

        {editingAdmin && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#0f172a]/95 backdrop-blur-xl">
            <div className="bg-[#1e293b] w-full max-w-4xl rounded-[2.5rem] border border-slate-700 shadow-2xl overflow-hidden">
              <div className="bg-indigo-600 px-10 py-8 flex justify-between items-center">
                <h3 className="text-white font-black uppercase tracking-tighter text-2xl italic">Configurar Administradora</h3>
                <button onClick={() => setEditingAdmin(null)} className="text-white/50 hover:text-white transition-colors bg-white/10 p-2 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleSaveAdministradora} className="p-10 space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nombre Completo</label>
                  <input 
                    type="text" required
                    value={editingAdmin.nombre}
                    onChange={(e) => setEditingAdmin({...editingAdmin, nombre: e.target.value})}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl px-6 py-4 text-white font-black text-lg focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">URL Login Principal</label>
                    <input 
                      type="text" 
                      value={editingAdmin.url_login}
                      onChange={(e) => setEditingAdmin({...editingAdmin, url_login: e.target.value})}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-slate-300 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">URL Recibos</label>
                    <input 
                      type="text" 
                      value={editingAdmin.url_recibos}
                      onChange={(e) => setEditingAdmin({...editingAdmin, url_recibos: e.target.value})}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-slate-300 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">URL Egresos</label>
                    <input 
                      type="text" 
                      value={editingAdmin.url_egresos}
                      onChange={(e) => setEditingAdmin({...editingAdmin, url_egresos: e.target.value})}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-slate-300 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">URL Gastos</label>
                    <input 
                      type="text" 
                      value={editingAdmin.url_gastos}
                      onChange={(e) => setEditingAdmin({...editingAdmin, url_gastos: e.target.value})}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-slate-300 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setEditingAdmin(null)} className="flex-1 bg-slate-700 text-white font-black uppercase text-[11px] py-5 rounded-[1.5rem] hover:bg-slate-600">Cancelar</button>
                  <button type="submit" disabled={loadingAdmins} className="flex-[1.5] bg-indigo-600 text-white font-black uppercase text-[11px] py-5 rounded-[1.5rem] hover:bg-indigo-500 flex items-center justify-center gap-3">
                    <Save className="w-4 h-4" /> {loadingAdmins ? 'GUARDANDO...' : 'GUARDAR CONFIGURACIÓN'}
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
