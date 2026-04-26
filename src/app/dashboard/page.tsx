"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ManualUsuario } from "./ManualUsuario";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, ComposedChart } from "recharts";

type Tab = "resumen" | "ingresos" | "movimientos" | "egresos" | "gastos" | "recibos" | "recibo" | "balance" | "alicuotas" | "alertas" | "edificio" | "configuracion" | "manual" | "kpis" | "informes" | "instrucciones" | "junta" | "pre-recibo" | "flujo-caja" | "planes";

function formatCurrency(amount: number | undefined | null, decimals: number = 2): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "-";
  return amount.toLocaleString("es-VE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatBs(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "-";
  return amount.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatUsd(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "-";
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function UpgradeCard({ title, feature, planRequired, onUpgrade }: { title: string, feature: string, planRequired: string, onUpgrade: () => void }) {
  return (
    <div className="relative overflow-hidden bg-white p-8 rounded-2xl border-2 border-dashed border-gray-200 text-center space-y-4">
      <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">🔒</div>
      <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto text-2xl">✨</div>
      <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">{title}</h3>
      <p className="text-gray-500 text-sm max-w-sm mx-auto">
        La funcionalidad de <span className="font-bold text-gray-700">{feature}</span> está disponible a partir del plan <span className="text-indigo-600 font-bold">{planRequired}</span>.
      </p>
      <button 
        onClick={onUpgrade}
        className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg uppercase text-xs"
      >
        Mejorar mi Plan
      </button>
    </div>
  );
}

interface Balance {
  id: string;
  fecha: string;
  saldo_anterior: number;
  cobranza_mes: number;
  gastos_facturados: number;
  saldo_disponible: number;
  total_por_cobrar: number;
  condominios_atrasados: number;
  condominios_sobrantes: number;
  fondo_reserva: number;
  fondo_prestaciones: number;
  fondo_trabajos_varios: number;
  ajuste_alicuota: number;
  fondo_intereses: number;
  fondo_diferencial_cambiario: number;
  saldo_reservas: number;
  recibos_mes: number;
  total_caja_y_cobrar: number;
  ajuste_pago_tiempo: number;
  fondo_reserva_mes_anterior: number;
  fondo_prestaciones_mes_anterior: number;
  fondo_trabajos_varios_mes_anterior: number;
  ajuste_alicuota_mes_anterior: number;
  fondo_intereses_mes_anterior: number;
  fondo_diferencial_mes_anterior: number;
  fondo_diferencial_ajuste: number;
  saldo_anterior_usd?: number;
  cobranza_mes_usd?: number;
  gastos_facturados_usd?: number;
  saldo_disponible_usd?: number;
  total_por_cobrar_usd?: number;
  fondo_reserva_usd?: number;
  fondo_prestaciones_usd?: number;
  fondo_trabajos_varios_usd?: number;
  fondo_intereses_usd?: number;
  fondo_diferencial_cambiario_usd?: number;
  tasa_bcv?: number;
}

interface Alicuota {
  id: string;
  unidad: string;
  propietario: string;
  alicuota: number;
  email1?: string;
  email2?: string;
  telefono1?: string;
  telefono2?: string;
  observaciones?: string;
}

interface LogItem {
  id: string;
  sourceType: 'alerta' | 'sync';
  tipo?: string;
  subtipo?: string;
  titulo?: string;
  descripcion: string;
  estado?: string;
  movimientos_nuevos?: number;
  error?: string;
  created_at: string;
}

interface Building {
  id: string;
  nombre: string;
  direccion: string;
  unidades: number;
  plan: string;
  admin_id: string | null;
  admin_secret: string | null;
  admin_nombre: string | null;
  url_login: string | null;
  url_recibos: string | null;
  url_recibo_mes: string | null;
  url_egresos: string | null;
  url_gastos: string | null;
  url_balance: string | null;
  cron_enabled?: boolean;
  cron_time?: string;
  cron_frequency?: string;
  ultima_sincronizacion: string | null;
  sync_recibos?: boolean;
  sync_egresos?: boolean;
  sync_gastos?: boolean;
  sync_alicuotas?: boolean;
  sync_balance?: boolean;
  email_junta?: string | null;
  onboarding_completed?: boolean;
  url_alicuotas?: string;
}

interface Movement {
  id: string;
  fecha: string;
  descripcion: string;
  monto: number;
  monto_usd?: number;
  tipo: string;
  unidad_apartamento?: string;
  unidad?: string;
  fuente?: string;
}

interface MovimientoManual {
  id: string;
  fecha_corte: string;
  saldo_inicial: number;
  egresos: number;
  ingresos: number;
  saldo_final: number;
  obs_egresos?: string;
  obs_ingresos?: string;
  tasa_bcv: number;
  saldo_final_usd: number;
  comparado: boolean;
  saldo_acumulado?: number; // Para el cálculo dinámico en el listado
}

interface Recibo {
  id: string;
  unidad: string;
  propietario: string;
  num_recibos: number;
  deuda: number;
  deuda_usd?: number;
  isTotal?: boolean;
}

interface Egreso {
  id: string;
  fecha: string;
  beneficiario: string;
  descripcion: string;
  monto: number;
  operacion: string;
  monto_usd?: number;
  monto_bs?: number;
  isTotal?: boolean;
}

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  isMember?: boolean;
  isAdmin?: boolean;
  nivelAcceso?: 'admin' | 'board' | 'viewer' | 'observador';
  requiereCambioClave?: boolean;
  isDemo?: boolean;
}

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
}

const maskEmail = (email: string) => {
  if (!email) return "";
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  if (user.length <= 4) return `${user[0]}****@${domain}`;
  return `${user.substring(0, 2)}****${user.substring(user.length - 2)}@${domain}`;
};

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("resumen");
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState<Building | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [recibos, setRecibos] = useState<Recibo[]>([]);
  const [loadingRecibos, setLoadingRecibos] = useState(false);
  const [movimientosDia, setMovimientosDia] = useState<any[]>([]);
  const [loadingMovimientosDia, setLoadingMovimientosDia] = useState(false);
  const [gastosSummary, setGastosSummary] = useState({ monto: 0, cantidad: 0 });
  const [egresos, setEgresos] = useState<Egreso[]>([]);
  const [loadingEgresos, setLoadingEgresos] = useState(false);
  const [gastos, setGastos] = useState<any[]>([]);
  const [loadingGastos, setLoadingGastos] = useState(false);
  const [egresosSummary, setEgresosSummary] = useState({ monto: 0, cantidad: 0 });
  const [ingresosSummary, setIngresosSummary] = useState({ monto: 0, cantidad: 0 });
  const [ingresosData, setIngresosData] = useState<any[]>([]);
  const [loadingIngresos, setLoadingIngresos] = useState(false);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [mesesBalance, setMesesBalance] = useState<string[]>([]);
  const [selectedMesBalance, setSelectedMesBalance] = useState<string>("");
  const [mesesEgresos, setMesesEgresos] = useState<string[]>([]);
  const [selectedMesEgresos, setSelectedMesEgresos] = useState<string>("");
  const [mesesGastos, setMesesGastos] = useState<string[]>([]);
  const [selectedMesGastos, setSelectedMesGastos] = useState<string>(new Date().toISOString().substring(0, 7));
  const [mesesRecibos, setMesesRecibos] = useState<string[]>([]);
  const [selectedMesRecibos, setSelectedMesRecibos] = useState<string>("");
  const [movementTypeFilter, setMovementTypeFilter] = useState<"todos" | "egresos" | "gastos" | "pagos">("todos");
  const [movimientosManual, setMovimientosManual] = useState<MovimientoManual[]>([]);
  const [manualFilter, setManualFilter] = useState<"todos" | "pendientes" | "ingresos" | "egresos" | "ambos">("todos");
  const [loadingManual, setLoadingManual] = useState(false);
  const [alicuotas, setAlicuotas] = useState<Alicuota[]>([]);
  const [loadingAlicuotas, setLoadingAlicuotas] = useState(false);
  const [administradoras, setAdministradoras] = useState<Administradora[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [alicuotasCount, setAlicuotasCount] = useState(0);
  const [alicuotaSum, setAlicuotaSum] = useState(0);
  const [alicuotaWarning, setAlicuotaWarning] = useState<any>(null);
  const [alicuotaTotalWarning, setAlicuotaTotalWarning] = useState<string | null>(null);
  const [showUnitsAlert, setShowUnitsAlert] = useState(false);
  const [kpisData, setKpisData] = useState<any>({ egresos: [], gastos: [], balances: [], movimientos: [] });
  const [loadingKpis, setLoadingKpis] = useState(false);
  const [junta, setJunta] = useState<any[]>([]);
  const [loadingJunta, setLoadingJunta] = useState(false);
  const [sincronizaciones, setSincronizaciones] = useState<any[]>([]);
  const [loadingSincronizaciones, setLoadingSincronizaciones] = useState(false);
  const [alertas, setAlertas] = useState<any[]>([]);
  const [loadingAlertas, setLoadingAlertas] = useState(false);
  const [tasaCambio, setTasaCambio] = useState<number>(45.50);
  const [tasaBCV, setTasaBCV] = useState({ dolar: 0, euro: 0, fecha: "" });
  const [loadingTasa, setLoadingTasa] = useState(false);
  const [selectedMes, setSelectedMes] = useState<string>("");
  const [planInfo, setPlanInfo] = useState<any>(null);
  const [selectedUnidad, setSelectedUnidad] = useState<string>("");
  const [reciboDetalle, setReciboDetalle] = useState<any[]>([]);
  const [loadingRecibo, setLoadingRecibo] = useState(false);
  const [reciboGeneral, setReciboGeneral] = useState<any[]>([]);
  const [loadingReciboGeneral, setLoadingReciboGeneral] = useState(false);
  const [syncMes, setSyncMes] = useState("");
  const [syncing, setSyncing] = useState(false);
  
  // Nuevos estados para gestión de miembros
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [newMiembro, setNewMiembro] = useState({ nombre: "", email: "", cargo: "Copropietario", nivelAcceso: "viewer" });
  const [reportType, setReportType] = useState("resumen");
  const [reportRange, setReportRange] = useState({ start: "", end: "" });
  const [planesAdmin, setPlanesAdmin] = useState<any[]>([]);
  const [loadingPlanesAdmin, setLoadingPlanesAdmin] = useState(false);
  const [savingPlanesAdmin, setSavingPlanesAdmin] = useState(false);

  const hasFeature = (feature: string) => {
    const plan = building?.plan || "Básico";
    if (feature === "export") return ["Profesional", "Empresarial", "IA"].includes(plan);
    if (feature === "audit") return ["Profesional", "Empresarial", "IA"].includes(plan);
    if (feature === "manual_email") return ["Profesional", "Empresarial", "IA"].includes(plan);
    return false;
  };

  const loadReciboGeneral = async (mesOverride?: string) => {
    if (!building?.id) return;
    setLoadingReciboGeneral(true);
    setReciboGeneral([]);
    try {
      const mes = mesOverride !== undefined ? mesOverride : (selectedMesRecibos || "");
      console.log("[UI] loadReciboGeneral called with mes:", mes);
      
      const tasaUrl = mes 
        ? `/api/tasa-bcv?fecha=${mes}-28` 
        : '/api/tasa-bcv';
      
      const [reciboRes, tasaRes] = await Promise.all([
        fetch(`/api/recibo-detalle?edificioId=${building.id}&unidad=GENERAL${mes ? `&mes=${mes}` : ""}`),
        fetch(tasaUrl)
      ]);
      
      const [reciboData, tasaData] = await Promise.all([reciboRes.json(), tasaRes.json()]);
      
      if (tasaData?.tasas?.dolar) {
        setTasaCambio(tasaData.tasas.dolar);
      }
      
      console.log("[UI] Response data:", reciboData);
      if (reciboRes.ok) {
        setReciboGeneral(reciboData.detalles || []);
        console.log("[UI] Set reciboGeneral:", reciboData.detalles?.length, "items");
      } else {
        console.error("[UI] Error response:", reciboData);
      }
    } catch (error) {
      console.error("[UI] Error loading general receipt:", error);
    } finally {
      setLoadingReciboGeneral(false);
    }
  };
  const [syncingMes, setSyncingMes] = useState(false);
  const [dataSummary, setDataSummary] = useState<any[]>([]);
  const [loadingDataSummary, setLoadingDataSummary] = useState(false);
  const [informeFecha, setInformeFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [informeData, setInformeData] = useState<any>(null);

  // Estados para Pre-Recibo Estimado
  const [preReciboItems, setPreReciboItems] = useState<any[]>([]);
  const [selectedPreReciboIds, setSelectedPreReciboIds] = useState<Set<string>>(new Set());
  const [loadingPreRecibo, setLoadingPreRecibo] = useState(false);

  const loadPreReciboData = async () => {
    if (!building?.id) return;
    setLoadingPreRecibo(true);
    try {
      const currentMonth = new Date().toISOString().substring(0, 7);
      
      // Consultar gastos, egresos y movimientos manuales del mes actual
      const [gastosRes, egresosRes, manualRes] = await Promise.all([
        fetch(`/api/gastos?edificioId=${building.id}&mes=${currentMonth}`),
        fetch(`/api/egresos?edificioId=${building.id}&mes=${currentMonth}`),
        fetch(`/api/movimientos-manual?edificioId=${building.id}`)
      ]);

      const [gastosD, egresosD, manualD] = await Promise.all([
        gastosRes.json(), egresosRes.json(), manualRes.json()
      ]);

      const items: any[] = [];
      
      // 1. Procesar Gastos (r=3)
      if (gastosRes.ok && gastosD.gastos) {
        gastosD.gastos.forEach((g: any) => {
          items.push({ id: `gas-${g.id}`, codigo: g.codigo || "999", descripcion: g.descripcion, monto: g.monto, tipo: 'gasto' });
        });
      }

      // 2. Procesar Egresos (r=21)
      if (egresosRes.ok && egresosD.egresos) {
        egresosD.egresos.forEach((e: any) => {
          // Solo si no está ya en gastos (para evitar duplicados si se cargan en ambos sitios)
          if (!items.find(i => i.descripcion === e.descripcion && i.monto === e.monto)) {
            items.push({ id: `egr-${e.id}`, codigo: e.codigo || "999", descripcion: `${e.beneficiario} - ${e.descripcion || ''}`, monto: e.monto, tipo: 'egreso' });
          }
        });
      }

      // 3. Procesar Manuales (No comparados)
      if (manualRes.ok && manualD.movimientos) {
        manualD.movimientos.filter((m: any) => !m.comparado && Number(m.egresos) > 0).forEach((m: any) => {
          items.push({ id: `man-${m.id}`, codigo: "MANUAL", descripcion: m.obs_egresos || "Gasto Manual", monto: Number(m.egresos), tipo: 'manual' });
        });
      }

      setPreReciboItems(items);
      // Seleccionar todos por defecto
      setSelectedPreReciboIds(new Set(items.map(i => i.id)));

    } catch (error) {
      console.error("Error loading pre-recibo data:", error);
    } finally {
      setLoadingPreRecibo(false);
    }
  };
  const loadAdminPlanes = async () => {
    setLoadingPlanesAdmin(true);
    try {
      const res = await fetch("/api/admin/planes");
      const data = await res.json();
      if (res.ok) {
        setPlanesAdmin(data.data || []);
      }
    } catch (error) {
      console.error("Error loading admin planes:", error);
    } finally {
      setLoadingPlanesAdmin(false);
    }
  };

  const saveAdminPlanes = async (planesToSave: any[]) => {
    setSavingPlanesAdmin(true);
    try {
      const res = await fetch("/api/admin/planes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planes: planesToSave }),
      });
      if (res.ok) {
        alert("Planes actualizados con éxito");
        loadAdminPlanes();
      } else {
        const data = await res.json();
        alert("Error: " + data.error);
      }
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setSavingPlanesAdmin(false);
    }
  };

  const loadDataSummary = async () => {
    if (!building?.id) return;
    setLoadingDataSummary(true);
    try {
      const res = await fetch(`/api/config/data-summary?edificioId=${building.id}`);
      const data = await res.json();
      if (res.ok) {
        setDataSummary(data.summary || []);
      }
    } catch (error) {
      console.error("Error loading data summary:", error);
    } finally {
      setLoadingDataSummary(false);
    }
  };

  useEffect(() => {
    if (activeTab === "configuracion" && building?.id) {
      loadDataSummary();
    }
  }, [activeTab, building?.id]);

  const deleteSync = async (id: string, mes?: string) => {
    if (!building?.id) return;
    const confirmMsg = mes 
      ? `¿Estás seguro de eliminar TODOS los datos de ${mes}? Esto borrará permanentemente recibos, gastos, egresos y balances de este mes en la base de datos.`
      : "¿Estás seguro de eliminar este registro?";

    if (!confirm(confirmMsg)) return;

    try {
      // Usar id = 'BLOCK' si solo queremos borrar por mes sin un ID de log específico
      const url = `/api/sincronizaciones?id=${id || 'BLOCK'}${mes ? `&mes=${mes}` : ""}&edificioId=${building.id}`;
      const res = await fetch(url, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setSyncMessage(`✅ Datos de ${mes || 'bloque'} eliminados correctamente`);
        loadDataSummary();
        loadSincronizaciones();
        if (mes) {
          loadRecibos();
          loadEgresos();
          loadGastos();
          loadBalance();
        }
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Error de red: ${error.message}`);
    }
  };

  const [loadingInforme, setLoadingInforme] = useState(false);
  const [gastosRecurrentes, setGastosRecurrentes] = useState<any[]>([]);
  const [loadingGastosRecurrentes, setLoadingGastosRecurrentes] = useState(false);
  const [evolucionRecurrentes, setEvolucionRecurrentes] = useState<any[]>([]);
  const [currencyRecurrentes, setCurrencyRecurrentes] = useState<"BS" | "USD">("BS");
  const [newRecurrente, setNewRecurrente] = useState({ codigo: "", descripcion: "", categoria: "otros" });
  const [addingRecurrente, setAddingRecurrente] = useState(false);
  const [auditAlerts, setAuditAlerts] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const loadAudit = async () => {
    if (!building?.id) return;
    setLoadingAudit(true);
    try {
      const res = await fetch(`/api/informes?action=auditoria&edificioId=${building.id}`);
      const data = await res.json();
      if (res.ok) {
        setAuditAlerts(data.data || []);
      }
    } catch (error) {
      console.error("Error loading audit:", error);
    } finally {
      setLoadingAudit(false);
    }
  };

  const addManualRecurrente = async () => {
    if (!building?.id || !newRecurrente.codigo || !newRecurrente.descripcion) return;
    setAddingRecurrente(true);
    try {
      const res = await fetch("/api/informes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_recurrentes",
          edificioId: building.id,
          data: { 
            codigo: newRecurrente.codigo, 
            descripcion: newRecurrente.descripcion, 
            activo: true, 
            categoria: newRecurrente.categoria 
          }
        })
      });
      if (res.ok) {
        setNewRecurrente({ codigo: "", descripcion: "", categoria: "otros" });
        loadGastosRecurrentes();
      }
    } catch (error) {
      console.error("Error adding manual recurrente:", error);
    } finally {
      setAddingRecurrente(false);
    }
  };


  const loadInforme = async () => {
    if (!building?.id || !informeFecha) return;
    setLoadingInforme(true);
    setInformeData(null);
    try {
      const res = await fetch(`/api/informes?action=resumen_fecha&edificioId=${building.id}&fecha=${informeFecha}`);
      const data = await res.json();
      if (res.ok) {
        setInformeData(data.data || "not_found");
      }
    } catch (error) {
      console.error("Error loading informe:", error);
    } finally {
      setLoadingInforme(false);
    }
  };

  const loadGastosRecurrentes = async () => {
    if (!building?.id) return;
    setLoadingGastosRecurrentes(true);
    try {
      const res = await fetch(`/api/informes?action=gastos_recurrentes&edificioId=${building.id}`);
      const data = await res.json();
      if (res.ok) {
        setGastosRecurrentes(data.data || []);
      }
    } catch (error) {
      console.error("Error loading gastos recurrentes:", error);
    } finally {
      setLoadingGastosRecurrentes(false);
    }
  };

  const loadEvolucionRecurrentes = async () => {
    if (!building?.id) return;
    try {
      const res = await fetch(`/api/informes?action=evolucion_recurrentes&edificioId=${building.id}`);
      const data = await res.json();
      if (res.ok) {
        setEvolucionRecurrentes(data.data || []);
      }
    } catch (error) {
      console.error("Error loading evolution:", error);
    }
  };

  const updateRecurrente = async (codigo: string, descripcion: string, activo: boolean, categoria: string) => {
    if (!building?.id) return;

    console.log(`Updating recurrente: ${codigo}, activo: ${activo}, categoria: ${categoria}`);

    // Guardar estado previo por si falla
    const previousGastos = [...gastosRecurrentes];

    // Actualización optimista local
    setGastosRecurrentes(prev =>
      prev.map(g => g.codigo === codigo ? { ...g, activo, categoria } : g)
    );

    try {
      const res = await fetch("/api/informes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_recurrentes",
          edificioId: building.id,
          data: { codigo, descripcion, activo, categoria }
        })
      });

      if (!res.ok) {
        throw new Error("Failed to update on server");
      }

      console.log("Update successful on server");
      // Opcionalmente recargar, pero con cuidado de no sobreescribir el estado local muy rápido
      // loadGastosRecurrentes(); 
    } catch (error) {
      console.error("Error updating recurrente:", error);
      // Revertir en caso de error
      setGastosRecurrentes(previousGastos);
    }
  };  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [editConfig, setEditConfig] = useState({
    admin_id: "",
    admin_secret: "",
    admin_nombre: "La Ideal C.A.",
    url_login: "https://admlaideal.com.ve/condlin.php?r=1",
    url_recibos: "https://admlaideal.com.ve/condlin.php?r=5",
    url_recibo_mes: "https://admlaideal.com.ve/condlin.php?r=4",
    url_egresos: "https://admlaideal.com.ve/condlin.php?r=21",
    url_gastos: "https://admlaideal.com.ve/condlin.php?r=3",
    url_balance: "https://admlaideal.com.ve/condlin.php?r=2",
    cron_enabled: true,
    cron_time: "05:00",
    cron_frequency: "diaria",
    email_junta: "",
    sync_recibos: true,
    sync_egresos: true,
    sync_gastos: true,
    sync_alicuotas: true,
    sync_balance: true,
    url_alicuotas: "",
    unidades: 0,
  });

  useEffect(() => {
    if (building) {
      setEditConfig(prev => ({
        ...prev,
        admin_id: building.admin_id || "",
        admin_secret: building.admin_secret || "",
        admin_nombre: building.admin_nombre || "La Ideal C.A.",
        url_login: building.url_login || "",
        url_recibos: building.url_recibos || "",
        url_recibo_mes: building.url_recibo_mes || (building.admin_nombre === "La Ideal C.A." ? "https://admlaideal.com.ve/condlin.php?r=4" : ""),
        url_egresos: building.url_egresos || "",
        url_gastos: building.url_gastos || "",
        url_balance: building.url_balance || "",
        url_alicuotas: building.url_alicuotas || "",
        cron_enabled: building.cron_enabled !== false,
        cron_time: building.cron_time || "05:00",
        cron_frequency: building.cron_frequency || "diaria",
        email_junta: building.email_junta || "",
        sync_recibos: building.sync_recibos !== false,
        sync_egresos: building.sync_egresos !== false,
        sync_gastos: building.sync_gastos !== false,
        sync_alicuotas: building.sync_alicuotas !== false,
        sync_balance: building.sync_balance !== false,
        unidades: building.unidades || 0,
      }));
    }
  }, [building]);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);

  const completeOnboarding = async () => {
    if (!building?.id) return;
    try {
      await fetch("/api/config/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edificioId: building.id }),
      });
      setShowOnboarding(false);
    } catch (error) {
      console.error("Error completing onboarding:", error);
      setShowOnboarding(false);
    }
  };

  const sendEmailToJunta = async (testMode: boolean = false) => {
    if (!building?.id) return;
    setSendingEmail(true);
    setEmailMessage("");
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edificioId: building.id, testMode }),
      });
      const data = await res.json();
      if (res.ok) {
        setEmailMessage(data.message);
      } else {
        setEmailMessage(data.error || "Error al enviar");
      }
    } catch (error: any) {
      setEmailMessage(error.message);
    } finally {
      setSendingEmail(false);
    }
  };

  const sendWhatsAppReport = async () => {
    if (!building?.id) return;
    setSendingEmail(true);
    setEmailMessage("");
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edificioId: building.id, action: "whatsapp_report" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al enviar reporte");
      setEmailMessage("✅ Reporte WhatsApp enviado por email con éxito");
    } catch (error: any) {
      setEmailMessage(`❌ Error: ${error.message}`);
    } finally {
      setSendingEmail(false);
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/dashboard");
        const data = await res.json();
        
        if (!res.ok || data.error) {
          router.push("/login");
          return;
        }
        
        setBuilding(data.building);
        setUser(data.user);
        setPlanInfo(data.planInfo);
        if (data.user?.requiereCambioClave) {
          setShowPasswordChange(true);
        }
        if (data.building && !data.building.onboarding_completed && data.user?.isAdmin && !data.user?.isDemo) {
          setShowOnboarding(true);
        }
      } catch (error) {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    
    async function loadAdministradoras() {
      setLoadingAdmins(true);
      try {
        const res = await fetch("/api/admin/administradoras");
        const data = await res.json();
        if (res.ok) {
          setAdministradoras(data.data || []);
        }
      } catch (error) {
        console.error("Error loading administradoras:", error);
      } finally {
        setLoadingAdmins(false);
      }
    }

    fetchData();
    loadAdministradoras();
  }, [router]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    
    if (newPassword.length < 6) {
      setPasswordError("La clave debe tener al menos 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Las claves no coinciden");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/junta/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: user?.email,
          newPassword 
        }),
      });
      
      const data = await res.json();
      if (res.ok) {
        setShowPasswordChange(false);
        setSyncMessage("✅ Clave actualizada correctamente");
        if (user) setUser({ ...user, requiereCambioClave: false });
      } else {
        setPasswordError(data.error || "Error al actualizar");
      }
    } catch (error: any) {
      setPasswordError(error.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (activeTab === "pre-recibo" && building?.id) {
      loadPreReciboData();
      loadAlicuotas();
    }
  }, [activeTab, building?.id]);

  const sendPreReciboEmail = async () => {
    if (!building?.id || preReciboItems.length === 0) return;
    
    setSendingEmail(true);
    setEmailMessage("");
    
    // Preparar datos para el borrador
    const selectedItems = preReciboItems.filter(i => selectedPreReciboIds.has(i.id));
    const totalGastosComunes = selectedItems.reduce((sum, i) => sum + i.monto, 0);
    
    // Agrupar por alícuotas
    const dist: any = {};
    alicuotas.forEach(a => {
      const val = Number(a.alicuota);
      if (!dist[val]) dist[val] = { alicuota: val, count: 0 };
      dist[val].count++;
    });

    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          edificioId: building.id, 
          action: "send_pre_receipt",
          payload: {
            mes: new Date().toISOString().substring(0, 7),
            items: selectedItems,
            totalGastosComunes,
            alicuotas: Object.values(dist),
            tasaDolar: tasaBCV.dolar
          }
        }),
      });
      
      const data = await res.json();
      if (res.ok) {
        setEmailMessage("✅ Borrador de recibo enviado por email exitosamente");
      } else {
        setEmailMessage(`❌ Error: ${data.error}`);
      }
    } catch (error: any) {
      setEmailMessage(`❌ Error: ${error.message}`);
    } finally {
      setSendingEmail(false);
    }
  };

  const sendCashFlowEmail = async () => {
    if (!building?.id) return;
    setSendingEmail(true);
    setEmailMessage("");
    
    try {
      const today = new Date();
      const monthStr = today.toISOString().substring(0, 7);
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      
      const rows = [];
      let currentSaldo = balance?.saldo_anterior || 0;
      let grandTotalIng = 0;
      let grandTotalEgr = 0;
      let daysWithMovement = 0;
      let maxIng = { dia: 0, monto: 0 };
      let maxEgr = { dia: 0, monto: 0 };

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${monthStr}-${d.toString().padStart(2, '0')}`;
        const dayMovs = kpisData.movimientos?.filter((m: any) => m.fecha === dateStr) || [];
        const dayIng = dayMovs.filter((m: any) => m.tipo === 'ingreso').reduce((sum: number, m: any) => sum + m.monto, 0);
        const dayEgr = dayMovs.filter((m: any) => m.tipo === 'egreso').reduce((sum: number, m: any) => sum + m.monto, 0);
        
        const cobranza = dayMovs.filter((m: any) => m.tipo === 'ingreso' && m.fuente !== 'manual').reduce((sum: number, m: any) => sum + m.monto, 0);
        const operativos = dayMovs.filter((m: any) => m.tipo === 'egreso' && m.fuente !== 'manual').reduce((sum: number, m: any) => sum + m.monto, 0);

        const saldoInicial = currentSaldo;
        currentSaldo = saldoInicial + dayIng - dayEgr;
        
        if (dayIng > 0 || dayEgr > 0) {
           daysWithMovement++;
           if (dayIng > maxIng.monto) maxIng = { dia: d, monto: dayIng };
           if (dayEgr > maxEgr.monto) maxEgr = { dia: d, monto: dayEgr };
        }
        
        grandTotalIng += dayIng;
        grandTotalEgr += dayEgr;

        rows.push({
          dia: d,
          saldoInicial,
          cobranza,
          otrosIng: dayIng - cobranza,
          totalIng: dayIng,
          operativos,
          otrosEgr: dayEgr - operativos,
          totalEgr: dayEgr,
          saldoFinal: currentSaldo
        });
      }

      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          edificioId: building.id, 
          action: "send_cash_flow",
          payload: {
            mes: new Date().toLocaleString('es-VE', { month: 'long', year: 'numeric' }),
            rows,
            summary: {
              daysWithMovement,
              totalIng: grandTotalIng,
              totalEgr: grandTotalEgr,
              balance: grandTotalIng - grandTotalEgr,
              maxIngDia: maxIng.dia,
              maxIngMonto: maxIng.monto,
              maxEgrDia: maxEgr.dia,
              maxEgrMonto: maxEgr.monto
            }
          }
        }),
      });
      
      const data = await res.json();
      if (res.ok) setEmailMessage("✅ Reporte de Flujo de Efectivo enviado con éxito");
      else throw new Error(data.error);
    } catch (error: any) {
      setEmailMessage(`❌ Error: ${error.message}`);
    } finally {
      setSendingEmail(false);
    }
  };

  useEffect(() => {
    if (activeTab === "resumen" && building?.id) {
      loadRecibos();
      loadMovimientosDia();
      loadBalance();
    }
    if (building?.id) {
      loadMovements();
      loadGastosSummary();
      loadEgresosSummary();
      loadIngresosSummary();
      loadRecibos();
      loadBalance();
      loadAlicuotas();
      loadMovimientosDia();
    }
    loadTasaBCV();
  }, [building?.id]);

  const loadMovements = async () => {
    if (!building?.id) return;
    setLoadingMovements(true);
    try {
      const today = new Date();
      const currentMes = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const res = await fetch(`/api/movimientos-all?edificioId=${building.id}&mes=${currentMes}`);
      const data = await res.json();
      if (res.ok && data.movimientos) {
        setMovements(data.movimientos);
      }
    } catch (error) {
      console.error("Error loading movements:", error);
    } finally {
      setLoadingMovements(false);
    }
  };

  useEffect(() => {
    if (activeTab === "resumen" && building?.id) {
      loadRecibos();
      loadMovimientosDia();
      loadBalance();
    }
    if (activeTab === "ingresos" && building?.id) {
      loadIngresosData();
    }
    if (activeTab === "movimientos" && building?.id) {
      loadMovements();
      loadMovimientosDia();
    }
    if (activeTab === "recibos" && building?.id) {
      loadRecibos();
      loadMovimientosDia();
    }
    if (activeTab === "recibo" && building?.id) {
      loadRecibos();
      setTimeout(() => loadReciboGeneral(), 100);
    }
    if (activeTab === "egresos" && building?.id) {
      loadEgresos();
    }
    if (activeTab === "gastos" && building?.id) {
      loadGastos();
    }
    if (activeTab === "balance" && building?.id) {
      loadBalance();
    }
    if (activeTab === "alicuotas" && building?.id) {
      loadAlicuotas();
    }
    if (activeTab === "manual" && building?.id) {
      loadMovimientosManual();
    }
    if (activeTab === "kpis" && building?.id) {
      loadKpis();
    }
    if (activeTab === "informes" && building?.id) {
      loadInforme();
      loadGastosRecurrentes();
      loadEvolucionRecurrentes();
      loadAudit();
    }
    if (activeTab === "junta" && building?.id) {
      loadJunta();
    }
    if (activeTab === "flujo-caja" && building?.id) {
      loadMovimientosDia();
    }
    if (activeTab === "alertas" && building?.id) {
      loadSincronizaciones();
    }
    if (activeTab === "planes") {
      loadAdminPlanes();
    }
  }, [activeTab, building?.id]);

  const loadRecibos = async (mesOverride?: string) => {
    if (!building?.id) return;
    setLoadingRecibos(true);
    setRecibos([]); // Limpiar estado previo
    try {
      const url = new URL(`/api/recibos`, window.location.origin);
      url.searchParams.append("edificioId", building.id);
      
      const mes = mesOverride !== undefined ? mesOverride : selectedMesRecibos;
      if (mes) url.searchParams.append("mes", mes);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (res.ok) {
        setRecibos(data.recibos || []);
        if (data.mesesDisponibles) {
          setMesesRecibos(data.mesesDisponibles);
        }
      }
    } catch (error) {
      console.error("Error loading recibos:", error);
    } finally {
      setLoadingRecibos(false);
    }
  };

  const loadMovimientosDia = async () => {
    if (!building?.id) return;
    setLoadingMovimientosDia(true);
    try {
      const res = await fetch(`/api/movimientos-dia?edificioId=${building.id}&dias=30`);
      const data = await res.json();
      if (res.ok) {
        // Usar los campos que devuelve la API
        const movimientos = data.movimientos || [];
        const pagos = data.pagos || [];
        const egresos = data.egresos || [];
        const gastos = data.gastos || [];

        // Crear mapa para agrupar movimientos por fecha (para la tabla)
        const cashFlowMap = new Map();

        // Procesar movimientos_dia
        (movimientos || []).forEach((m: any) => {
          const fecha = m.detectado_en ? m.detectado_en.split('T')[0] : m.fecha;
          if (!fecha) return;
          if (!cashFlowMap.has(fecha)) cashFlowMap.set(fecha, { fecha, ingresos: 0, egresos: 0 });
          const entry = cashFlowMap.get(fecha);
          if (m.tipo === 'recibo') {
            entry.ingresos += Number(m.monto || 0);
          } else {
            entry.egresos += Number(m.monto || 0);
          }
        });

        // Procesar pagos_recibos (ingresos)
        (pagos || []).forEach((p: any) => {
          const fecha = p.fecha_pago;
          if (!fecha) return;
          if (!cashFlowMap.has(fecha)) cashFlowMap.set(fecha, { fecha, ingresos: 0, egresos: 0 });
          cashFlowMap.get(fecha).ingresos += Number(p.monto || 0);
        });

        // Procesar egresos (egresos)
        (egresos || []).forEach((e: any) => {
          const fecha = e.fecha;
          if (!fecha) return;
          if (!cashFlowMap.has(fecha)) cashFlowMap.set(fecha, { fecha, ingresos: 0, egresos: 0 });
          cashFlowMap.get(fecha).egresos += Number(e.monto || 0);
        });

        // Procesar gastos (egresos)
        (gastos || []).forEach((g: any) => {
          const fecha = g.fecha;
          if (!fecha) return;
          if (!cashFlowMap.has(fecha)) cashFlowMap.set(fecha, { fecha, ingresos: 0, egresos: 0 });
          cashFlowMap.get(fecha).egresos += Number(g.monto || 0);
        });

        // Convertir mapa a array ordenado por fecha
        const cashFlow = Array.from(cashFlowMap.values()).sort((a: any, b: any) => a.fecha.localeCompare(b.fecha));

        // FILTRAR ESTRICTAMENTE PARA EL DÍA DE HOY (Local del sistema)
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

        const flujo = [
          ...movimientos.map((m: any) => ({ 
            ...m, 
            tipo: m.tipo === 'recibo' ? 'recibo' : 'egreso',
            descripcion: (m.descripcion || (m.tipo === 'recibo' ? 'Pago Detectado' : 'Egreso Detectado')) + (m.referencia ? ` (Ref: ${m.referencia})` : ''),
            fecha_iso: m.detectado_en ? m.detectado_en.split('T')[0] : m.fecha
          })),
          ...pagos.map((p: any) => ({ 
            ...p, 
            tipo: 'recibo', 
            descripcion: `Apto. ${p.unidad || 'S/N'} - Pago Recibo ${p.mes || ''}`.trim(),
            fecha_iso: p.fecha_pago
          })),
          ...egresos.map((e: any) => ({ 
            ...e, 
            tipo: 'egreso', 
            descripcion: `${e.beneficiario || ''} - ${e.descripcion || 'Egreso'} ${e.nro_documento ? `(Doc: ${e.nro_documento})` : ''}`.trim().replace(/^ - /, ''),
            fecha_iso: e.fecha
          })),
          ...gastos.map((g: any) => ({ 
            ...g, 
            tipo: 'gasto', 
            descripcion: g.descripcion || 'Gasto registrado',
            fecha_iso: g.fecha
          }))
        ].filter(item => item.fecha_iso === todayStr);

        setMovimientosDia(flujo);
        // Actualizar cashFlow con formato correcto para la tabla
        setKpisData((prev: any) => ({ ...prev, cashFlow: cashFlow }));
      }
    } catch (error) {
      console.error("Error loading movimientos dia:", error);
    } finally {
      setLoadingMovimientosDia(false);
    }
  };

  const loadGastosSummary = async () => {
    if (!building?.id) return;
    try {
      const res = await fetch(`/api/gastos-summary?edificioId=${building.id}`);
      const data = await res.json();
      if (res.ok) {
        setGastosSummary(data);
        // Pre-cargar los meses disponibles para el combo de gastos
        const gRes = await fetch(`/api/gastos?edificioId=${building.id}`);
        const gData = await gRes.json();
        if (gRes.ok && gData.mesesDisponibles) {
          setMesesGastos(gData.mesesDisponibles);
        }
      }
    } catch (error) {
      console.error("Error loading gastos summary:", error);
    }
  };

  const loadEgresosSummary = async () => {
    if (!building?.id) return;
    try {
      const res = await fetch(`/api/egresos-summary?edificioId=${building.id}`);
      const data = await res.json();
      if (res.ok) {
        setEgresosSummary(data);
      }
    } catch (error) {
      console.error("Error loading egresos summary:", error);
    }
  };

  const loadIngresosSummary = async () => {
    if (!building?.id) return;
    try {
      const res = await fetch(`/api/ingresos-summary?edificioId=${building.id}`);
      const data = await res.json();
      if (res.ok) {
        setIngresosSummary(data);
      }
    } catch (error) {
      console.error("Error loading ingresos summary:", error);
    }
  };

  const loadIngresosData = async () => {
    if (!building?.id) return;
    setLoadingIngresos(true);
    try {
      const res = await fetch(`/api/ingresos?edificioId=${building.id}`);
      const data = await res.json();
      if (res.ok && data.pagos) {
        setIngresosData(data.pagos);
      }
    } catch (error) {
      console.error("Error loading ingresos data:", error);
    } finally {
      setLoadingIngresos(false);
    }
  };

  const loadBalance = async (mesOverride?: string) => {
    if (!building?.id) return;
    setLoadingBalance(true);
    setBalance(null); // Limpiar estado previo
    try {
      const url = new URL(`/api/balance`, window.location.origin);
      url.searchParams.append("edificioId", building.id);
      
      const mes = mesOverride !== undefined ? mesOverride : selectedMesBalance;
      if (mes) url.searchParams.append("mes", mes);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (res.ok) {
        setBalance(data.balance || null);
        if (data.mesesDisponibles) {
          setMesesBalance(data.mesesDisponibles);
        }
      }
    } catch (error) {
      console.error("Error loading balance:", error);
    } finally {
      setLoadingBalance(false);
    }
  };

  const loadMovimientosManual = async () => {
    if (!building?.id) return;
    setLoadingManual(true);
    try {
      const res = await fetch(`/api/movimientos-manual?edificioId=${building.id}`);
      const data = await res.json();
      if (res.ok && data.movimientos) {
        // Calcular saldo acumulado de forma dinámica
        // El saldo acumulado se calcula sumando el resultado de cada fila (más antiguos a más nuevos)
        // Usamos fecha_corte e id (o created_at) como tie-breaker para orden estable
        const sorted = [...data.movimientos].sort((a: any, b: any) => {
          if (a.fecha_corte !== b.fecha_corte) {
            return a.fecha_corte.localeCompare(b.fecha_corte);
          }
          return a.id.localeCompare(b.id);
        });
        
        let currentRunningBalance = 0;
        const processed = sorted.map((m: any) => {
          // El saldo final de la fila es inicial - egresos + ingresos
          const saldoFinalFila = (Number(m.saldo_inicial) || 0) - (Number(m.egresos) || 0) + (Number(m.ingresos) || 0);
          // El saldo acumulado es la suma progresiva de los saldos finales
          currentRunningBalance += saldoFinalFila;
          return { 
            ...m, 
            saldo_final: saldoFinalFila, 
            saldo_acumulado: currentRunningBalance, 
            computed_saldo_final: saldoFinalFila 
          };
        });
        setMovimientosManual(processed.reverse());
      }
    } catch (error) {
      console.error("Error loading manual movements:", error);
    } finally {
      setLoadingManual(false);
    }
  };

  const loadKpis = async () => {
    if (!building?.id) return;
    setLoadingKpis(true);
    try {
      const res = await fetch(`/api/kpis?edificioId=${building.id}`);
      const data = await res.json();
      if (res.ok) {
        // Actualizar solo los campos KPI que no afectan el flujo de caja
        const { cashFlow, movimientos, ...kpiData } = data;
        setKpisData((prev: any) => ({ ...prev, ...kpiData }));
        // Cargar movimientos que también actualiza cashFlow
        await loadMovimientosDia();
      }
    } catch (error) {
      console.error("Error loading KPIs:", error);
    } finally {
      setLoadingKpis(false);
    }
  };

  const loadJunta = async () => {
    if (!building?.id) return;
    setLoadingJunta(true);
    try {
      const res = await fetch(`/api/junta?edificioId=${building.id}`);
      const data = await res.json();
      if (res.ok && data.miembros) {
        setJunta(data.miembros);
      }
    } catch (error) {
      console.error("Error loading junta:", error);
    } finally {
      setLoadingJunta(false);
    }
  };

  const loadAlicuotas = async () => {
    if (!building?.id) return;
    setLoadingAlicuotas(true);
    try {
      const res = await fetch(`/api/alicuotas?edificioId=${building.id}`);
      const data = await res.json();
      if (res.ok && data.alicuotas) {
        setAlicuotas(data.alicuotas);
        setAlicuotasCount(data.count);
        setAlicuotaSum(data.alicuotaSum || 0);
        setAlicuotaWarning(data.validationWarning || null);
        
        // Task 1: Check if sum deviates by more than 2% from 100%
        const sum = data.alicuotaSum || 0;
        if (data.count > 0 && (sum < 98 || sum > 102)) {
          setAlicuotaTotalWarning(`⚠️ La suma de alícuotas es ${sum.toFixed(2)}%, lo cual se desvía más de 2% del 100% esperado. Por favor verifica la cantidad de unidades.`);
          setShowUnitsAlert(true);
        } else {
          setAlicuotaTotalWarning(null);
          setShowUnitsAlert(false);
        }
      }
    } catch (error) {
      console.error("Error loading alicuotas:", error);
    } finally {
      setLoadingAlicuotas(false);
    }
  };

  const loadSincronizaciones = async () => {
    if (!building?.id) return;
    setLoadingSincronizaciones(true);
    setLoadingAlertas(true);
    try {
      const [resSinc, resAlert] = await Promise.all([
        fetch(`/api/sincronizaciones?edificioId=${building.id}`),
        fetch(`/api/alertas?edificioId=${building.id}`)
      ]);
      
      const dataSinc = await resSinc.json();
      if (resSinc.ok && dataSinc.sincronizaciones) {
        setSincronizaciones(dataSinc.sincronizaciones);
      }
      
      const dataAlert = await resAlert.json();
      if (resAlert.ok && dataAlert.alertas) {
        setAlertas(dataAlert.alertas);
      }
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoadingSincronizaciones(false);
      setLoadingAlertas(false);
    }
  };

  const updateAlicuota = async (id: string, field: string, value: string) => {
    try {
      const res = await fetch(`/api/alicuotas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (res.ok) {
        setAlicuotas(alicuotas.map(a => a.id === id ? { ...a, [field]: value } : a));
      }
    } catch (error) {
      console.error("Error updating alicuota:", error);
    }
  };

  const updateMovimientoManual = async (id: string, field: string, value: any) => {
    try {
      const movimiento = movimientosManual.find((m: any) => m.id === id);
      if (!movimiento) return;
      
      const newValues: any = { ...movimiento, [field]: value };
      
      if (field === "saldo_inicial" || field === "egresos" || field === "ingresos" || field === "tasa_bcv") {
        const saldoInicial = field === "saldo_inicial" ? Number(value) : Number(movimiento.saldo_inicial) || 0;
        const egresos = field === "egresos" ? Number(value) : Number(movimiento.egresos) || 0;
        const ingresos = field === "ingresos" ? Number(value) : Number(movimiento.ingresos) || 0;
        const tasaBcv = field === "tasa_bcv" ? Number(value) : Number(movimiento.tasa_bcv) || tasaBCV.dolar || 45.50;
        
        newValues.saldo_final = saldoInicial - egresos + ingresos;
        newValues.saldo_final_usd = tasaBcv > 0 ? newValues.saldo_final / tasaBcv : 0;
      }

      const res = await fetch(`/api/movimientos-manual/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newValues),
      });
      const data = await res.json();
      if (res.ok) {
        // Recargar para recalcular saldos acumulados de toda la tabla
        loadMovimientosManual();
      }
    } catch (error) {
      console.error("Error updating movimiento:", error);
    }
  };

  const createMovimientoManual = async () => {
    if (!building?.id) return;
    try {
      const res = await fetch("/api/movimientos-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          edificio_id: building.id,
          fecha_corte: new Date().toISOString().split("T")[0],
          saldo_inicial: 0,
          egresos: 0,
          ingresos: 0,
          saldo_final: 0,
          tasa_bcv: tasaBCV.dolar || 45.50,
        }),
      });
      const data = await res.json();
      if (res.ok && data.movimiento) {
        loadMovimientosManual();
      }
    } catch (error) {
      console.error("Error creating movimiento:", error);
    }
  };

  const deleteMovimientoManual = async (id: string) => {
    if (!confirm("¿Eliminar este registro?")) return;
    try {
      const res = await fetch(`/api/movimientos-manual/${id}`, { method: "DELETE" });
      if (res.ok) {
        loadMovimientosManual();
      }
    } catch (error) {
      console.error("Error deleting movimiento:", error);
    }
  };

  const addMiembro = async () => {
    if (!building?.id) return;
    if (!newMiembro.email || !newMiembro.nombre) {
      alert("Por favor complete nombre y email");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/junta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          edificio_id: building.id, 
          email: newMiembro.email, 
          nombre: newMiembro.nombre, 
          cargo: newMiembro.cargo,
          nivel_acceso: newMiembro.nivelAcceso 
        }),
      });
      
      if (res.ok) {
        setSyncMessage("✅ Miembro invitado exitosamente. Se le ha enviado un email con su clave temporal.");
        setNewMiembro({ nombre: "", email: "", cargo: "Copropietario", nivelAcceso: "viewer" });
        loadJunta();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error}`);
      }
    } catch (error: any) {
      console.error("Error adding miembro:", error);
    } finally {
      setSaving(false);
    }
  };

  const deleteMiembro = async (id: string) => {
    if (!confirm("¿Eliminar este miembro de junta?")) return;
    try {
      const res = await fetch(`/api/junta/${id}`, { method: "DELETE" });
      if (res.ok) {
        setJunta(junta.filter((m: any) => m.id !== id));
      }
    } catch (error) {
      console.error("Error deleting miembro:", error);
    }
  };

  const loadTasaBCV = async () => {
    setLoadingTasa(true);
    try {
      const res = await fetch("/api/tasa-bcv");
      const data = await res.json();
      if (res.ok && data.tasas) {
        setTasaBCV(data.tasas);
      }
    } catch (error) {
      console.error("Error loading tasa BCV:", error);
    } finally {
      setLoadingTasa(false);
    }
  };

  const loadEgresos = async (mesOverride?: string) => {
    if (!building?.id) return;
    setLoadingEgresos(true);
    setEgresos([]); // Limpiar estado previo
    try {
      const url = new URL(`/api/egresos`, window.location.origin);
      url.searchParams.append("edificioId", building.id);
      const mes = mesOverride !== undefined ? mesOverride : selectedMesEgresos;
      if (mes) url.searchParams.append("mes", mes);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (res.ok) {
        setEgresos(data.egresos || []);
        if (data.mesesDisponibles) {
          setMesesEgresos(data.mesesDisponibles);
        }
      }
    } catch (error) {
      console.error("Error loading egresos:", error);
    } finally {
      setLoadingEgresos(false);
    }
  };

  const loadGastos = async (mesOverride?: string) => {
    if (!building?.id) return;
    setLoadingGastos(true);
    setGastos([]); // Limpiar estado previo
    try {
      const url = new URL(`/api/gastos`, window.location.origin);
      url.searchParams.append("edificioId", building.id);
      const mes = mesOverride !== undefined ? mesOverride : selectedMesGastos;
      if (mes) url.searchParams.append("mes", mes);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (res.ok) {
        setGastos(data.gastos || []);
        if (data.mesesDisponibles) {
          setMesesGastos(data.mesesDisponibles);
        }
      }
    } catch (error) {
      console.error("Error loading gastos:", error);
    } finally {
      setLoadingGastos(false);
    }
  };

  const updateAdminAndUrls = (adminName: string) => {
    if (adminName === "Otra") {
      setEditConfig(prev => ({ ...prev, admin_nombre: "Otra" }));
      return;
    }

    const selected = administradoras.find(a => a.nombre === adminName);
    
    if (selected) {
      setEditConfig(prev => ({
        ...prev,
        admin_nombre: selected.nombre,
        url_login: selected.url_login || prev.url_login,
        url_recibos: selected.url_recibos || prev.url_recibos,
        url_recibo_mes: selected.url_recibo_mes || prev.url_recibo_mes,
        url_egresos: selected.url_egresos || prev.url_egresos,
        url_gastos: selected.url_gastos || prev.url_gastos,
        url_balance: selected.url_balance || prev.url_balance,
        url_alicuotas: selected.url_alicuotas || prev.url_alicuotas,
      }));
    } else {
      setEditConfig(prev => ({ ...prev, admin_nombre: adminName }));
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    setSyncMessage("");
    console.log("Config being saved:", editConfig);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editConfig,
          userId: user?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al guardar");
      }
      setBuilding(data.building);
      setSyncMessage("✅ Configuración guardada satisfactoriamente");
      // Task 1: Re-validate if units changed
      loadAlicuotas();
      setTimeout(() => setActiveTab("resumen"), 1500);
    } catch (error: any) {
      setSyncMessage(`❌ Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage("");
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: user?.id,
          sync_recibos: editConfig.sync_recibos,
          sync_egresos: editConfig.sync_egresos,
          sync_gastos: editConfig.sync_gastos,
          sync_alicuotas: editConfig.sync_alicuotas,
          sync_balance: editConfig.sync_balance
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al sincronizar");
      }
      setSyncMessage(data.message || "Sincronización completada");
      if (data.stats) {
        loadMovements();
        loadGastosSummary();
        loadEgresosSummary();
        loadIngresosSummary();
        loadRecibos();
        loadBalance();
        loadSincronizaciones();
      }
    } catch (error: any) {
      setSyncMessage(error.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncMes = async () => {
    if (!syncMes) {
      alert("Selecciona un mes primero");
      return;
    }
    setSyncingMes(true);
    setSyncMessage("");
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: user?.id, 
          mes: syncMes,
          sync_recibos: editConfig.sync_recibos,
          sync_egresos: editConfig.sync_egresos,
          sync_gastos: editConfig.sync_gastos,
          sync_alicuotas: editConfig.sync_alicuotas,
          sync_balance: editConfig.sync_balance
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al sincronizar");
      }
      setSyncMessage(`✅ Sincronización realizada y descargados los datos de ${syncMes} satisfactoriamente`);
      if (data.stats) {
        loadMovements();
        loadEgresos();
        loadRecibos();
        loadReciboGeneral();
        loadSincronizaciones();
        loadBalance();
        loadAlicuotas();
      }
    } catch (error: any) {
      setSyncMessage(`❌ Error en sincronización: ${error.message}`);
    } finally {
      setSyncingMes(false);
    }
  };

  const handleMaintenance = async () => {
    if (!building?.id) return;
    setMaintenanceLoading(true);
    setMaintenanceMessage("Iniciando mantenimiento de tablas...");
    try {
      const res = await fetch("/api/config/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edificioId: building.id })
      });
      const data = await res.json();
      if (res.ok) {
        setMaintenanceMessage(`✅ ${data.message || "Mantenimiento completado. Se ha enviado el reporte por email."}`);
      } else {
        setMaintenanceMessage(`❌ Error: ${data.error || "Fallo en mantenimiento"}`);
      }
    } catch (error: any) {
      setMaintenanceMessage(`❌ Error de red: ${error.message}`);
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setSaving(true);
    setSyncMessage("Probando conexión...");
    try {
      const res = await fetch("/api/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          password: editConfig.admin_secret,
          urlLogin: editConfig.url_login,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncMessage(`✅ ${data.message || "Conexión exitosa"}`);
      } else {
        setSyncMessage(`❌ Error: ${data.error || "No se pudo conectar"}`);
      }
    } catch (error: any) {
      setSyncMessage(`❌ Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Cargando...</div>
      </div>
    );
  }

  const userInitial = user?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || "U";
  const hasIntegration = building?.admin_secret;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* SIDEBAR - Solo Desktop (lg+) */}
      <aside className="hidden lg:flex flex-col w-72 bg-indigo-950 text-white sticky top-0 h-screen shadow-2xl z-[60]">
        <div className="p-6 border-b border-indigo-900/50 flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-indigo-900 font-black text-xl">E</span>
          </div>
          <div>
            <div className="font-black text-lg tracking-tighter leading-none">EdifiSaaS</div>
            <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1">Control Financiero</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
          {/* GRUPO: TABLERO */}
          <div>
            <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-3 ml-2">Tablero Principal</div>
            <div className="space-y-1">
              <button onClick={() => setActiveTab("resumen")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'resumen' ? 'bg-white text-indigo-950 shadow-lg' : 'hover:bg-white/10 text-indigo-100'}`}>
                <span className="text-lg">📊</span> Resumen Ejecutivo
              </button>
              <button onClick={() => setActiveTab("kpis")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'kpis' ? 'bg-white text-indigo-950 shadow-lg' : 'hover:bg-white/10 text-indigo-100'}`}>
                <span className="text-lg">📈</span> Indicadores (KPIs)
              </button>
              <button onClick={() => setActiveTab("alertas")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'alertas' ? 'bg-white text-indigo-950 shadow-lg' : 'hover:bg-white/10 text-indigo-100'}`}>
                <span className="text-lg">📢</span> Alertas y Cambios
              </button>
            </div>
          </div>

          {/* GRUPO: FINANZAS */}
          <div>
            <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-3 ml-2">Finanzas (Caja/Banco)</div>
            <div className="space-y-1">
              <button onClick={() => setActiveTab("movimientos")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'movimientos' ? 'bg-white text-indigo-950 shadow-lg' : 'hover:bg-white/10 text-indigo-100'}`}>
                <span className="text-lg">🔄</span> Movimientos Consolidados
              </button>
              <button onClick={() => setActiveTab("flujo-caja")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'flujo-caja' ? 'bg-white text-indigo-950 shadow-lg' : 'hover:bg-white/10 text-indigo-100'}`}>
                <span className="text-lg">📊</span> Flujo de Caja Diario
              </button>
              <button onClick={() => setActiveTab("ingresos")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'ingresos' ? 'bg-white text-indigo-950 shadow-lg' : 'hover:bg-white/10 text-indigo-100'}`}>
                <span className="text-lg">💰</span> Ingresos (Cobranza)
              </button>
              <button onClick={() => setActiveTab("egresos")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'egresos' ? 'bg-white text-indigo-950 shadow-lg' : 'hover:bg-white/10 text-indigo-100'}`}>
                <span className="text-lg">🧾</span> Egresos (Pagos)
              </button>
              <button onClick={() => setActiveTab("manual")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'manual' ? 'bg-white text-indigo-950 shadow-lg' : 'hover:bg-white/10 text-indigo-100'}`}>
                <span className="text-lg">📝</span> Ing/Egr Manual (Caja)
              </button>
              <button onClick={() => setActiveTab("balance")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'balance' ? 'bg-white text-indigo-950 shadow-lg' : 'hover:bg-white/10 text-indigo-100'}`}>
                <span className="text-lg">⚖️</span> Balance Financiero
              </button>
            </div>
          </div>

          {/* GRUPO: COBRANZA */}
          <div>
            <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-3 ml-2">Recibos y Deudas</div>
            <div className="space-y-1">
              <button onClick={() => setActiveTab("recibos")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'recibos' ? 'bg-white text-indigo-950 shadow-lg' : 'hover:bg-white/10 text-indigo-100'}`}>
                <span className="text-lg">👥</span> Deudas por Unidad
              </button>
              <button onClick={() => setActiveTab("recibo")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'recibo' ? 'bg-white text-indigo-950 shadow-lg' : 'hover:bg-white/10 text-indigo-100'}`}>
                <span className="text-lg">📄</span> Detalle Recibo Mes
              </button>
              <button onClick={() => setActiveTab("pre-recibo")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'pre-recibo' ? 'bg-white text-indigo-950 shadow-lg' : 'hover:bg-white/10 text-indigo-100'}`}>
                <span className="text-lg">📝</span> Pre-Recibo Estimado
              </button>
              <button onClick={() => setActiveTab("gastos")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'gastos' ? 'bg-white text-indigo-950 shadow-lg' : 'hover:bg-white/10 text-indigo-100'}`}>
                <span className="text-lg">🛠️</span> Gastos (Próx. Recibo)
              </button>
              <button onClick={() => setActiveTab("alicuotas")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'alicuotas' ? 'bg-white text-indigo-950 shadow-lg' : 'hover:bg-white/10 text-indigo-100'}`}>
                <span className="text-lg">📐</span> Alicuotas
              </button>
            </div>
          </div>

          {/* GRUPO: GESTION */}
          <div>
            <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-3 ml-2">Gestión y Reportes</div>
            <div className="space-y-1">
              <button onClick={() => setActiveTab("informes")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'informes' ? 'bg-white text-indigo-950 shadow-lg' : 'hover:bg-white/10 text-indigo-100'}`}>
                <span className="text-lg">📅</span> Generar Informes
              </button>
              <button onClick={() => setActiveTab("junta")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'junta' ? 'bg-white text-indigo-950 shadow-lg' : 'hover:bg-white/10 text-indigo-100'}`}>
                <span className="text-lg">🛡️</span> Junta y Permisos
              </button>
              <button onClick={() => setActiveTab("configuracion")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'configuracion' ? 'bg-white text-indigo-950 shadow-lg' : 'hover:bg-white/10 text-indigo-100'}`}>
                <span className="text-lg">⚙️</span> Configuración
              </button>
              <button onClick={() => setActiveTab("instrucciones")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'instrucciones' ? 'bg-white text-indigo-950 shadow-lg' : 'hover:bg-white/10 text-indigo-100'}`}>
                <span className="text-lg">📖</span> Ayuda / Manual
              </button>
              <button onClick={() => setActiveTab("planes")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'planes' ? 'bg-white text-indigo-950 shadow-lg' : 'hover:bg-white/10 text-indigo-100'}`}>
                <span className="text-lg">🏷️</span> Mi Suscripción
              </button>
            </div>
          </div>
        </nav>

        {planInfo && (
          <div className="p-4 mx-4 mb-4 bg-white/10 rounded-2xl border border-white/20">
            <div className="text-[10px] font-black text-indigo-400 uppercase mb-1">Plan Actual</div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">{planInfo.name}</span>
              <span className="text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded font-black uppercase">Activo</span>
            </div>
            {planInfo.name === 'Básico' && (
              <button 
                onClick={() => setActiveTab("planes")}
                className="w-full mt-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-amber-950 rounded-lg text-[10px] font-black uppercase transition-colors"
              >
                ⚡ Mejorar Plan
              </button>
            )}
          </div>
        )}

        <div className="p-4 border-t border-indigo-900/50 bg-indigo-950">
          <Link href="/logout" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/20 text-red-200 transition-all font-bold text-xs uppercase tracking-widest">
            <span>🚪</span> Cerrar Sesión
          </Link>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {user?.isDemo && (
          <div className="bg-amber-100 border-b border-amber-200 px-6 py-2 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2 text-amber-800 text-xs font-bold uppercase tracking-wider">
              <span>⚠️</span>
              MODO DEMOSTRACIÓN: Estás visualizando datos reales de un edificio pero Demo por privacidad.
            </div>
            <div className="text-[10px] text-amber-700 font-bold">SOLO LECTURA</div>
          </div>
        )}
        <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
          <div className="mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Botón de hamburguesa visible solo en mobile (<lg) */}
              <div className="lg:hidden w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">E</span>
              </div>
              <h1 className="text-base font-black text-gray-800 uppercase tracking-tighter truncate max-w-[200px] sm:max-w-md">
                {building?.nombre || "Cargando..."}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              {/* Tasa BCV y Sincro - Solo Desktop */}
              <div className="hidden xl:flex items-center gap-6 mr-6 border-r pr-6 border-gray-100">
                <div className="text-[10px] text-gray-500 font-bold uppercase">
                  {building?.ultima_sincronizacion 
                    ? `Sincro: ${new Date(building.ultima_sincronizacion).toLocaleString("es-VE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`
                    : "Sin sincronizar"}
                </div>
                <button onClick={loadTasaBCV} className="text-[10px] font-black text-green-700 uppercase bg-green-50 px-2 py-1 rounded border border-green-100 hover:bg-green-100 transition-colors">
                  Tasa BCV: Bs. {formatBs(tasaBCV.dolar)}
                </button>
                <button
                  onClick={handleSync}
                  disabled={syncing || !hasIntegration}
                  className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm ${
                    syncing 
                    ? "bg-indigo-100 text-indigo-400 cursor-not-allowed" 
                    : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100 active:transform active:scale-95"
                  }`}
                >
                  <span className={syncing ? "animate-spin" : ""}>🔄</span>
                  {syncing ? "Sincronizando..." : "Sincronizar Ahora"}
                </button>
              </div>

              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-gray-900">{user?.first_name} {user?.last_name}</div>
                <div className="text-[9px] font-black text-blue-600 uppercase tracking-widest">
                   {user?.isAdmin ? '🛠️ Administrador' : user?.nivelAcceso === 'board' ? '📝 Miembro Junta' : '👁️ Copropietario'}
                </div>
              </div>
              
              <button 
                className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>

              <div className="hidden lg:flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-xs border border-indigo-200 shadow-sm">
                  {userInitial}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Menu Overlay */}
          {mobileMenuOpen && (
            <div className="lg:hidden bg-white border-t p-4 shadow-2xl space-y-2 animate-in slide-in-from-top duration-300">
              <div className="text-[10px] font-black text-gray-400 uppercase mb-3 px-2 tracking-widest border-b pb-2">Menú Completo</div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => {setActiveTab("resumen"); setMobileMenuOpen(false);}} className={`text-left px-4 py-3 rounded-xl text-xs font-bold ${activeTab === 'resumen' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600'}`}>📊 Resumen</button>
                <button onClick={() => {setActiveTab("kpis"); setMobileMenuOpen(false);}} className={`text-left px-4 py-3 rounded-xl text-xs font-bold ${activeTab === 'kpis' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600'}`}>📈 KPIs</button>
                <button onClick={() => {setActiveTab("pre-recibo"); setMobileMenuOpen(false);}} className={`text-left px-4 py-3 rounded-xl text-xs font-bold ${activeTab === 'pre-recibo' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600'}`}>📝 Pre-Recibo</button>
                <button onClick={() => {setActiveTab("movimientos"); setMobileMenuOpen(false);}} className={`text-left px-4 py-3 rounded-xl text-xs font-bold ${activeTab === 'movimientos' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600'}`}>🔄 Movimientos</button>
                <button onClick={() => {setActiveTab("flujo-caja"); setMobileMenuOpen(false);}} className={`text-left px-4 py-3 rounded-xl text-xs font-bold ${activeTab === 'flujo-caja' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600'}`}>📊 Flujo Caja</button>
                <button onClick={() => {setActiveTab("ingresos"); setMobileMenuOpen(false);}} className={`text-left px-4 py-3 rounded-xl text-xs font-bold ${activeTab === 'ingresos' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600'}`}>💰 Ingresos</button>
                <button onClick={() => {setActiveTab("egresos"); setMobileMenuOpen(false);}} className={`text-left px-4 py-3 rounded-xl text-xs font-bold ${activeTab === 'egresos' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600'}`}>🧾 Egresos</button>
                <button onClick={() => {setActiveTab("recibos"); setMobileMenuOpen(false);}} className={`text-left px-4 py-3 rounded-xl text-xs font-bold ${activeTab === 'recibos' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600'}`}>👥 Recibos</button>
                <button onClick={() => {setActiveTab("balance"); setMobileMenuOpen(false);}} className={`text-left px-4 py-3 rounded-xl text-xs font-bold ${activeTab === 'balance' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600'}`}>⚖️ Balance</button>
                <button onClick={() => {setActiveTab("configuracion"); setMobileMenuOpen(false);}} className={`text-left px-4 py-3 rounded-xl text-xs font-bold ${activeTab === 'configuracion' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-blue-600'}`}>⚙️ Config</button>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl mt-4">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Tasa BCV: Bs. {formatBs(tasaBCV.dolar)}</span>
                <Link href="/logout" className="text-red-500 font-black text-[10px] uppercase tracking-widest">Cerrar Sesión</Link>
              </div>
            </div>
          )}
        </header>

        <div className="p-4 lg:p-8 w-full">
          {/* Botones de navegación móviles simplificados (Solo visibles en < lg) */}
          <div className="flex gap-2 mb-6 lg:hidden overflow-x-auto pb-2 scrollbar-hide">
            <button onClick={() => setActiveTab("resumen")} className={`flex-shrink-0 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === "resumen" ? "bg-indigo-600 text-white shadow-lg" : "bg-white text-gray-600 border border-gray-200"}`}>📊 Resumen</button>
            <button onClick={() => setActiveTab("kpis")} className={`flex-shrink-0 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === "kpis" ? "bg-indigo-600 text-white shadow-lg" : "bg-white text-gray-600 border border-gray-200"}`}>📈 KPIs</button>
            <button onClick={() => setActiveTab("movimientos")} className={`flex-shrink-0 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === "movimientos" ? "bg-indigo-600 text-white shadow-lg" : "bg-white text-gray-600 border border-gray-200"}`}>🔄 Movimientos</button>
          </div>

          {activeTab === "resumen" && (
            <div className="space-y-6">
            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50 border border-gray-100 group" onClick={() => setActiveTab("balance")} title="Saldo actual según el portal de la administradora. Puedes hacer clic para ver más detalles.">
                <div className="text-sm text-gray-500 mb-1">Saldo Disponible seg&uacute;n Web Admin</div>
                <div className="text-2xl font-bold text-blue-600">Bs.{(balance?.saldo_disponible || 0).toLocaleString("es-ES", { minimumFractionDigits: 2 })}</div>
                {tasaBCV.dolar > 0 && <div className="text-sm text-gray-400">$ {((balance?.saldo_disponible || 0) / tasaBCV.dolar).toLocaleString("es-ES", { minimumFractionDigits: 2 })}</div>}
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50 border border-gray-100 group" onClick={() => setActiveTab("balance")} title="Total de cobranza recibida en el mes actual. Incluye pagos de apartamentos.">
                <div className="text-sm text-gray-500 mb-1">Cobranza del Mes</div>
                <div className="text-2xl font-bold text-green-600">Bs.{(balance?.cobranza_mes || ingresosSummary.monto).toLocaleString("es-ES", { minimumFractionDigits: 2 })}</div>
                {tasaBCV.dolar > 0 && <div className="text-sm text-gray-400">$ {((balance?.cobranza_mes || ingresosSummary.monto) / tasaBCV.dolar).toLocaleString("es-ES", { minimumFractionDigits: 2 })}</div>}
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50 border border-gray-100 group" onClick={() => setActiveTab("gastos")} title="Gastos facturados por la administradora en el mes actual.">
                <div className="text-sm text-gray-500 mb-1">Gastos del Mes</div>
                <div className="text-2xl font-bold text-orange-600">Bs.{Math.abs(balance?.gastos_facturados || gastosSummary.monto).toLocaleString("es-ES", { minimumFractionDigits: 2 })}</div>
                {tasaBCV.dolar > 0 && <div className="text-sm text-gray-400">$ {Math.abs((balance?.gastos_facturados || gastosSummary.monto) / tasaBCV.dolar).toLocaleString("es-ES", { minimumFractionDigits: 2 })}</div>}
                <div className="text-xs text-gray-400 mt-1">
                  {gastosSummary.cantidad} movimiento{gastosSummary.cantidad !== 1 ? "s" : ""}
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50 border border-gray-100 group" onClick={() => setActiveTab("balance")} title="Fondo de reserva acumulado para emergencias y mantenimiento mayor.">
                <div className="text-sm text-gray-500 mb-1">Fondo Reserva</div>
                <div className="text-2xl font-bold text-purple-600">Bs.{(balance?.fondo_reserva || 0).toLocaleString("es-ES", { minimumFractionDigits: 2 })}</div>
                {tasaBCV.dolar > 0 && <div className="text-sm text-gray-400">$ {((balance?.fondo_reserva || 0) / tasaBCV.dolar).toLocaleString("es-ES", { minimumFractionDigits: 2 })}</div>}
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50 border border-gray-100 group" onClick={() => setActiveTab("egresos")} title="Pagos a proveedores y servicios externos realizados en el mes actual.">
                <div className="text-sm text-gray-500 mb-1">Egresos del Mes</div>
                <div className="text-2xl font-bold text-red-600">
                  Bs.{formatBs(egresosSummary.monto)}
                </div>
                {tasaBCV.dolar > 0 && <div className="text-sm text-gray-400">$ {formatUsd(egresosSummary.monto / tasaBCV.dolar)}</div>}
                <div className="text-xs text-gray-400 mt-1">
                  {egresosSummary.cantidad} movimiento{egresosSummary.cantidad !== 1 ? "s" : ""}
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50 border border-gray-100 group" onClick={() => setActiveTab("recibos")} title="Total de apartamentos con deuda pendiente y monto total por cobrar.">
                <div className="text-sm text-gray-500 mb-1">Recibos Pendientes</div>
                <div className="text-2xl font-bold text-orange-600">
                  {recibos.reduce((sum, r) => sum + r.num_recibos, 0)}
                </div>
                <div className="text-sm text-gray-500">
                  {recibos.length} apartamento{recibos.length !== 1 ? "s" : ""} con deuda
                </div>
                <div className="text-lg font-bold text-red-600 mt-1">
                  Bs. {formatBs(recibos.reduce((sum, r) => sum + Number(r.deuda), 0))}
                </div>
                <div className="text-sm text-gray-500">
                  $ {formatUsd(recibos.reduce((sum, r) => sum + Number(r.deuda_usd || 0), 0))}
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50 border border-gray-100 group" onClick={() => setActiveTab("manual")} title="Saldo bancario registrado manualmente, último corte registrado.">
                <div className="text-sm text-gray-500 mb-1">Saldo Manual</div>
                <div className="text-2xl font-bold text-indigo-600">
                  Bs. {formatBs(movimientosManual.length > 0 ? (movimientosManual[0]?.saldo_acumulado || 0) : 0)}
                </div>
                <div className="text-sm text-gray-500 font-medium">
                  $ {formatUsd(movimientosManual.length > 0 ? ((movimientosManual[0]?.saldo_acumulado || 0) / (movimientosManual[0]?.tasa_bcv || tasaBCV.dolar || 45)) : 0)}
                </div>
                <div className="text-[10px] text-gray-400 mt-1 uppercase font-bold">
                  Último Saldo Registrado
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50 border border-gray-100 group" onClick={() => setActiveTab("manual")} title="Movimientos bancarios que aún no han sido conciliados con el estado de cuenta de la administradora.">
                <div className="text-sm text-gray-500 mb-1">Por Conciliar (Manual)</div>
                <div className="text-2xl font-bold text-amber-600">
                  Bs. {formatBs(movimientosManual.filter((m: any) => !m.comparado).reduce((sum, m) => sum + Number(m.ingresos || 0) - Number(m.egresos || 0), 0))}
                </div>
                <div className="text-sm text-gray-500 font-medium">
                  $ {formatUsd(movimientosManual.filter((m: any) => !m.comparado).reduce((sum, m) => sum + (Number(m.ingresos || 0) - Number(m.egresos || 0)) / (m.tasa_bcv || tasaBCV.dolar || 1), 0))}
                </div>
                <div className="text-[10px] text-gray-400 mt-1 uppercase font-bold">
                  {movimientosManual.filter((m: any) => !m.comparado).length} Movimientos sin conciliar
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 group" title="Gráfico circular que muestra la distribución de apartamentos según la cantidad de recibos pendientes. Haz clic en las secciones para ver los detalles.">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribuci&oacute;n de Unidades con Deuda</h2>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={(() => {
                          const dist: any = {};
                          recibos.forEach(r => {
                            const n = r.num_recibos || 1;
                            if (!dist[n]) dist[n] = { name: `${n} Recibo${n > 1 ? 's' : ''}`, value: 0 };
                            dist[n].value++;
                          });
                          return Object.values(dist);
                        })()}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value} aptos`}
                      >
                        {recibos.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'][index % 7]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 text-center uppercase font-bold">Cantidad de apartamentos según n&uacute;mero de recibos pendientes</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 group" title="Gráfico circular que muestra la distribución del monto total adeudado por antigüedad de deuda. Los colores más claros representan deudas más recientes.">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribuci&oacute;n por Montos Pendientes</h2>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={(() => {
                          const dist: any = {};
                          recibos.forEach(r => {
                            const n = r.num_recibos || 1;
                            if (!dist[n]) dist[n] = { name: `${n} Recibo${n > 1 ? 's' : ''}`, value: 0 };
                            dist[n].value += Number(r.deuda);
                          });
                          return Object.values(dist);
                        })()}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, value }) => `${name}: Bs. ${formatBs(value)}`}
                      >
                        {recibos.map((_, index) => (
                          <Cell key={`cell-amt-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'][index % 7]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => `Bs. ${formatBs(value)}`} />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 text-center uppercase font-bold">Monto total adeudado (Bs.) distribuido por antig&uuml;edad de deuda</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 group" title="Indicadores clave de rendimiento financiero del edificio. Cada indicador muestra la salud financiera del condominio.">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Indicadores Financieros</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg group" title="Indica cuántas veces el saldo disponible puede cubrir los gastos mensuales. Valores superiores a 1 son saludables.">
                    <div className="text-[10px] font-bold text-blue-600 uppercase mb-1">Liquidez Inmediata</div>
                    <div className="text-xl font-black text-blue-800">
                      {balance?.gastos_facturados && balance.gastos_facturados !== 0 
                        ? (balance.saldo_disponible / Math.abs(balance.gastos_facturados)).toFixed(2) 
                        : "N/A"}
                    </div>
                    <div className="text-[9px] text-blue-500 leading-tight">Veces que el saldo cubre los gastos del mes</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg group" title="Porcentaje de efectividad en la cobranza del mes actual. Por encima de 80% se considera bueno.">
                    <div className="text-[10px] font-bold text-green-600 uppercase mb-1">Índice de Cobranza</div>
                    <div className="text-xl font-black text-green-800">
                      {balance?.recibos_mes && balance.recibos_mes !== 0 
                        ? ((balance.cobranza_mes / balance.recibos_mes) * 100).toFixed(1)
                        : "0.0"}%
                    </div>
                    <div className="text-[9px] text-green-500 leading-tight">Efectividad de recaudación del mes</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg group" title="Porcentaje de apartamentos que tienen deuda pendiente. Por debajo del 20% es saludable.">
                    <div className="text-[10px] font-bold text-red-600 uppercase mb-1">Morosidad Global</div>
                    <div className="text-xl font-black text-red-800">
                      {building?.unidades ? ((recibos.length / building.unidades) * 100).toFixed(1) : "0.0"}%
                    </div>
                    <div className="text-[9px] text-red-500 leading-tight">Aptos con deuda sobre el total</div>
                  </div>
                  <div className="bg-indigo-50 p-3 rounded-lg group" title="Cantidad promedio de meses de facturación que representan la deuda total. Valores iguales o menores a 3 meses son saludables.">
                    <div className="text-[10px] font-bold text-indigo-600 uppercase mb-1">Carga de Deuda</div>
                    <div className="text-xl font-black text-indigo-800">
                      {balance?.total_por_cobrar && balance.recibos_mes && balance.recibos_mes !== 0
                        ? (balance.total_por_cobrar / balance.recibos_mes).toFixed(1)
                        : "0.0"}
                    </div>
                    <div className="text-[9px] text-indigo-500 leading-tight">Meses de facturación en deuda total</div>
                  </div>
                </div>
              </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Movimientos de Hoy ({new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })})</h2>
              </div>
              {syncMessage && (
                <div className={`mb-4 p-3 rounded-lg border ${syncMessage.includes("Error") ? "bg-red-50 text-red-600 border-red-100" : "bg-green-50 text-green-600 border-green-100"}`}>
                  {syncMessage}
                </div>
              )}
              {!hasIntegration && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                  <p className="text-yellow-700">
                    Configura tus credenciales de la administradora en la sección &quot;Configuración&quot; para comenzar a sincronizar datos automáticamente.
                  </p>
                </div>
              )}
              {loadingMovimientosDia ? (
                <p className="text-gray-500 text-center py-8">Cargando movimientos...</p>
              ) : movimientosDia.length === 0 ? (
                <p className="text-gray-500 text-center py-8 border border-dashed border-gray-200 rounded-lg">
                  No hay movimientos hoy. {hasIntegration ? "Haz clic en sincronizar para obtener datos." : "Configura la integración primero."}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {movimientosDia.map((m: any) => (
                        <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              m.tipo === "recibo" ? "bg-green-100 text-green-800" : 
                              m.tipo === "gasto" ? "bg-orange-100 text-orange-800" : "bg-red-100 text-red-800"
                            }`}>
                              {m.tipo === "recibo" ? "Recibo" : m.tipo === "gasto" ? "Gasto" : "Egreso"}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-sm text-gray-800">{m.descripcion}</td>
                          <td className={`py-3 px-3 text-right font-bold text-sm ${
                            m.tipo === "recibo" ? "text-green-600" : "text-red-600"
                          }`}>
                            {m.tipo === "recibo" ? "+" : "-"}Bs. {formatCurrency(m.monto)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 font-bold border-t-2 border-gray-100">
                        <td className="py-3 px-3 text-sm" colSpan={2}>TOTALES DEL DÍA</td>
                        <td className={`py-3 px-3 text-right text-sm ${
                          movimientosDia.filter((m: any) => m.tipo === "recibo").reduce((s, m) => s + Number(m.monto), 0) -
                          movimientosDia.filter((m: any) => m.tipo !== "recibo").reduce((s, m) => s + Number(m.monto), 0) >= 0 ? "text-green-600" : "text-red-600"
                        }`}>
                          Bs. {formatCurrency(
                            movimientosDia.filter((m: any) => m.tipo === "recibo").reduce((s, m) => s + Number(m.monto), 0) -
                            movimientosDia.filter((m: any) => m.tipo !== "recibo").reduce((s, m) => s + Number(m.monto), 0)
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "ingresos" && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pagos de Condominio por Unidad</h2>
            <p className="text-sm text-gray-500 mb-4">Estado de pagos de recibos del mes - Comparación entre sync actual y anterior</p>
            {loadingIngresos ? (
              <p className="text-gray-500 text-center py-8">Cargando...</p>
            ) : ingresosData.length === 0 ? (
              <p className="text-gray-500 text-center py-8 border border-dashed border-gray-200 rounded-lg">
                No hay datos de pagos. Sincroniza datos desde la sección de configuración.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Unidad</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Propietario</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">#Recibos</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Bs</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Monto USD</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ingresosData.map((pago: any) => (
                      <tr key={pago.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">{pago.unidad}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{pago.propietario || "-"}</td>
                        <td className="py-3 px-4 text-sm text-right text-gray-900">{pago.numRecibos}</td>
                        <td className="py-3 px-4 text-sm text-right text-gray-600">
                          Bs. {formatCurrency(pago.montoBs)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-green-600 font-medium">
                          $ {formatCurrency(pago.montoUsd)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            pago.estado === "pagado" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}>
                            {pago.estado === "pagado" ? "Pagado" : "Pendiente"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "movimientos" && (
          <div className="space-y-6">
            {movimientosDia.length > 0 && (
              <div className="bg-green-50 p-6 rounded-xl shadow-sm border border-green-200">
                <h2 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
                  <span>📊</span> Movimientos del Día
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-green-200">
                        <th className="text-left py-2 px-3 text-xs font-medium text-green-700 uppercase">Tipo</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-green-700 uppercase">Descripción</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-green-700 uppercase">Unidad</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-green-700 uppercase">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-green-100">
                      {movimientosDia.map((m: any) => (
                        <tr key={m.id}>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              m.tipo === "pago" ? "bg-green-200 text-green-800" : 
                              m.tipo === "recibo" ? "bg-green-200 text-green-800" : 
                              m.tipo === "gasto" ? "bg-orange-200 text-orange-800" : "bg-red-200 text-red-800"
                            }`}>
                              {m.tipo === "pago" ? "Pago" : m.tipo === "recibo" ? "Recibo" : m.tipo === "gasto" ? "Gasto" : "Egreso"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-sm text-gray-800">{m.descripcion}</td>
                          <td className="py-2.5 px-3 text-sm text-gray-600 font-medium">{m.unidad_apartamento || "-"}</td>
                          <td className={`py-2.5 px-3 text-right text-sm font-bold ${
                            m.tipo === "pago" || m.tipo === "recibo" ? "text-green-700" : "text-red-700"
                          }`}>
                            {m.tipo === "pago" || m.tipo === "recibo" ? "+" : "-"}Bs. {formatBs(m.monto)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Historial de Movimientos del Mes</h2>
              {loadingMovements ? (
                <p className="text-gray-500 text-center py-8">Cargando...</p>
              ) : movements.length === 0 ? (
                <p className="text-gray-500 text-center py-8 border border-dashed border-gray-200 rounded-lg">
                  No hay movimientos este mes.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  {(() => {
                    const filteredMovements = movements
                      .filter((mov) => {
                        if (movementTypeFilter === "todos") return true;
                        if (movementTypeFilter === "egresos") return mov.tipo === "egreso";
                        if (movementTypeFilter === "gastos") return mov.tipo === "gasto";
                        if (movementTypeFilter === "pagos") return mov.tipo === "pago" || mov.tipo === "recibo";
                        return true;
                      })
                      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

                    return (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                          <div className="text-xs text-gray-400 uppercase tracking-wider font-bold">
                            Registros encontrados: {filteredMovements.length}
                          </div>
                          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                            {[
                              { id: "todos", label: "Todos" },
                              { id: "egresos", label: "Egresos" },
                              { id: "gastos", label: "Gastos" },
                              { id: "pagos", label: "Pagos" },
                            ].map((f) => (
                              <button
                                key={f.id}
                                onClick={() => setMovementTypeFilter(f.id as any)}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                                  movementTypeFilter === f.id
                                    ? "bg-white text-blue-600 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                                }`}
                              >
                                {f.label}
                              </button>
                            ))}
                          </div>
                        </div>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Unidad</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Bs.</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Monto USD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredMovements.map((mov) => (
                        <tr key={mov.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 text-sm text-gray-900">{mov.fecha}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              mov.tipo === "pago" ? "bg-green-100 text-green-700" :
                              mov.tipo === "recibo" ? "bg-green-100 text-green-700" : 
                              mov.tipo === "gasto" ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"
                            }`}>
                              {mov.tipo === "pago" ? "Pago" : mov.tipo === "recibo" ? "Recibo" : mov.tipo === "gasto" ? "Gasto" : "Egreso"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">{mov.descripcion}</td>
                          <td className="py-3 px-4 text-sm text-gray-500 font-medium">{mov.unidad_apartamento || mov.unidad || "-"}</td>
                          <td className={`py-3 px-4 text-right text-sm font-bold ${
                            mov.tipo === "pago" || mov.tipo === "recibo" ? "text-green-600" : "text-red-600"
                          }`}>
                            {mov.tipo === "pago" || mov.tipo === "recibo" ? "+" : "-"}Bs. {formatBs(mov.monto)}
                          </td>
                          <td className="py-3 px-4 text-right text-sm text-gray-500 font-medium">
                            $ {formatUsd(mov.monto_usd || (tasaBCV.dolar > 0 ? mov.monto / tasaBCV.dolar : 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                      </> 
                    ); 
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "recibos" && (
          <div className="space-y-6">
            {selectedMesRecibos && selectedMesRecibos !== "" && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                {(() => {
                  const firstRecibo = recibos[0];
                  const rate = (firstRecibo && typeof firstRecibo.deuda_usd === 'number' && firstRecibo.deuda_usd > 0) 
                    ? (firstRecibo.deuda / firstRecibo.deuda_usd) 
                    : (tasaBCV.dolar || 1);

                  const uniqueItems = Array.from(new Set(reciboGeneral.map(i => `${i.codigo}-${i.descripcion}-${i.monto}`)))
                    .map(key => reciboGeneral.find(i => `${i.codigo}-${i.descripcion}-${i.monto}` === key));

                  const itemsFondos = uniqueItems.filter(i => i?.descripcion?.toUpperCase().includes('FONDO DE RESERVA'));
                  const itemsNoComunes = uniqueItems.filter(i => i?.descripcion?.toUpperCase().includes('FONDO DIFERENCIAL') || i?.codigo === '00085');
                  const itemsComunes = uniqueItems.filter(i => i && !itemsFondos.includes(i) && !itemsNoComunes.includes(i));

                  const sumMonto = (arr: any[]) => arr.reduce((sum, i) => sum + Number(i.monto || 0), 0);
                  const sumCuota = (arr: any[]) => arr.reduce((sum, i) => sum + Number(i.cuota_parte || 0), 0);

                  const totalGastosComunes = sumMonto(itemsComunes);
                  const totalCuotaComunes = sumCuota(itemsComunes);

                  const totalFondos = sumMonto(itemsFondos);
                  const totalCuotaFondos = sumCuota(itemsFondos);

                  const totalNoComunes = sumMonto(itemsNoComunes);
                  const totalCuotaNoComunes = sumCuota(itemsNoComunes);

                  return (
                    <>
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h2 className="text-lg font-bold text-gray-900 uppercase tracking-tight">Visualizaci&oacute;n de Recibo de Condominio</h2>
                          <p className="text-xs text-gray-500 font-medium">Resumen detallado de gastos del mes {selectedMesRecibos}</p>
                          <div className="mt-2 text-xs font-bold text-blue-600 bg-blue-50 inline-block px-2 py-1 rounded border border-blue-100">
                            Tasa de cambio: {rate.toFixed(2)} Bs/USD
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {building?.url_recibo_mes && (
                            <a
                              href={`${building.url_recibo_mes}${selectedMesRecibos ? `&combo=${selectedMesRecibos}` : ""}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors flex items-center gap-1.5"
                            >
                              <span>📄</span> PDF RECIBO
                            </a>
                          )}
                          <button onClick={() => loadReciboGeneral(selectedMesRecibos)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-blue-600" title="Refrescar Detalle">
                            <span className={loadingReciboGeneral ? "animate-spin inline-block" : ""}>🔄</span>
                          </button>
                        </div>
                      </div>

                      {loadingReciboGeneral ? (
                        <div className="flex flex-col items-center justify-center py-12">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
                          <p className="text-sm text-gray-500 font-medium italic">Obteniendo detalle del recibo...</p>
                        </div>
                      ) : reciboGeneral.length > 0 ? (
                        <div className="overflow-hidden border border-gray-200 rounded-xl">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                              <tr>
                                <th className="py-3 px-4 font-black text-gray-600 uppercase text-[10px]">C&oacute;digo</th>
                                <th className="py-3 px-4 font-black text-gray-600 uppercase text-[10px]">Descripci&oacute;n</th>
                                <th className="py-3 px-4 text-right font-black text-gray-600 uppercase text-[10px]">Monto (Bs.)</th>
                                <th className="py-3 px-4 text-right font-black text-gray-600 uppercase text-[10px]">Cuota Parte (Bs.)</th>
                                <th className="py-3 px-4 text-right font-black text-gray-600 uppercase text-[10px]">Cuota Parte (USD)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {itemsComunes.map((item, idx) => (
                                <tr key={`comun-${idx}`} className="hover:bg-gray-50 transition-colors">
                                  <td className="py-2 px-4 font-mono text-[11px] text-gray-500">{item.codigo}</td>
                                  <td className="py-2 px-4 text-gray-800 font-medium uppercase">{item.descripcion}</td>
                                  <td className="py-2 px-4 text-right font-bold text-gray-900">{formatBs(item.monto)}</td>
                                  <td className="py-2 px-4 text-right text-gray-600">{formatBs(item.cuota_parte)}</td>
                                  <td className="py-2 px-4 text-right text-gray-500 font-medium">{formatUsd(Number(item.cuota_parte || 0) / rate)}</td>
                                </tr>
                              ))}
                              <tr className="bg-gray-50 font-bold">
                                <td colSpan={2} className="py-2 px-4 text-right text-gray-700 uppercase text-[10px]">TOTAL GASTOS COMUNES:</td>
                                <td className="py-2 px-4 text-right text-gray-900">{formatBs(totalGastosComunes)}</td>
                                <td className="py-2 px-4 text-right text-gray-900">{formatBs(totalCuotaComunes)}</td>
                                <td className="py-2 px-4 text-right text-gray-900">{formatUsd(totalCuotaComunes / rate)}</td>
                              </tr>

                              {itemsFondos.map((item, idx) => (
                                <tr key={`fondo-${idx}`} className="hover:bg-gray-50 transition-colors">
                                  <td className="py-2 px-4 font-mono text-[11px] text-gray-500">{item.codigo}</td>
                                  <td className="py-2 px-4 text-gray-800 font-medium uppercase">{item.descripcion}</td>
                                  <td className="py-2 px-4 text-right font-bold text-gray-900">{formatBs(item.monto)}</td>
                                  <td className="py-2 px-4 text-right text-gray-600">{formatBs(item.cuota_parte)}</td>
                                  <td className="py-2 px-4 text-right text-gray-500 font-medium">{formatUsd(Number(item.cuota_parte || 0) / rate)}</td>
                                </tr>
                              ))}
                              <tr className="bg-gray-50 font-bold">
                                <td colSpan={2} className="py-2 px-4 text-right text-gray-700 uppercase text-[10px]">TOTAL FONDOS:</td>
                                <td className="py-2 px-4 text-right text-gray-900">{formatBs(totalFondos)}</td>
                                <td className="py-2 px-4 text-right text-gray-900">{formatBs(totalCuotaFondos)}</td>
                                <td className="py-2 px-4 text-right text-gray-900">{formatUsd(totalCuotaFondos / rate)}</td>
                              </tr>

                              <tr className="bg-indigo-50 font-black">
                                <td colSpan={2} className="py-2 px-4 text-right text-indigo-800 uppercase text-[10px]">TOTAL FONDOS Y GASTOS COMUNES:</td>
                                <td className="py-2 px-4 text-right text-indigo-900">{formatBs(totalGastosComunes + totalFondos)}</td>
                                <td className="py-2 px-4 text-right text-indigo-900">{formatBs(totalCuotaComunes + totalCuotaFondos)}</td>
                                <td className="py-2 px-4 text-right text-indigo-900">{formatUsd((totalCuotaComunes + totalCuotaFondos) / rate)}</td>
                              </tr>

                              {itemsNoComunes.map((item, idx) => (
                                <tr key={`nocomun-${idx}`} className="hover:bg-gray-50 transition-colors">
                                  <td className="py-2 px-4 font-mono text-[11px] text-gray-500">{item.codigo}</td>
                                  <td className="py-2 px-4 text-gray-800 font-medium uppercase">{item.descripcion}</td>
                                  <td className="py-2 px-4 text-right font-bold text-gray-900">{formatBs(item.monto)}</td>
                                  <td className="py-2 px-4 text-right text-gray-600">{formatBs(item.cuota_parte)}</td>
                                  <td className="py-2 px-4 text-right text-gray-500 font-medium">{formatUsd(Number(item.cuota_parte || 0) / rate)}</td>
                                </tr>
                              ))}

                              {itemsNoComunes.length > 0 && (
                                <tr className="bg-gray-50 font-bold">
                                  <td colSpan={2} className="py-2 px-4 text-right text-gray-700 uppercase text-[10px]">TOTAL GASTOS NO COMUNES:</td>
                                  <td className="py-2 px-4 text-right text-gray-900">{formatBs(totalNoComunes)}</td>
                                  <td className="py-2 px-4 text-right text-gray-900">{formatBs(totalCuotaNoComunes)}</td>
                                  <td className="py-2 px-4 text-right text-gray-900">{formatUsd(totalCuotaNoComunes / rate)}</td>
                                </tr>
                              )}
                            </tbody>
                            <tfoot className="bg-blue-600 text-white font-black border-t-2 border-blue-700">
                              <tr>
                                <td colSpan={2} className="py-3 px-4 text-right uppercase text-xs">TOTAL RECIBO:</td>
                                <td className="py-3 px-4 text-right">
                                  Bs. {formatBs(totalGastosComunes + totalFondos + totalNoComunes)}
                                </td>
                                <td className="py-3 px-4 text-right text-lg">
                                  Bs. {formatBs(totalCuotaComunes + totalCuotaFondos + totalCuotaNoComunes)}
                                </td>
                                <td className="py-3 px-4 text-right text-lg">
                                  $ {formatUsd((totalCuotaComunes + totalCuotaFondos + totalCuotaNoComunes) / rate)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      ) : (
                        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl py-10 text-center">
                          <p className="text-gray-500 font-medium">No hay detalles disponibles para este mes.</p>
                          <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold italic">Sincroniza los datos de este mes para visualizar el detalle.</p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}



            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 uppercase tracking-tight">Relaci&oacute;n de Recibos Pendientes</h2>
                  <p className="text-xs text-gray-500 font-medium">Detalle de deudas por apartamento</p>
                </div>
                <div className="flex gap-4 items-center">
                {mesesRecibos.length > 0 && (
                  <select
                    value={selectedMesRecibos}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedMesRecibos(val);
                      loadRecibos(val);
                      loadReciboGeneral(val);
                    }}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white font-bold text-indigo-600"
                  >
                    <option value="">Mes Actual</option>
                    {mesesRecibos.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                )}
                <button onClick={() => loadRecibos()} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Refrescar">
                  <span className="text-xl">🔄</span>
                </button>
              </div>
            </div>
            {loadingRecibos ? (
              <p className="text-gray-500 text-center py-8">Cargando...</p>
            ) : recibos.length === 0 ? (
              <p className="text-gray-500 text-center py-8 border border-dashed border-gray-200 rounded-lg">
                No hay recibos pendientes.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Unidad</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Propietario</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">#Recibos</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Deuda USD</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Deuda Bs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recibos.filter(r => !r.isTotal).map((recibo) => (
                      <tr key={recibo.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 text-sm font-bold text-gray-900">{recibo.unidad}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{recibo.propietario}</td>
                        <td className="py-3 px-4 text-sm text-right text-gray-900 font-medium">{recibo.num_recibos}</td>
                        <td className="py-3 px-4 text-sm text-right text-red-600 font-bold">
                          ${formatUsd(recibo.deuda_usd)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-red-600 font-bold">
                          Bs.{formatBs(recibo.deuda)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-bold border-t-2 border-gray-200">
                      <td className="py-4 px-4 text-sm" colSpan={2}>TOTAL DEUDA CONDOMINIOS</td>
                      <td className="py-4 px-4 text-sm text-right">{recibos.filter(r => !r.isTotal).reduce((sum, r) => sum + r.num_recibos, 0)}</td>
                      <td className="py-4 px-4 text-sm text-right text-red-700">
                        ${formatUsd(recibos.filter(r => !r.isTotal).reduce((sum, r) => sum + (r.deuda_usd || 0), 0))}
                      </td>
                      <td className="py-4 px-4 text-sm text-right text-red-700">
                        Bs.{formatBs(recibos.filter(r => !r.isTotal).reduce((sum, r) => sum + Number(r.deuda), 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
        )}

        {activeTab === "egresos" && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Egresos Generales</h2>
              {mesesEgresos.length > 0 && (
                <select
                  value={selectedMesEgresos}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedMesEgresos(val);
                    loadEgresos(val);
                  }}                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="">Mes Actual</option>
                  {mesesEgresos.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              )}
            </div>
            {loadingEgresos ? (
              <p className="text-gray-500 text-center py-8">Cargando...</p>
            ) : egresos.length === 0 ? (
              <p className="text-gray-500 text-center py-8 border border-dashed border-gray-200 rounded-lg">
                No hay egresos registrados.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Beneficiario</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Operación</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">USD</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Bolivares</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {egresos.filter((e: any) => !e.isTotal && e.fecha !== "2099-12-31" && !e.beneficiario?.includes("TOTAL")).map((egreso: any) => (
                      <tr key={egreso.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 text-sm text-gray-900">{egreso.fecha}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 font-medium">{egreso.beneficiario}</td>
                        <td className="py-3 px-4 text-xs text-gray-500 italic">{egreso.operacion}</td>
                        <td className="py-3 px-4 text-sm text-right text-gray-600 font-medium">
                          $ {formatUsd(egreso.monto_usd || (tasaBCV.dolar > 0 ? egreso.monto / tasaBCV.dolar : 0))}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-bold text-red-600">
                          Bs. {formatBs(Number(egreso.monto_bs || egreso.monto))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-bold border-t-2 border-gray-200">
                      <td className="py-4 px-4 text-sm">TOTAL GENERAL</td>
                      <td className="py-4 px-4 text-[10px] text-gray-400 uppercase tracking-widest" colSpan={2}>
                        {egresos.filter((e: any) => !e.isTotal && e.fecha !== "2099-12-31" && !e.beneficiario?.includes("TOTAL")).length} REGISTROS
                      </td>
                      <td className="py-4 px-4 text-sm text-right text-gray-800">
                        $ {formatUsd(egresos.filter((e: any) => !e.isTotal && e.fecha !== "2099-12-31" && !e.beneficiario?.includes("TOTAL")).reduce((sum, e) => sum + (e.monto_usd || (tasaBCV.dolar > 0 ? e.monto / tasaBCV.dolar : 0)), 0))}
                      </td>
                      <td className="py-4 px-4 text-sm text-right text-red-700">
                        Bs. {formatBs(egresos.filter((e: any) => !e.isTotal && e.fecha !== "2099-12-31" && !e.beneficiario?.includes("TOTAL")).reduce((sum, e) => sum + Number(e.monto_bs || e.monto), 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "gastos" && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Gastos del Edificio</h2>
              {mesesGastos.length > 0 && (
                <select
                  value={selectedMesGastos}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedMesGastos(val);
                    loadGastos(val);
                  }}                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="">Mes Actual</option>
                  {mesesGastos.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              )}
            </div>
            {loadingGastos ? (
              <p className="text-gray-500 text-center py-8">Cargando...</p>
            ) : gastos.length === 0 ? (
              <p className="text-gray-500 text-center py-8 border border-dashed border-gray-200 rounded-lg">
                No hay gastos de edificio registrados.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Concepto</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">USD</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Bolivares</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {gastos.filter(g => !g.isTotal).map((gasto: any) => (
                      <tr key={gasto.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 text-sm text-gray-900">{gasto.fecha}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 font-medium">{gasto.descripcion}</td>
                        <td className="py-3 px-4 text-xs text-gray-400">{gasto.codigo || "-"}</td>
                        <td className="py-3 px-4 text-sm text-right text-gray-600 font-medium">
                          $ {formatUsd(gasto.monto_usd || (tasaBCV.dolar > 0 ? gasto.monto / tasaBCV.dolar : 0))}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-bold text-orange-600">
                          Bs. {formatBs(Number(gasto.monto_bs || gasto.monto))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-bold border-t-2 border-gray-200">
                      <td className="py-4 px-4 text-sm">TOTAL GENERAL GASTOS</td>
                      <td className="py-4 px-4 text-[10px] text-gray-400 uppercase tracking-widest">
                        {gastos.filter(g => !g.isTotal).length} CONCEPTOS
                      </td>
                      <td className="py-4 px-4"></td>
                      <td className="py-4 px-4 text-sm text-right text-gray-800">
                        $ {formatUsd(gastos.filter(g => !g.isTotal).reduce((sum, g: any) => sum + Number(g.monto_usd || (tasaBCV.dolar > 0 ? g.monto / tasaBCV.dolar : 0)), 0))}
                      </td>
                      <td className="py-4 px-4 text-sm text-right text-orange-700">
                        Bs. {formatBs(gastos.filter(g => !g.isTotal).reduce((sum, g: any) => sum + Number(g.monto_bs || g.monto || 0), 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "recibo" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 uppercase tracking-tight">Ver Recibo de Condominio</h2>
                  <p className="text-xs text-gray-500 font-medium">Resumen detallado de gastos del mes</p>
                </div>
                <div className="flex items-center gap-3">
                  {mesesRecibos.length > 0 && (
                    <select
                      value={selectedMesRecibos}
                      onChange={(e) => {
                        const newMes = e.target.value;
                        setSelectedMesRecibos(newMes);
                        if (newMes) loadReciboGeneral();
                        else setReciboGeneral([]);
                      }}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                    >
                      <option value="">Mes Actual</option>
                      {mesesRecibos.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  )}
                  <button onClick={() => loadReciboGeneral()} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-blue-600" title="Refrescar Detalle">
                    <span className={loadingReciboGeneral ? "animate-spin inline-block" : ""}>🔄</span>
                  </button>
                </div>
              </div>

              {loadingReciboGeneral ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
                  <p className="text-sm text-gray-500 font-medium italic">Obteniendo detalle del recibo...</p>
                </div>
              ) : reciboGeneral.length > 0 ? (() => {
                  const rawItems = [...reciboGeneral];
                  const gastoItems: any[] = [];
                  const fondoReserva: any[] = [];
                  const gastosNoComunes: any[] = [];
                  
                  for (const item of rawItems) {
                    const code = item.codigo || '';
                    const desc = (item.descripcion || '').toUpperCase();
                    
                    if (code === '00085') {
                      gastosNoComunes.push(item);
                    } else if (code === '00001' && desc.includes('TRABAJADOR')) {
                      gastoItems.unshift(item);
                    } else if (code === '00001' && desc.includes('FONDO')) {
                      fondoReserva.push(item);
                    } else if (code === '00001') {
                      gastoItems.push(item);
                    } else {
                      gastoItems.push(item);
                    }
                  }
                  
                  const sortedGastos = gastoItems.sort((a, b) => {
                    const codeA = a.codigo || '';
                    const codeB = b.codigo || '';
                    if (codeA === '00001') return 1;
                    if (codeB === '00001') return -1;
                    return codeA.localeCompare(codeB);
                  });
                  
                  const totalGastosMonto = sortedGastos.reduce((sum, i: any) => sum + Number(i.monto || 0), 0);
                  const totalGastosCuota = sortedGastos.reduce((sum, i: any) => sum + Number(i.cuota_parte || 0), 0);
                  const totalFondosMonto = fondoReserva.reduce((sum, i: any) => sum + Number(i.monto || 0), 0);
                  const totalFondosCuota = fondoReserva.reduce((sum, i: any) => sum + Number(i.cuota_parte || 0), 0);
                  const totalFondosYGastosComunesMonto = totalGastosMonto + totalFondosMonto;
                  const totalFondosYGastosComunesCuota = totalGastosCuota + totalFondosCuota;
                  
                  return (
<div className="overflow-hidden border border-gray-200 rounded-xl">
                  <div className="bg-gray-100 px-4 py-2 text-xs font-bold text-gray-600">
                    Tasa de cambio: {formatBs(tasaCambio)} Bs/USD
                  </div>
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="py-3 px-4 font-black text-gray-600 uppercase text-[10px]">C&oacute;digo</th>
                        <th className="py-3 px-4 font-black text-gray-600 uppercase text-[10px]">Descripci&oacute;n</th>
                        <th className="py-3 px-4 text-right font-black text-gray-600 uppercase text-[10px]">Monto (Bs.)</th>
                        <th className="py-3 px-4 text-right font-black text-gray-600 uppercase text-[10px]">Cuota Parte (Bs.)</th>
                        <th className="py-3 px-4 text-right font-black text-gray-600 uppercase text-[10px]">Cuota Parte (USD)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sortedGastos.map((item, idx) => (
                        <tr key={`${item.codigo}-${idx}`} className="hover:bg-gray-50 transition-colors">
                          <td className="py-2.5 px-4 font-mono text-[11px] text-gray-500">{item.codigo}</td>
                          <td className="py-2.5 px-4 text-gray-800 font-medium uppercase">{item.descripcion}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-gray-900">{formatBs(item.monto)}</td>
                          <td className="py-2.5 px-4 text-right text-gray-600">{item.cuota_parte ? formatBs(item.cuota_parte) : '-'}</td>
                          <td className="py-2.5 px-4 text-right text-green-600 font-medium">{item.cuota_parte ? formatUsd(item.cuota_parte / tasaCambio) : '-'}</td>
                        </tr>
                      ))}
                      {totalGastosMonto > 0 && (
                        <tr className="bg-blue-50 border-t-2 border-blue-200">
                          <td colSpan={2} className="py-2 px-4 text-right text-blue-800 uppercase text-xs font-bold">TOTAL GASTOS COMUNES:</td>
                          <td className="py-2 px-4 text-right text-blue-800 font-bold">{formatBs(totalGastosMonto)}</td>
                          <td className="py-2 px-4 text-right text-blue-800 font-bold">{formatBs(totalGastosCuota)}</td>
                          <td className="py-2 px-4 text-right text-green-700 font-bold">{formatUsd(totalGastosCuota / tasaCambio)}</td>
                        </tr>
                      )}
                      {fondoReserva.map((item, idx) => (
                        <tr key={`${item.codigo}-${idx}`} className="hover:bg-gray-50 transition-colors">
                          <td className="py-2.5 px-4 font-mono text-[11px] text-gray-500">{item.codigo}</td>
                          <td className="py-2.5 px-4 text-gray-800 font-medium uppercase">{item.descripcion}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-gray-900">{formatBs(item.monto)}</td>
                          <td className="py-2.5 px-4 text-right text-gray-600">{item.cuota_parte ? formatBs(item.cuota_parte) : '-'}</td>
                          <td className="py-2.5 px-4 text-right text-green-600 font-medium">{item.cuota_parte ? formatUsd(item.cuota_parte / tasaCambio) : '-'}</td>
                        </tr>
                      ))}
                      {totalFondosMonto > 0 && (
                        <tr className="bg-cyan-50 border-t-2 border-cyan-200">
                          <td colSpan={2} className="py-2 px-4 text-right text-cyan-800 uppercase text-xs font-bold">TOTAL FONDOS:</td>
                          <td className="py-2 px-4 text-right text-cyan-800 font-bold">{formatBs(totalFondosMonto)}</td>
                          <td className="py-2 px-4 text-right text-cyan-800 font-bold">{formatBs(totalFondosCuota)}</td>
                          <td className="py-2 px-4 text-right text-green-700 font-bold">{formatUsd(totalFondosCuota / tasaCambio)}</td>
                        </tr>
                      )}
                      {totalFondosYGastosComunesMonto > 0 && (
                        <tr className="bg-indigo-50 border-t-2 border-indigo-200">
                          <td colSpan={2} className="py-2 px-4 text-right text-indigo-800 uppercase text-xs font-bold">TOTAL FONDOS Y GASTOS COMUNES:</td>
                          <td className="py-2 px-4 text-right text-indigo-800 font-bold">{formatBs(totalFondosYGastosComunesMonto)}</td>
                          <td className="py-2 px-4 text-right text-indigo-800 font-bold">{formatBs(totalFondosYGastosComunesCuota)}</td>
                          <td className="py-2 px-4 text-right text-green-700 font-bold">{formatUsd(totalFondosYGastosComunesCuota / tasaCambio)}</td>
                        </tr>
                      )}
                      {gastosNoComunes.map((item, idx) => (
                        <tr key={`${item.codigo}-${idx}`} className="hover:bg-gray-50 transition-colors">
                          <td className="py-2.5 px-4 font-mono text-[11px] text-gray-500">{item.codigo}</td>
                          <td className="py-2.5 px-4 text-gray-800 font-medium uppercase">{item.descripcion}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-gray-900">{formatBs(item.monto)}</td>
                          <td className="py-2.5 px-4 text-right text-gray-600">{item.cuota_parte ? formatBs(item.cuota_parte) : '-'}</td>
                          <td className="py-2.5 px-4 text-right text-green-600 font-medium">{item.cuota_parte ? formatUsd(item.cuota_parte / tasaCambio) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-bold border-t-2 border-gray-200">
                      <tr className="bg-indigo-100">
                        <td colSpan={2} className="py-3 px-4 text-right text-indigo-800 uppercase text-xs">TOTAL RECIBO:</td>
                        <td className="py-3 px-4 text-right text-indigo-800 text-xl font-black">
                          Bs. {formatBs(reciboGeneral.reduce((sum, item) => sum + Number(item.monto), 0))}
                        </td>
                        <td className="py-3 px-4 text-right text-indigo-800 text-xl font-black">
                          Bs. {formatBs(reciboGeneral.reduce((sum, item) => sum + Number(item.cuota_parte || 0), 0))}
                        </td>
                        <td className="py-3 px-4 text-right text-green-800 text-xl font-black">
                          $ {formatUsd(reciboGeneral.reduce((sum, item) => sum + Number(item.cuota_parte || 0), 0) / tasaCambio)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                  );
                })() : (
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl py-10 text-center">
                  <p className="text-gray-500 font-medium">No hay detalles disponibles para este mes.</p>
                  <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold italic">Sincroniza los datos de este mes para visualizar el detalle.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "balance" && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Estado de Cuenta del Edificio (Balance General)</h2>
              {mesesBalance.length > 0 && (
                <select
                  value={selectedMesBalance}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedMesBalance(val);
                    loadBalance(val);
                  }}                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="">Mes Actual</option>
                  {mesesBalance.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              )}
            </div>
            {loadingBalance ? (
              <p className="text-gray-500 text-center py-8">Cargando...</p>
            ) : !balance ? (
              <p className="text-gray-500 text-center py-8 border border-dashed border-gray-200 rounded-lg">
                No hay datos de balance. Ejecuta una sincronización primero.
              </p>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <p className="text-[10px] text-blue-600 font-bold uppercase mb-1">Disponible en Caja</p>
                    <p className="text-xl font-black text-blue-900">Bs. {formatBs(balance.saldo_disponible)}</p>
                    <p className="text-xs text-blue-700 font-medium">$ {formatUsd(tasaBCV.dolar > 0 ? balance.saldo_disponible / tasaBCV.dolar : 0)}</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                    <p className="text-[10px] text-orange-600 font-bold uppercase mb-1">Cuentas por Cobrar</p>
                    <p className="text-xl font-black text-orange-900">Bs. {formatBs(balance.total_por_cobrar)}</p>
                    <p className="text-xs text-orange-700 font-medium">$ {formatUsd(tasaBCV.dolar > 0 ? balance.total_por_cobrar / tasaBCV.dolar : 0)}</p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                    <p className="text-[10px] text-emerald-600 font-bold uppercase mb-1">Reservas Asignadas</p>
                    <p className="text-xl font-black text-emerald-900">Bs. {formatBs(balance.saldo_reservas)}</p>
                    <p className="text-xs text-emerald-700 font-medium">$ {formatUsd(tasaBCV.dolar > 0 ? balance.saldo_reservas / tasaBCV.dolar : 0)}</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 bg-gray-50">
                      <th className="text-left py-3 px-4 font-bold text-gray-600 uppercase tracking-wider">Concepto Detallado</th>
                      <th className="text-right py-3 px-4 font-bold text-gray-600 uppercase tracking-wider">Bs.</th>
                      <th className="text-right py-3 px-4 font-bold text-gray-600 uppercase tracking-wider">USD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr className="bg-blue-50/50 font-bold"><td className="py-2.5 px-4 text-blue-800" colSpan={3}>I. DISPONIBILIDAD EN CAJA Y BANCOS</td></tr>
                    <tr><td className="py-2.5 px-4 pl-10 text-gray-700">SALDO DE CAJA MES ANTERIOR</td><td className="py-2.5 px-4 text-right text-gray-500">{formatBs(balance.saldo_anterior)}</td><td className="py-2.5 px-4 text-right text-gray-400 italic">$ {formatUsd(tasaBCV.dolar > 0 ? balance.saldo_anterior / tasaBCV.dolar : 0)}</td></tr>
                    <tr><td className="py-2.5 px-4 pl-10 text-gray-700">COBRANZA DEL MES (INGRESOS)</td><td className="py-2.5 px-4 text-right text-green-600 font-medium">+{formatBs(balance.cobranza_mes)}</td><td className="py-2.5 px-4 text-right text-green-500 italic">$ {formatUsd(tasaBCV.dolar > 0 ? balance.cobranza_mes / tasaBCV.dolar : 0)}</td></tr>
                    <tr><td className="py-2.5 px-4 pl-10 text-gray-700">GASTOS FACTURADOS EN EL MES</td><td className="py-2.5 px-4 text-right text-red-600 font-medium">{formatBs(balance.gastos_facturados)}</td><td className="py-2.5 px-4 text-right text-red-500 italic">$ {formatUsd(tasaBCV.dolar > 0 ? balance.gastos_facturados / tasaBCV.dolar : 0)}</td></tr>
                    <tr><td className="py-2.5 px-4 pl-10 text-gray-700">AJUSTES / DIF. CAMBIARIA / PAGOS A TIEMPO</td><td className="py-2.5 px-4 text-right text-gray-500 font-medium">{formatBs(balance.ajuste_pago_tiempo || 0)}</td><td className="py-2.5 px-4 text-right text-gray-400 italic">$ {formatUsd(tasaBCV.dolar > 0 ? (balance.ajuste_pago_tiempo || 0) / tasaBCV.dolar : 0)}</td></tr>
                    <tr className="bg-gray-100 font-bold border-y border-gray-200"><td className="py-3 px-4 text-blue-700">TOTAL DISPONIBLE EN CAJA</td><td className="py-3 px-4 text-right text-blue-700 font-extrabold">{formatBs(balance.saldo_disponible)}</td><td className="py-3 px-4 text-right text-blue-600 font-extrabold">$ {formatUsd(tasaBCV.dolar > 0 ? balance.saldo_disponible / tasaBCV.dolar : 0)}</td></tr>
                    
                    <tr className="bg-orange-50/50 font-bold"><td className="py-2.5 px-4 text-orange-800" colSpan={3}>II. CUENTAS POR COBRAR (CONDOMINIOS)</td></tr>
                    <tr><td className="py-2.5 px-4 pl-10 text-gray-700">RECIBOS DE CONDOMINIOS DEL MES ACTUAL</td><td className="py-2.5 px-4 text-right text-gray-500">{formatBs(balance.recibos_mes)}</td><td className="py-2.5 px-4 text-right text-gray-400 italic">$ {formatUsd(tasaBCV.dolar > 0 ? balance.recibos_mes / tasaBCV.dolar : 0)}</td></tr>
                    <tr><td className="py-2.5 px-4 pl-10 text-gray-700">DEUDA DE MESES ATRASADOS</td><td className="py-2.5 px-4 text-right text-gray-500">{formatBs(balance.condominios_atrasados)}</td><td className="py-2.5 px-4 text-right text-gray-400 italic">$ {formatUsd(tasaBCV.dolar > 0 ? balance.condominios_atrasados / tasaBCV.dolar : 0)}</td></tr>
                    <tr><td className="py-2.5 px-4 pl-10 text-gray-700">SALDOS A FAVOR (SOBRANTES)</td><td className="py-2.5 px-4 text-right text-gray-500">{formatBs(balance.condominios_sobrantes || 0)}</td><td className="py-2.5 px-4 text-right text-gray-400 italic">$ {formatUsd(tasaBCV.dolar > 0 ? (balance.condominios_sobrantes || 0) / tasaBCV.dolar : 0)}</td></tr>
                    <tr className="bg-gray-100 font-bold border-y border-gray-200"><td className="py-3 px-4 text-orange-700">TOTAL CUENTAS POR COBRAR</td><td className="py-3 px-4 text-right text-orange-700 font-extrabold">{formatBs(balance.total_por_cobrar)}</td><td className="py-3 px-4 text-right text-orange-600 font-extrabold">$ {formatUsd(tasaBCV.dolar > 0 ? balance.total_por_cobrar / tasaBCV.dolar : 0)}</td></tr>
                    <tr className="bg-purple-50 font-bold"><td className="py-3 px-4 text-purple-800">CAPITAL TOTAL DEL EDIFICIO (CAJA + CONDOMINIOS)</td><td className="py-3 px-4 text-right text-purple-800 font-black">{formatBs(balance.total_caja_y_cobrar || (balance.saldo_disponible + balance.total_por_cobrar))}</td><td className="py-3 px-4 text-right text-purple-700 font-black">$ {formatUsd(tasaBCV.dolar > 0 ? (balance.total_caja_y_cobrar || (balance.saldo_disponible + balance.total_por_cobrar)) / tasaBCV.dolar : 0)}</td></tr>
                    
                    <tr className="bg-emerald-50/50 font-bold"><td className="py-2.5 px-4 text-emerald-800" colSpan={3}>III. FONDOS DE RESERVA Y PASIVOS</td></tr>
                    <tr className="bg-gray-50/50"><td className="py-2 px-4 pl-10 font-medium text-gray-600" colSpan={3}>FONDO DE RESERVA GENERAL</td></tr>
                    <tr><td className="py-2 px-4 pl-16 text-gray-600">Acumulado Histórico</td><td className="py-2 px-4 text-right font-medium text-emerald-700">{formatBs(balance.fondo_reserva)}</td><td className="py-2 px-4 text-right text-emerald-600 italic font-medium">$ {formatUsd(tasaBCV.dolar > 0 ? balance.fondo_reserva / tasaBCV.dolar : 0)}</td></tr>
                    
                    <tr className="bg-gray-50/50"><td className="py-2 px-4 pl-10 font-medium text-gray-600" colSpan={3}>PASIVOS LABORALES (PRESTACIONES SOCIALES)</td></tr>
                    <tr><td className="py-2 px-4 pl-16 text-gray-600">Acumulado Histórico</td><td className="py-2 px-4 text-right font-medium text-emerald-700">{formatBs(balance.fondo_prestaciones)}</td><td className="py-2 px-4 text-right text-emerald-600 italic font-medium">$ {formatUsd(tasaBCV.dolar > 0 ? balance.fondo_prestaciones / tasaBCV.dolar : 0)}</td></tr>

                    <tr className="bg-gray-50/50"><td className="py-2 px-4 pl-10 font-medium text-gray-600" colSpan={3}>FONDO TRABAJOS VARIOS / MEJORAS</td></tr>
                    <tr><td className="py-2 px-4 pl-16 text-gray-600">Presupuesto Asignado</td><td className="py-2 px-4 text-right font-medium text-emerald-700">{formatBs(balance.fondo_trabajos_varios)}</td><td className="py-2 px-4 text-right text-emerald-600 italic font-medium">$ {formatUsd(tasaBCV.dolar > 0 ? balance.fondo_trabajos_varios / tasaBCV.dolar : 0)}</td></tr>

                    <tr className="bg-gray-50/50"><td className="py-2 px-4 pl-10 font-medium text-gray-600" colSpan={3}>AJUSTE DIFERENCIA ALICUOTA</td></tr>
                    <tr><td className="py-2 px-4 pl-16 text-gray-600">Diferencia Mensual</td><td className="py-2 px-4 text-right font-medium text-emerald-700">{formatBs(balance.ajuste_alicuota)}</td><td className="py-2 px-4 text-right text-emerald-600 italic font-medium">$ {formatUsd(tasaBCV.dolar > 0 ? balance.ajuste_alicuota / tasaBCV.dolar : 0)}</td></tr>

                    <tr className="bg-gray-50/50"><td className="py-2 px-4 pl-10 font-medium text-gray-600" colSpan={3}>FONDO INTERESES MORATORIOS</td></tr>                    
                    <tr><td className="py-2 px-4 pl-16 text-gray-600">Acumulado por Morosidad</td><td className="py-2 px-4 text-right font-medium text-emerald-700">{formatBs(balance.fondo_intereses)}</td><td className="py-2 px-4 text-right text-emerald-600 italic font-medium">$ {formatUsd(tasaBCV.dolar > 0 ? balance.fondo_intereses / tasaBCV.dolar : 0)}</td></tr>

                    <tr className="bg-gray-50/50"><td className="py-2 px-4 pl-10 font-medium text-gray-600" colSpan={3}>DIFERENCIAL CAMBIARIO (FONDO PROTECCIÓN)</td></tr>
                    <tr><td className="py-2 px-4 pl-16 text-gray-600">Ajuste por Tasa BCV</td><td className="py-2 px-4 text-right font-medium text-emerald-700">{formatBs(balance.fondo_diferencial_cambiario)}</td><td className="py-2 px-4 text-right text-emerald-600 italic font-medium">$ {formatUsd(tasaBCV.dolar > 0 ? balance.fondo_diferencial_cambiario / tasaBCV.dolar : 0)}</td></tr>

                    <tr className="bg-emerald-100 font-bold border-t-2 border-emerald-200"><td className="py-3 px-4 text-emerald-800">SALDO TOTAL RESERVAS ASIGNADAS</td><td className="py-3 px-4 text-right text-emerald-800 font-black">{formatBs(balance.saldo_reservas)}</td><td className="py-3 px-4 text-right text-emerald-700 font-black">$ {formatUsd(tasaBCV.dolar > 0 ? balance.saldo_reservas / tasaBCV.dolar : 0)}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
            )}
          </div>
        )}

        {activeTab === "alicuotas" && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Alicuotas por Unidad</h2>
            {loadingAlicuotas ? (
              <p className="text-gray-500 text-center py-8">Cargando...</p>
            ) : alicuotas.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No hay alicuotas cargadas.</p>
                <p className="text-sm text-gray-400">Las alicuotas se descargan automáticamente en la primera sincronización.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="mb-2 text-xs text-blue-600 font-medium flex items-center gap-1 bg-blue-50 p-2 rounded-lg inline-block">
                  <span>ℹ️</span> Los cambios se guardan automáticamente al editar cualquier campo.
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Unidad</th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Propietario</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Alícuota %</th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Email Principal</th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Email Secundario</th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Telf 1</th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Telf 2</th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {alicuotas.map((a) => (
                      <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-2 px-2 font-bold text-gray-900">{a.unidad}</td>
                        <td className="py-2 px-2 text-gray-600 max-w-[120px] truncate text-xs">{a.propietario || "-"}</td>
                        <td className="py-2 px-2 text-right text-xs">{a.alicuota?.toFixed(5) || "-"}%</td>
                        <td className="py-2 px-1">
                          <input type="text" defaultValue={a.email1 || ""} onBlur={(e) => updateAlicuota(a.id, "email1", e.target.value)} className="w-full text-[10px] border border-gray-200 rounded px-1.5 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500" placeholder="Correo 1" />
                        </td>
                        <td className="py-2 px-1">
                          <input type="text" defaultValue={a.email2 || ""} onBlur={(e) => updateAlicuota(a.id, "email2", e.target.value)} className="w-full text-[10px] border border-gray-200 rounded px-1.5 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500" placeholder="Correo 2" />
                        </td>
                        <td className="py-2 px-1">
                          <input type="text" defaultValue={a.telefono1 || ""} onBlur={(e) => updateAlicuota(a.id, "telefono1", e.target.value)} className="w-full text-[10px] border border-gray-200 rounded px-1.5 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500" placeholder="Telf 1" />
                        </td>
                        <td className="py-2 px-1">
                          <input type="text" defaultValue={a.telefono2 || ""} onBlur={(e) => updateAlicuota(a.id, "telefono2", e.target.value)} className="w-full text-[10px] border border-gray-200 rounded px-1.5 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500" placeholder="Telf 2" />
                        </td>
                        <td className="py-2 px-1">
                          <input type="text" defaultValue={a.observaciones || ""} onBlur={(e) => updateAlicuota(a.id, "observaciones", e.target.value)} className="w-full text-[10px] border border-gray-200 rounded px-1.5 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500" placeholder="Notas" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-bold divide-x divide-white">
                      <td className="py-3 px-2 text-xs uppercase" colSpan={2}>TOTAL UNIDADES Y SUMA</td>
                      <td className="py-3 px-2 text-right text-xs bg-gray-200">{alicuotasCount} APTOS</td>
                      <td className={`py-3 px-2 text-right text-xs ${alicuotaSum >= 99.9 && alicuotaSum <= 100.1 ? "text-green-700" : "text-red-600"}`}>
                        SUMA: {alicuotaSum.toFixed(3)}%
                      </td>
                      <td className="py-3 px-2" colSpan={4}>
                        {alicuotaWarning && (
                          <span className="text-[10px] text-orange-600 uppercase font-black italic">
                            ⚠️ {alicuotaWarning.message}
                          </span>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "alertas" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span>🔔</span> Bit&aacute;cora de Eventos y Alertas
              </h2>
              
              {loadingAlertas || loadingSincronizaciones ? (
                <p className="text-gray-500 text-center py-8">Cargando bit&aacute;cora...</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="py-2 px-4 font-bold text-gray-500 uppercase text-[10px]">Fecha / Hora</th>
                        <th className="py-2 px-4 font-bold text-gray-500 uppercase text-[10px]">Tipo</th>
                        <th className="py-2 px-4 font-bold text-gray-500 uppercase text-[10px]">Estado/Evento</th>
                        <th className="py-2 px-4 font-bold text-gray-500 uppercase text-[10px]">Descripci&oacute;n / Mensaje</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(() => {
                        const unified: LogItem[] = [
                          ...alertas.map(a => ({ ...a, sourceType: 'alerta' as const })),
                          ...sincronizaciones.map(s => ({ ...s, sourceType: 'sync' as const, titulo: 'Sincronización', descripcion: s.error || 'Proceso completado' }))
                        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                        if (unified.length === 0) {
                          return <tr><td colSpan={4} className="py-8 text-center text-gray-500">No hay registros en la bit&aacute;cora.</td></tr>;
                        }

                        return unified.map((item, idx) => {
                          const isError = item.estado === 'error' || item.tipo === 'error';
                          const isWarning = item.tipo === 'warning' || (item as any).tipo_alerta === 'warning';

                          return (
                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-4 text-[10px] text-gray-400 whitespace-nowrap">
                                {new Date(item.created_at).toLocaleString("es-VE")}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                  item.sourceType === 'sync' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {item.sourceType}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  isError ? 'bg-red-100 text-red-700' : 
                                  isWarning ? 'bg-yellow-100 text-yellow-700' : 
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {item.titulo || item.estado || 'OK'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-xs text-gray-600">
                                {item.descripcion}
                                {item.movimientos_nuevos !== undefined && item.movimientos_nuevos > 0 && (
                                  <span className="ml-2 text-[10px] font-bold text-gray-400">({item.movimientos_nuevos} nuevos)</span>
                                )}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "kpis" && (
           <div className="space-y-6">
             {!planInfo?.permissions?.hasKpis ? (
                <UpgradeCard 
                  title="Análisis de Gestión Avanzado" 
                  feature="KPIs, Gráficos de Tendencia y Comparativos" 
                  planRequired="Profesional" 
                  onUpgrade={() => setActiveTab("planes")}
                />
             ) : (
               <>
                 {/* Tarjetas de Métricas USD */}
                 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
               <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center cursor-pointer hover:bg-gray-50" onClick={() => setActiveTab("recibos")}>
                 <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Recibos Pendientes</div>
                 <div className="text-lg font-black text-red-600">$ {formatUsd(recibos.reduce((sum, r) => sum + Number(r.deuda_usd || 0), 0))}</div>
                 <div className="text-[9px] text-gray-400 font-bold uppercase">Bs. {formatBs(recibos.reduce((sum, r) => sum + Number(r.deuda), 0))}</div>
               </div>
               <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center cursor-pointer hover:bg-gray-50" onClick={() => setActiveTab("balance")}>
                 <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Disponible en Caja</div>
                 <div className="text-lg font-black text-blue-600">$ {formatUsd(balance?.saldo_disponible_usd || 0)}</div>
                 <div className="text-[9px] text-gray-400 font-bold uppercase">Bs. {formatBs(balance?.saldo_disponible)}</div>
               </div>
               <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center cursor-pointer hover:bg-gray-50" onClick={() => setActiveTab("balance")}>
                 <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Cuentas por Cobrar</div>
                 <div className="text-lg font-black text-orange-600">$ {formatUsd(balance?.total_por_cobrar_usd || 0)}</div>
                 <div className="text-[9px] text-gray-400 font-bold uppercase">Bs. {formatBs(balance?.total_por_cobrar)}</div>
               </div>
               <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center cursor-pointer hover:bg-gray-50" onClick={() => setActiveTab("balance")}>
                 <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Fondo de Reserva</div>
                 <div className="text-lg font-black text-emerald-600">$ {formatUsd(balance?.fondo_reserva_usd || 0)}</div>
                 <div className="text-[9px] text-gray-400 font-bold uppercase">Bs. {formatBs(balance?.fondo_reserva)}</div>
               </div>
               <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center cursor-pointer hover:bg-gray-50" onClick={() => setActiveTab("balance")}>
                 <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Int. Moratorios</div>
                 <div className="text-lg font-black text-pink-600">$ {formatUsd(balance?.fondo_intereses_usd || 0)}</div>
                 <div className="text-[9px] text-gray-400 font-bold uppercase">Bs. {formatBs(balance?.fondo_intereses)}</div>
               </div>
               <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center cursor-pointer hover:bg-gray-50" onClick={() => setActiveTab("balance")}>
                 <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Dif. Cambiario</div>
                 <div className="text-lg font-black text-indigo-600">$ {formatUsd(balance?.fondo_diferencial_cambiario_usd || 0)}</div>
                 <div className="text-[9px] text-gray-400 font-bold uppercase">Bs. {formatBs(balance?.fondo_diferencial_cambiario)}</div>
               </div>
             </div>

             <div className="grid md:grid-cols-2 gap-6">
               <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                 <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribuci&oacute;n de Unidades con Deuda</h2>                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={(() => {
                          const dist: any = {};
                          recibos.forEach(r => {
                            const n = r.num_recibos || 1;
                            if (!dist[n]) dist[n] = { name: `${n} Recibo${n > 1 ? 's' : ''}`, value: 0 };
                            dist[n].value++;
                          });
                          return Object.values(dist);
                        })()}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value} aptos`}
                      >
                        {recibos.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'][index % 7]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 text-center uppercase font-bold">Cantidad de apartamentos seg&uacute;n n&uacute;mero de recibos pendientes</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribuci&oacute;n por Montos Pendientes</h2>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={(() => {
                          const dist: any = {};
                          recibos.forEach(r => {
                            const n = r.num_recibos || 1;
                            if (!dist[n]) dist[n] = { name: `${n} Recibo${n > 1 ? 's' : ''}`, value: 0 };
                            dist[n].value += Number(r.deuda);
                          });
                          return Object.values(dist);
                        })()}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, value }) => `${name}: Bs. ${formatBs(value)}`}
                      >
                        {recibos.map((_, index) => (
                          <Cell key={`cell-amt-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'][index % 7]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => `Bs. ${formatBs(value)}`} />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 text-center uppercase font-bold">Monto total adeudado (Bs.) distribuido por antig&uuml;edad de deuda</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Flujo de Caja Diario (USD)</h2>
              {loadingKpis ? (
                <p className="text-gray-500 text-center py-8">Cargando...</p>
              ) : kpisData.cashFlow?.length > 0 ? (() => {
                const currentMonth = new Date().toISOString().substring(0, 7);
                const filteredData = kpisData.cashFlow.filter((item: any) => item.fecha.startsWith(currentMonth));
                if (filteredData.length === 0) return <p className="text-gray-500 text-center py-8">No hay datos de flujo de caja para el mes en curso ({currentMonth})</p>;
                return (
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={filteredData} margin={{ top: 10, right: 40, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="fecha"
                      tick={{ fontSize: 9 }}
                      tickFormatter={(v) => v.split("-").slice(1).reverse().join("/")}
                      angle={-45}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 9 }}
                      label={{ value: "Ingresos (USD)", angle: -90, position: "insideLeft", fontSize: 10 }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 9 }}
                      label={{ value: "Egresos (USD)", angle: 90, position: "insideRight", fontSize: 10 }}
                    />
                    <Tooltip
                      formatter={(value: any, name: any) => [`$ ${formatUsd(value as number)}`, name]}
                      contentStyle={{ fontSize: "11px", borderRadius: "8px" }}
                    />
                    <Legend verticalAlign="top" wrapperStyle={{ fontSize: "11px", paddingBottom: "10px" }} />
                    <Bar yAxisId="left" dataKey="ingresos" fill="#10b981" name="Ingresos (USD)" radius={[2, 2, 0, 0]} barSize={15} />
                    <Line yAxisId="right" type="monotone" dataKey="egresos" stroke="#ef4444" name="Egresos (USD)" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
                );
              })() : (
                <p className="text-gray-500 text-center py-8">No hay datos de flujo de caja para este periodo</p>
              )}
              <p className="text-[10px] text-gray-400 mt-2 text-center uppercase font-bold">Datos exclusivos del mes en curso ({new Date().toLocaleString('es-VE', { month: 'long', year: 'numeric' })})</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Evolución Fondos de Reserva Acumulados (USD)</h2>
                {loadingKpis ? (
                  <p className="text-gray-500 text-center py-8">Cargando...</p>
                ) : kpisData.balances?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={kpisData.balances} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{fontSize: 10}} />
                      <YAxis tick={{fontSize: 10}} tickFormatter={(v) => `$${v}`} />
                      <Tooltip formatter={(value: any) => `$${formatUsd(value as number)}`} />
                      <Legend verticalAlign="top" height={36}/>
                      <Area type="monotone" dataKey="fondo_reserva_usd" stackId="1" stroke="#8b5cf6" fill="#c4b5fd" name="F. Reserva" />
                      <Area type="monotone" dataKey="fondo_intereses_usd" stackId="1" stroke="#ec4899" fill="#fbcfe8" name="Int. Moratorios" />
                      <Area type="monotone" dataKey="fondo_diferencial_cambiario_usd" stackId="1" stroke="#06b6d4" fill="#cffafe" name="Dif. Cambiario" />
                      <Area type="monotone" dataKey="fondo_prestaciones_usd" stackId="1" stroke="#f59e0b" fill="#fef3c7" name="Prestaciones" />
                      <Area type="monotone" dataKey="fondo_trabajos_varios_usd" stackId="1" stroke="#10b981" fill="#d1fae5" name="Trabajos Varios" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No hay datos</p>
                )}
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Resultado Operativo Mensual (USD) (Cobranza - Gastos)</h2>
                {loadingKpis ? (
                  <p className="text-gray-500 text-center py-8">Cargando...</p>
                ) : kpisData.balances?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={kpisData.balances} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{fontSize: 10}} />
                      <YAxis tick={{fontSize: 10}} tickFormatter={(v) => `$${v}`} />
                      <Tooltip formatter={(value: any) => [`$${formatUsd(value as number)}`, "Balance"]} />
                      <Legend verticalAlign="top" height={36}/>
                      <Bar dataKey="resultado_mensual_usd" name="Superávit / Déficit ($)">
                        {kpisData.balances.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.resultado_mensual_usd >= 0 ? '#10b981' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No hay datos suficientes</p>
                )}
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Efectividad de Cobranza %</h2>
                  <span className="text-gray-400 cursor-help text-sm" title="Fórmula: Cobranza Mes / (Cobranza Mes + Deuda Pendiente). Indica qué porcentaje del dinero total por cobrar se recuperó este mes. Sano: >50%">ⓘ</span>
                </div>
                {loadingKpis ? (
                  <p className="text-gray-500 text-center py-8">Cargando...</p>
                ) : kpisData.balances?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={kpisData.balances} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} tickFormatter={(v: any) => `${v}%`} />
                      <Tooltip formatter={(value: any) => [`${formatCurrency(value, 2)}%`, "Efectividad"]} />
                      <Legend verticalAlign="top" height={36} />
                      <Line type="monotone" dataKey="efectividad_recaudacion" stroke="#10b981" strokeWidth={3} name="Efectividad %" dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No hay datos</p>
                )}
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">&Iacute;ndice de Morosidad Patrimonial %</h2>
                  <span className="text-gray-400 cursor-help text-sm" title="Fórmula: Deuda Total / (Deuda Total + Caja + Fondos). Indica qué parte del patrimonio del edificio está en deudas. Alarma: >30%">ⓘ</span>
                </div>
                {loadingKpis ? (
                  <p className="text-gray-500 text-center py-8">Cargando...</p>
                ) : kpisData.balances?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={kpisData.balances} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} tickFormatter={(v: any) => `${v}%`} />
                      <Tooltip formatter={(value: any) => [`${formatCurrency(value, 2)}%`, "Morosidad"]} />
                      <Legend verticalAlign="top" height={36} />
                      <Line type="monotone" dataKey="indice_morosidad" stroke="#ef4444" strokeWidth={3} name="Morosidad %" dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No hay datos</p>
                )}
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Cobertura de Gastos %</h2>
                  <span className="text-gray-400 cursor-help text-sm" title="Fórmula: Cobranza Mes / Egresos Facturados. Indica si lo que entró alcanza para pagar las facturas. Sano: >100%">ⓘ</span>
                </div>
                {loadingKpis ? (
                  <p className="text-gray-500 text-center py-8">Cargando...</p>
                ) : kpisData.balances?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={kpisData.balances} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} tickFormatter={(v: any) => `${v}%`} />
                      <Tooltip formatter={(value: any) => [`${formatCurrency(value, 2)}%`, "Cobertura"]} />
                      <Legend verticalAlign="top" height={36} />
                      <Line type="monotone" dataKey="cobertura_gastos" stroke="#8b5cf6" strokeWidth={3} name="Cobertura %" dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No hay datos</p>
                )}
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Evolución de Cobranza Mensual (USD)</h2>
                {loadingKpis ? (
                  <p className="text-gray-500 text-center py-8">Cargando...</p>
                ) : kpisData.balances?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={kpisData.balances} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} tickFormatter={(v: any) => `$${v.toFixed(0)}`} />
                      <Tooltip formatter={(value: any) => [`$${formatUsd(value as number)}`, "Cobranza"]} />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="cobranza_mes_usd" fill="#10b981" name="Cobranza ($)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No hay datos</p>
                )}
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Total Cuentas por Cobrar (USD)</h2>
                {loadingKpis ? (
                  <p className="text-gray-500 text-center py-8">Cargando...</p>
                ) : kpisData.balances?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={kpisData.balances} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} tickFormatter={(v: any) => `$${v.toFixed(0)}`} />
                      <Tooltip formatter={(value: any) => [`$${formatUsd(value as number)}`, "Cuentas por Cobrar"]} />
                      <Legend verticalAlign="top" height={36} />
                      <Area type="monotone" dataKey="total_por_cobrar_usd" stroke="#f59e0b" fill="#fef3c7" name="Por Cobrar ($)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No hay datos</p>
                )}
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Evolución del Saldo Disponible (USD)</h2>
                {loadingKpis ? (
                  <p className="text-gray-500 text-center py-8">Cargando...</p>
                ) : kpisData.balances?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={kpisData.balances} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} tickFormatter={(v: any) => `$${v.toFixed(0)}`} />
                      <Tooltip formatter={(value: any) => [`$${formatUsd(value as number)}`, "Saldo"]} />
                      <Legend verticalAlign="top" height={36} />
                      <Line type="monotone" dataKey="saldo_disponible_usd" stroke="#2563eb" strokeWidth={3} name="Saldo Disponible ($)" dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No hay datos</p>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Cobranza vs Gastos (USD)</h2>
              {loadingKpis ? (
                <p className="text-gray-500 text-center py-8">Cargando...</p>
              ) : kpisData.balances?.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={kpisData.balances} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} barGap={0}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: any) => `$${v.toFixed(0)}`} />
                    <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={(value: any) => [`$${formatUsd(value as number)}`]} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="cobranza_mes_usd" fill="#22c55e" name="Cobranza ($)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="gastos_facturados_usd" fill="#ef4444" name="Gastos ($)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-center py-8">No hay datos suficientes</p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Evolución de Gastos (USD)</h2>
                {loadingKpis ? (
                  <p className="text-gray-500 text-center py-8">Cargando...</p>
                ) : kpisData.balances?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={kpisData.balances} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} tickFormatter={(v: any) => `$${v.toFixed(0)}`} />
                      <Tooltip formatter={(value: any) => [`$${formatUsd(value as number)}`, "Gastos"]} />
                      <Area type="monotone" dataKey="gastos_facturados_usd" stroke="#f97316" fillOpacity={1} fill="url(#colorGastos)" name="Gastos ($)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No hay datos de gastos</p>
                )}
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Egresos por Mes (USD)</h2>
                {loadingKpis ? (
                  <p className="text-gray-500 text-center py-8">Cargando...</p>
                ) : kpisData.egresos?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={kpisData.egresos} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} tickFormatter={(v: any) => `$${v.toFixed(0)}`} />
                      <Tooltip formatter={(value: any) => [`$${formatUsd(value as number)}`, "Egresos"]} />
                      <Bar dataKey="monto_usd" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Egresos ($)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No hay datos de egresos</p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Evolución Fondo de Reserva (USD)</h2>
                {loadingKpis ? (
                  <p className="text-gray-500 text-center py-8">Cargando...</p>
                ) : kpisData.balances?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={kpisData.balances} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} tickFormatter={(v: any) => `$${v.toFixed(0)}`} />
                      <Tooltip formatter={(value: any) => [`$${formatUsd(value as number)}`, "Fondo Reserva"]} />
                      <Line type="monotone" dataKey="fondo_reserva_usd" stroke="#8b5cf6" strokeWidth={2} name="Fondo Reserva ($)" dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No hay datos</p>
                )}
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Evolución Fondo Intereses Moratorios (USD)</h2>
                {loadingKpis ? (
                  <p className="text-gray-500 text-center py-8">Cargando...</p>
                ) : kpisData.balances?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={kpisData.balances} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} tickFormatter={(v: any) => `$${v.toFixed(0)}`} />
                      <Tooltip formatter={(value: any) => [`$${formatUsd(value as number)}`, "Int. Moratorios"]} />
                      <Area type="monotone" dataKey="fondo_intereses_usd" stroke="#ec4899" fill="#fbcfe8" name="Intereses ($)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No hay datos</p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Evolución Diferencial Cambiario (USD)</h2>
                {loadingKpis ? (
                  <p className="text-gray-500 text-center py-8">Cargando...</p>
                ) : kpisData.balances?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={kpisData.balances} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} tickFormatter={(v: any) => `$${v.toFixed(0)}`} />
                      <Tooltip formatter={(value: any) => [`$${formatUsd(value as number)}`, "Dif. Cambiario"]} />
                      <Line type="monotone" dataKey="fondo_diferencial_cambiario_usd" stroke="#06b6d4" strokeWidth={2} name="Dif. Cambiario ($)" dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No hay datos</p>
                )}
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Monto del Recibo por Unidad (USD)</h2>
                {loadingKpis ? (
                  <p className="text-gray-500 text-center py-8">Cargando...</p>
                ) : kpisData.balances?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={kpisData.balances} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} tickFormatter={(v: any) => `$${v.toFixed(0)}`} />
                      <Tooltip formatter={(value: any) => [`$${formatUsd(value as number)}`, "Monto Recibo"]} />
                      <Area type="monotone" dataKey="recibos_mes_usd" stroke="#10b981" fill="#d1fae5" name="Recibo ($)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No hay datos</p>
                )}
              </div>
            </div>
               </>
             )}
          </div>
        )}

        {activeTab === "manual" && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Control Manual de Movimientos Bancarios</h2>
                <p className="text-sm text-gray-500 italic font-medium">Registra movimientos bancarios pendientes por cargar en Web Admin.</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                  {(["todos", "pendientes", "ingresos", "egresos", "ambos"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setManualFilter(f)}
                      className={`px-3 py-1.5 text-[10px] font-black rounded-md transition-all uppercase ${manualFilter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      {f === "todos" ? "Ver Todo" : f === "pendientes" ? "Pendientes" : f === "ingresos" ? "Ingresos" : f === "egresos" ? "Egresos" : "Ambos"}
                    </button>
                  ))}
                </div>
                
                <button onClick={createMovimientoManual} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm text-sm uppercase">
                  + Nuevo Registro
                </button>
              </div>
            </div>
            
            {loadingManual ? (
              <p className="text-gray-500 text-center py-8 font-medium">Cargando registros...</p>
            ) : movimientosManual.length === 0 ? (
              <p className="text-gray-500 text-center py-12 border border-dashed border-gray-200 rounded-lg bg-gray-50">No hay movimientos manuales registrados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b-2 bg-gray-50 uppercase tracking-tighter">
                      <th className="text-left py-3 px-2 font-black text-gray-500">Corte</th>
                      <th className="text-right py-3 px-2 font-black text-gray-500 bg-gray-100">Saldo Inicial</th>
                      <th className="text-right py-3 px-2 font-black text-red-600">Egresos (-)</th>
                      <th className="text-left py-3 px-2 font-bold text-gray-400">Obs Egresos</th>
                      <th className="text-right py-3 px-2 font-black text-green-600">Ingresos (+)</th>
                      <th className="text-left py-3 px-2 font-bold text-gray-400">Obs Ingresos</th>
                      <th className="text-right py-3 px-2 font-black text-blue-700 bg-blue-50">Saldo Final</th>
                      <th className="text-right py-3 px-2 font-black text-gray-500 bg-gray-200">Saldo Acum.</th>
                      <th className="text-center py-3 px-2 font-black text-gray-600">Conciliado?</th>
                      <th className="text-center py-3 px-2 font-black text-gray-400">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {movimientosManual
                      .filter((m: MovimientoManual) => {
                        if (manualFilter === "pendientes") return !m.comparado;
                        if (manualFilter === "ingresos") return (Number(m.ingresos) || 0) > 0;
                        if (manualFilter === "egresos") return (Number(m.egresos) || 0) > 0;
                        if (manualFilter === "ambos") return (Number(m.ingresos) || 0) > 0 && (Number(m.egresos) || 0) > 0;
                        return true;
                      })
                      .map((m: MovimientoManual) => (
                      <tr key={m.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="py-2 px-1">
                          <input type="date" defaultValue={m.fecha_corte} onBlur={(e) => updateMovimientoManual(m.id, "fecha_corte", e.target.value)} className="border-none bg-transparent focus:ring-0 w-24 text-[10px] p-0" />
                        </td>
                        <td className="py-2 px-2 text-right bg-gray-100/50">
                          <input type="number" defaultValue={m.saldo_inicial} onBlur={(e) => updateMovimientoManual(m.id, "saldo_inicial", e.target.value)} className="text-right border-none bg-transparent focus:ring-0 w-full p-0" />
                        </td>
                        <td className="py-2 px-2 text-right bg-red-50/20">
                          <input type="number" defaultValue={m.egresos} onBlur={(e) => updateMovimientoManual(m.id, "egresos", e.target.value)} className="text-right border-none bg-transparent focus:ring-0 w-full p-0 text-red-600 font-black" />
                        </td>
                        <td className="py-2 px-2">
                          <input type="text" defaultValue={m.obs_egresos || ""} onBlur={(e) => updateMovimientoManual(m.id, "obs_egresos", e.target.value)} className="text-left border-none bg-transparent focus:ring-0 w-full p-0 text-[10px] italic text-gray-500" placeholder="..." />
                        </td>
                        <td className="py-2 px-2 text-right bg-green-50/20">
                          <input type="number" defaultValue={m.ingresos} onBlur={(e) => updateMovimientoManual(m.id, "ingresos", e.target.value)} className="text-right border-none bg-transparent focus:ring-0 w-full p-0 text-green-700 font-black" />
                        </td>
                        <td className="py-2 px-2">
                          <input type="text" defaultValue={m.obs_ingresos || ""} onBlur={(e) => updateMovimientoManual(m.id, "obs_ingresos", e.target.value)} className="text-left border-none bg-transparent focus:ring-0 w-full p-0 text-[10px] italic text-gray-500" placeholder="..." />
                        </td>
                        <td className="py-2 px-2 text-right font-black text-blue-800 bg-blue-50/50">{formatBs(m.saldo_final)}</td>
                        <td className="py-2 px-2 text-right font-black text-gray-700 bg-gray-200/30">{formatBs(m.saldo_acumulado)}</td>
                        <td className="py-2 px-1 text-center">
                          <select 
                            value={m.comparado ? "true" : "false"} 
                            onChange={(e) => updateMovimientoManual(m.id, "comparado", e.target.value === "true")}
                            className={`text-[9px] font-black uppercase rounded border p-0.5 w-12 text-center ${m.comparado ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}`}
                          >
                            <option value="true">SI</option>
                            <option value="false">NO</option>
                          </select>
                        </td>
                        <td className="py-2 px-1 text-center">
                          <button onClick={() => deleteMovimientoManual(m.id)} className="text-gray-300 hover:text-red-600 transition-colors" title="Eliminar">🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {movimientosManual.length > 0 && (
                    <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-black text-[10px]">
                      <tr className="uppercase tracking-tighter text-gray-700">
                        <td className="py-3 px-2">TOTALES</td>
                        <td className="bg-gray-100/50"></td>
                        <td className="py-3 px-2 text-right text-red-600 bg-red-50/20">-{formatBs(movimientosManual.reduce((sum, m) => sum + (Number(m.egresos) || 0), 0))}</td>
                        <td></td>
                        <td className="py-3 px-2 text-right text-green-700 bg-green-50/20">+{formatBs(movimientosManual.reduce((sum, m) => sum + (Number(m.ingresos) || 0), 0))}</td>
                        <td></td>
                        <td className="py-3 px-2 text-right text-blue-800 bg-blue-50/50"></td>
                        <td className="py-3 px-2 text-right text-gray-900 bg-gray-200/50">{formatBs(movimientosManual[0]?.saldo_acumulado || 0)}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "informes" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Generador de Reportes Avanzado</h2>
                <div className="flex gap-2">
                   {!hasFeature("export") && (
                     <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-3 py-1 rounded-full uppercase border border-amber-200">
                       Plan Profesional para Exportar
                     </span>
                   )}
                </div>
              </div>
              
              <div className="grid md:grid-cols-4 gap-4 items-end mb-8 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Tipo de Reporte</label>
                  <select 
                    value={reportType} 
                    onChange={(e) => setReportType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  >
                    <option value="resumen">📸 Resumen de Sincronización</option>
                    <option value="movimientos">📊 Movimientos por Rango</option>
                    <option value="gastos">💸 Gastos por Categoría</option>
                    <option value="cuentas_cobrar">⏳ Cuentas por Cobrar (Deuda)</option>
                    <option value="auditoria">⚖️ Reporte de Auditoría</option>
                  </select>
                </div>
                
                {reportType === "resumen" ? (
                  <div className="col-span-1">
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Fecha Específica</label>
                    <input 
                      type="date" 
                      value={informeFecha} 
                      onChange={(e) => setInformeFecha(e.target.value)} 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none"
                    />
                  </div>
                ) : (
                  <>
                    <div className="col-span-1">
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Desde</label>
                      <input 
                        type="date" 
                        value={reportRange.start} 
                        onChange={(e) => setReportRange({...reportRange, start: e.target.value})} 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Hasta</label>
                      <input 
                        type="date" 
                        value={reportRange.end} 
                        onChange={(e) => setReportRange({...reportRange, end: e.target.value})} 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none"
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-2">
                  <button 
                    onClick={loadInforme} 
                    disabled={loadingInforme || (reportType === "resumen" && !informeFecha)}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 text-sm shadow-md transition-all active:scale-95"
                  >
                    {loadingInforme ? "Generando..." : "Ver Reporte"}
                  </button>
                  <button 
                    disabled={!hasFeature("export") || loadingInforme}
                    className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 border transition-all ${hasFeature("export") ? "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm active:scale-95" : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"}`}
                    title={hasFeature("export") ? "Exportar a PDF/Excel" : "Solo disponible en Plan Profesional"}
                  >
                    📥 Exportar
                  </button>
                </div>
              </div>

              {loadingInforme ? (
                <div className="text-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600 mx-auto mb-4"></div>
                  <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Procesando Reporte...</p>
                </div>
              ) : (reportType === "resumen" && (informeData === "not_found" || !informeData)) ? (
                <div className="text-center py-12 border border-dashed rounded-2xl bg-gray-50">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🔎</span>
                  </div>
                  <p className="text-gray-500 font-black uppercase tracking-widest text-xs">No hay datos para esta fecha</p>
                  <p className="text-[10px] text-gray-400 mt-2">Realiza una sincronización para generar la fotografía financiera.</p>
                </div>
              ) : reportType === "resumen" && informeData ? (
                <div className="bg-gray-50 p-8 rounded-2xl border border-gray-200 shadow-inner">
                  <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
                    <h3 className="font-black text-indigo-900 uppercase tracking-tighter text-xl">
                      Fotografía Financiera: {informeFecha.split("-").reverse().join("/")}
                    </h3>
                    <div className="bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase">Sincronizado</div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-x-12 gap-y-4 text-sm font-bold">
                    {[
                      { label: "Saldo Inicial", val: informeData.saldo_inicial_bs, color: "text-gray-600" },
                      { label: "Fondo Reserva", val: informeData.fondo_reserva_bs, color: "text-purple-700" },
                      { label: "Ingresos Detectados", val: informeData.ingresos_bs, color: "text-green-600", prefix: "+" },
                      { label: "Fondo Dif. Cambiario", val: informeData.fondo_dif_camb_bs, color: "text-blue-600" },
                      { label: "Egresos/Gastos", val: informeData.egresos_bs, color: "text-red-600", prefix: "-" },
                      { label: "Fondo Intereses Mor.", val: informeData.fondo_int_mor_bs, color: "text-pink-600" },
                      { label: "Ajustes Varios", val: informeData.ajustes_bs, color: "text-gray-500" },
                      { label: "Total Fondos", val: informeData.total_fondos_bs, color: "text-indigo-700", border: true },
                    ].map((row, i) => (
                      <div key={i} className={`flex justify-between items-center py-2 ${row.border ? "border-t-2 border-indigo-100 mt-2" : "border-b border-gray-200/50"}`}>
                        <span className="text-gray-500 uppercase text-[10px] tracking-widest">{row.label}:</span>
                        <span className={`${row.color} font-black text-base tabular-nums tracking-tighter`}>{row.prefix || ""}{formatBs(row.val)}</span>
                      </div>
                    ))}
                    
                    <div className="md:col-span-2 grid md:grid-cols-2 gap-4 mt-6">
                      <div className="bg-indigo-600 p-4 rounded-xl shadow-lg shadow-indigo-200">
                        <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest mb-1">Saldo Operativo Final</p>
                        <p className="text-white text-2xl font-black tabular-nums tracking-tighter">{formatBs(informeData.saldo_final_bs)}</p>
                      </div>
                      <div className="bg-emerald-600 p-4 rounded-xl shadow-lg shadow-emerald-200">
                        <p className="text-emerald-100 text-[10px] font-black uppercase tracking-widest mb-1">Disponibilidad Total</p>
                        <p className="text-white text-2xl font-black tabular-nums tracking-tighter">{formatBs(informeData.disponibilidad_total_bs)}</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-[10px] text-gray-400 mt-4 col-span-full border-t border-gray-200 pt-4 font-black uppercase tracking-widest">
                      <span>Tasa Aplicada: {informeData.tasa_cambio} Bs/USD</span>
                      <span>Recibos por Cobrar: {informeData.recibos_pendientes} unidades</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-10 rounded-2xl border border-gray-200 text-center">
                  <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-3xl">📋</span>
                  </div>
                  <h3 className="text-indigo-950 font-black text-lg uppercase tracking-tighter mb-2">Vista Previa del Reporte</h3>
                  <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed">Se mostrará el desglose detallado de {reportType} entre el {reportRange.start || "..."} y el {reportRange.end || "..."}.</p>
                  <div className="mt-8 flex justify-center gap-4 opacity-30 grayscale">
                     <div className="h-4 w-32 bg-gray-300 rounded"></div>
                     <div className="h-4 w-24 bg-gray-300 rounded"></div>
                     <div className="h-4 w-40 bg-gray-300 rounded"></div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Gesti&oacute;n de Gastos Recurrentes</h2>
              
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Lista de Gestión */}
                <div className="lg:col-span-1 space-y-4">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider border-b pb-2 flex justify-between items-center">
                    <span>Conceptos Detectados</span>
                    <span className="text-[10px] text-gray-400 normal-case font-normal">Ord. por frecuencia</span>
                  </h3>
                  
                  {/* Formulario Manual */}
                  <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 mb-4">
                    <p className="text-[10px] font-black text-blue-800 uppercase mb-2">Agregar Gasto Manual</p>
                    <div className="flex gap-2 mb-2">
                      <input 
                        type="text" 
                        placeholder="Código" 
                        value={newRecurrente.codigo}
                        onChange={(e) => setNewRecurrente({...newRecurrente, codigo: e.target.value})}
                        className="w-1/4 px-2 py-1.5 text-xs border rounded outline-none focus:ring-1 focus:ring-blue-400"
                      />
                      <input 
                        type="text" 
                        placeholder="Descripción del Gasto" 
                        value={newRecurrente.descripcion}
                        onChange={(e) => setNewRecurrente({...newRecurrente, descripcion: e.target.value})}
                        className="w-3/4 px-2 py-1.5 text-xs border rounded outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </div>
                    <div className="mb-2">
                      <select
                        value={newRecurrente.categoria}
                        onChange={(e) => setNewRecurrente({...newRecurrente, categoria: e.target.value})}
                        className="w-full px-2 py-1.5 text-xs border rounded outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                      >
                        <option value="servicios">Servicios P&uacute;blicos</option>
                        <option value="seguridad">Vigilancia y Seguridad</option>
                        <option value="mantenimiento">Mantenimientos Contratados</option>
                        <option value="recurrentes">Gastos Recurrentes Mensuales</option>
                        <option value="otros">Otros Gastos</option>
                      </select>
                    </div>
                    <button 
                      onClick={addManualRecurrente}
                      disabled={addingRecurrente || !newRecurrente.codigo || !newRecurrente.descripcion}
                      className="w-full py-1.5 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {addingRecurrente ? "Agregando..." : "Registrar Concepto"}
                    </button>
                  </div>

                  <div className="overflow-y-auto max-h-[500px] pr-2 space-y-2">
                    {[...gastosRecurrentes]
                      .sort((a, b) => (b.frecuencia || 0) - (a.frecuencia || 0))
                      .map((g: any, i: number) => (
                      <div key={i} className={`p-3 rounded-lg border transition-all ${g.activo ? 'bg-white border-blue-100 shadow-sm' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex gap-1.5 items-center">
                            <span className="text-[10px] font-mono font-black text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{g.codigo}</span>
                            {g.frecuencia > 0 && (
                              <span className="text-[9px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full" title="Frecuencia histórica">
                                {g.frecuencia} mes{g.frecuencia > 1 ? 'es' : ''}
                              </span>
                            )}
                          </div>
                          <input 
                            type="checkbox" 
                            checked={g.activo} 
                            onChange={(e) => updateRecurrente(g.codigo, g.descripcion, e.target.checked, g.categoria || 'otros')}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                        </div>
                        <p className="text-xs font-bold text-gray-800 leading-tight mb-3">{g.descripcion}</p>
                        <select
                          value={g.categoria || 'otros'}
                          onChange={(e) => updateRecurrente(g.codigo, g.descripcion, g.activo, e.target.value)}
                          className="w-full px-2 py-1 text-[10px] border border-gray-200 rounded-md bg-white font-bold uppercase text-blue-600"
                        >
                          <option value="servicios">Servicios P&uacute;blicos</option>
                          <option value="seguridad">Vigilancia y Seguridad</option>
                          <option value="mantenimiento">Mantenimientos Contratados</option>
                          <option value="recurrentes">Gastos Recurrentes Mensuales</option>
                          <option value="otros">Otros Gastos</option>
                        </select>
                      </div>
                    ))}
                    {gastosRecurrentes.length === 0 && <p className="text-xs text-gray-400 italic text-center py-4">Realiza una sincronizaci&oacute;n para detectar conceptos.</p>}
                  </div>
                </div>

                {/* Evolución y Gráficos */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Evoluci&oacute;n de Gastos Recurrentes</h3>
                    <div className="flex items-center gap-4">
                      <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                        <button 
                          onClick={() => setCurrencyRecurrentes("BS")}
                          className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${currencyRecurrentes === "BS" ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                          BS.
                        </button>
                        <button 
                          onClick={() => setCurrencyRecurrentes("USD")}
                          className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${currencyRecurrentes === "USD" ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                          USD
                        </button>
                      </div>
                      <button onClick={loadEvolucionRecurrentes} className="text-xs text-blue-600 font-bold hover:underline">Refrescar Gr&aacute;ficos</button>
                    </div>
                  </div>
                  
                  {evolucionRecurrentes.length === 0 ? (
                    <div className="bg-gray-50 rounded-xl p-8 text-center border-2 border-dashed border-gray-200">
                      <p className="text-sm text-gray-500 font-medium">No hay datos históricos para los conceptos marcados como activos.</p>
                      <p className="text-[10px] text-gray-400 mt-1 italic">Marca los gastos que quieres monitorear en la lista de la izquierda.</p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="bg-gray-50 p-4 rounded-xl">
                        <h4 className="text-xs font-black text-gray-500 uppercase mb-4 text-center">Inversi&oacute;n Mensual por Categor&iacute;a ({currencyRecurrentes === "BS" ? "Bs." : "USD"})</h4>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={evolucionRecurrentes} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="mes" tick={{fontSize: 10}} />
                            <YAxis tick={{fontSize: 10}} />
                            <Tooltip formatter={(value: any) => currencyRecurrentes === "BS" ? `Bs. ${formatBs(value as number)}` : `$ ${formatUsd(value as number)}`} />
                            <Legend wrapperStyle={{fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase'}} />
                            <Bar dataKey={currencyRecurrentes === "BS" ? "categorias.servicios" : "categorias_usd.servicios"} name="Servicios" stackId="a" fill="#3b82f6" />
                            <Bar dataKey={currencyRecurrentes === "BS" ? "categorias.seguridad" : "categorias_usd.seguridad"} name="Seguridad" stackId="a" fill="#10b981" />
                            <Bar dataKey={currencyRecurrentes === "BS" ? "categorias.mantenimiento" : "categorias_usd.mantenimiento"} name="Mantenimiento" stackId="a" fill="#f59e0b" />
                            <Bar dataKey={currencyRecurrentes === "BS" ? "categorias.recurrentes" : "categorias_usd.recurrentes"} name="Recurrentes" stackId="a" fill="#8b5cf6" />
                            <Bar dataKey={currencyRecurrentes === "BS" ? "categorias.otros" : "categorias_usd.otros"} name="Otros" stackId="a" fill="#94a3b8" />
                          </BarChart>
                        </ResponsiveContainer>
                        {currencyRecurrentes === "USD" && (
                          <p className="text-[9px] text-gray-400 mt-2 italic text-center">* Conversión calculada según tasa histórica mensual registrada en sistema.</p>
                        )}
                      </div>

                      <div className="bg-gray-50 p-4 rounded-xl">
                        <h4 className="text-xs font-black text-gray-500 uppercase mb-4 text-center">Tendencia de Gasto Recurrente Total ({currencyRecurrentes === "BS" ? "Bs." : "USD"})</h4>
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={evolucionRecurrentes} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="mes" tick={{fontSize: 10}} />
                            <YAxis tick={{fontSize: 10}} />
                            <Tooltip formatter={(value: any) => currencyRecurrentes === "BS" ? `Bs. ${formatBs(value as number)}` : `$ ${formatUsd(value as number)}`} />
                            <Line 
                              type="monotone" 
                              dataKey={currencyRecurrentes === "BS" ? "total" : "total_usd"} 
                              stroke={currencyRecurrentes === "BS" ? "#ef4444" : "#059669"} 
                              strokeWidth={3} 
                              name={`Total (${currencyRecurrentes})`} 
                              dot={{ r: 4 }} 
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {hasFeature("audit") ? (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                  Auditor&iacute;a e Integridad Financiera
                </h2>
                <button onClick={loadAudit} className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1">
                  <svg className={`w-3 h-3 ${loadingAudit ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                  Re-evaluar
                </button>
              </div>

              {loadingAudit ? (
                <div className="text-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
                  <p className="text-sm text-gray-500 font-medium">Escaneando inconsistencias en libros contables...</p>
                </div>
              ) : auditAlerts.length === 0 ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6 text-center">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  <h3 className="text-emerald-900 font-bold">Sin Inconsistencias Detectadas</h3>
                  <p className="text-emerald-700 text-xs mt-1">Los registros financieros analizados cumplen con las reglas de integridad b&aacute;sicas.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {auditAlerts.map((alert: any, i: number) => (
                    <div key={i} className={`p-4 rounded-xl border-l-4 shadow-sm ${
                      alert.severidad === 'alta' ? 'bg-red-50 border-red-500 border-y border-r border-red-100' :
                      alert.severidad === 'media' ? 'bg-amber-50 border-amber-500 border-y border-r border-amber-100' :
                      'bg-blue-50 border-blue-500 border-y border-r border-blue-100'
                    }`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          alert.severidad === 'alta' ? 'bg-red-100 text-red-700' :
                          alert.severidad === 'media' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {alert.tipo}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400">Severidad: {alert.severidad}</span>
                      </div>
                      <h4 className="font-bold text-gray-900 text-sm mb-1">{alert.titulo}</h4>
                      <p className="text-xs text-gray-600 leading-relaxed mb-3">{alert.descripcion}</p>
                      
                      {alert.detalles && (
                        <div className="bg-white/50 rounded-lg p-2 mt-2">
                          <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Evidencia Detectada:</p>
                          <div className="space-y-1">
                            {alert.detalles.map((d: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-[10px] border-b border-gray-100 pb-0.5 last:border-0">
                                <span className="text-gray-500 truncate max-w-[150px]">{d.descripcion || d.beneficiario || 'Sin desc.'}</span>
                                <span className="font-mono font-bold text-gray-700">Bs. {formatBs(d.monto)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            ) : (
              <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4 text-2xl font-bold italic">?</div>
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Auditoría e Integridad</h2>
                <p className="text-gray-500 max-w-sm mt-2 text-sm italic font-medium">Esta funcionalidad de análisis avanzado solo está disponible en el Plan Profesional y superiores.</p>
                <button className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100">Mejorar Plan Ahora</button>
              </div>
            )}

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 opacity-60">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Estado de Flujo de Efectivo</h2>
              <p className="text-sm text-gray-500 mb-4">Esta funci&oacute;n est&aacute; en desarrollo y estar&aacute; disponible pr&oacute;ximamente.</p>
              <button disabled className="px-4 py-2 bg-gray-200 text-gray-500 rounded-lg font-bold text-sm cursor-not-allowed">
                Generar Estado de Flujo
              </button>
            </div>
          </div>
        )}

        {activeTab === "junta" && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 uppercase tracking-tighter">Miembros de la Junta de Condominio</h2>
            <div className="grid md:grid-cols-5 gap-4 mb-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Nombre Completo</label>
                <input 
                  type="text" 
                  value={newMiembro.nombre}
                  onChange={(e) => setNewMiembro({...newMiembro, nombre: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" 
                  placeholder="Ej. Juan Perez" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Email de Acceso</label>
                <input 
                  type="email" 
                  value={newMiembro.email}
                  onChange={(e) => setNewMiembro({...newMiembro, email: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" 
                  placeholder="email@ejemplo.com" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Cargo</label>
                <select 
                  value={newMiembro.cargo}
                  onChange={(e) => setNewMiembro({...newMiembro, cargo: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white outline-none"
                >
                  <option value="Presidente">Presidente</option>
                  <option value="Tesorero">Tesorero</option>
                  <option value="Secretario">Secretario</option>
                  <option value="Vocal">Vocal</option>
                  <option value="Administrador">Administrador</option>
                  <option value="Consultor Jurídico">Consultor Jurídico</option>
                  <option value="Copropietario">Copropietario</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Nivel de Acceso</label>
                <select 
                  value={newMiembro.nivelAcceso}
                  onChange={(e) => setNewMiembro({...newMiembro, nivelAcceso: e.target.value as any})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white outline-none font-bold"
                >
                  <option value="viewer">👁️ Solo Visualización</option>
                  <option value="board">📝 Miembro Junta (Edición)</option>
                  <option value="admin">🛠️ Administrador (Full)</option>
                </select>
              </div>
              <div className="flex items-end">
                <button 
                  onClick={addMiembro} 
                  disabled={saving}
                  className="w-full py-2 bg-blue-600 text-white rounded font-black uppercase tracking-widest hover:bg-blue-700 transition-all text-[10px] shadow-lg hover:shadow-blue-200 disabled:opacity-50"
                >
                  {saving ? "Invitando..." : "+ Agregar Miembro"}
                </button>
              </div>
            </div>

            {loadingJunta ? (
              <p className="text-gray-500 text-center py-8 font-medium">Cargando miembros...</p>
            ) : junta.length === 0 ? (
              <p className="text-gray-500 text-center py-12 border border-dashed border-gray-200 rounded-lg">No hay miembros de junta registrados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 font-bold text-gray-600 uppercase text-xs">Nombre</th>
                      <th className="text-left py-3 px-4 font-bold text-gray-600 uppercase text-xs">Email</th>
                      <th className="text-left py-3 px-4 font-bold text-gray-600 uppercase text-xs">Cargo</th>
                      <th className="text-left py-3 px-4 font-bold text-gray-600 uppercase text-xs">Acceso</th>
                      <th className="text-center py-3 px-4 font-bold text-gray-600 uppercase text-xs">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {junta.filter((m: any) => m.email !== "correojago@gmail.com").map((m: any) => (
                      <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 text-gray-900">{m.nombre}</td>
                        <td className="py-3 px-4 text-gray-600">{maskEmail(m.email)}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold uppercase">{m.cargo}</span>
                        </td>
                        <td className="py-3 px-4">
                          {m.nivel_acceso === 'admin' ? (
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-black uppercase">🛠️ Admin</span>
                          ) : m.nivel_acceso === 'board' ? (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold uppercase">📝 Miembro</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px] font-medium uppercase">👁️ Viewer</span>
                          )}
                        </td>

                         <td className="py-3 px-4 text-center">
                           <div className="flex items-center justify-center gap-2">
                             <button 
                               onClick={() => hasFeature("manual_email") && alert("Reporte enviado a " + m.email)}
                               disabled={!hasFeature("manual_email")}
                               className={`p-1.5 rounded-lg transition-colors ${hasFeature("manual_email") ? "text-indigo-600 hover:bg-indigo-50" : "text-gray-300 cursor-not-allowed opacity-30"}`}
                               title={hasFeature("manual_email") ? "Enviar reporte manual por email" : "Solo disponible en Plan Profesional"}
                             >
                               📧
                             </button>
                             <button 
                               onClick={() => user?.isAdmin && deleteMiembro(m.id)} 
                               disabled={!user?.isAdmin}
                               className={`p-1.5 text-red-400 hover:text-red-600 transition-colors ${!user?.isAdmin ? "opacity-30 cursor-not-allowed" : ""}`} 
                               title={user?.isAdmin ? "Eliminar miembro" : "No tienes permisos"}
                             >
                               🗑️
                             </button>
                           </div>
                         </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "flujo-caja" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* RESUMEN EJECUTIVO MEJORADO - Arriba */}
            {(() => {
              const today = new Date();
              const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
              const monthStr = today.toISOString().substring(0, 7);

              // Crear mapa de movimientos por fecha
              const cashFlowMap = new Map();
              (kpisData.cashFlow || []).forEach((item: any) => {
                if (item.fecha) cashFlowMap.set(item.fecha, item);
              });

              // Calcular totales y estadísticas
              let grandTotalIng = 0;
              let grandTotalEgr = 0;
              let maxIng = { dia: 0, monto: 0 };
              let maxEgr = { dia: 0, monto: 0 };
              let week1Ing = 0, week2Ing = 0, week3Ing = 0, week4Ing = 0;
              let week1Egr = 0, week2Egr = 0, week3Egr = 0, week4Egr = 0;

              for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${monthStr}-${d.toString().padStart(2, '0')}`;
                const cashFlowItem = cashFlowMap.get(dateStr);
                const dayIngresos = cashFlowItem?.ingresos || 0;
                const dayEgresos = cashFlowItem?.egresos || 0;

                grandTotalIng += dayIngresos;
                grandTotalEgr += dayEgresos;

                if (dayIngresos > maxIng.monto) maxIng = { dia: d, monto: dayIngresos };
                if (dayEgresos > maxEgr.monto) maxEgr = { dia: d, monto: dayEgresos };

                // Distribución semanal
                if (d <= 7) week1Ing += dayIngresos;
                else if (d <= 15) week2Ing += dayIngresos;
                else if (d <= 22) week3Ing += dayIngresos;
                else week4Ing += dayIngresos;

                if (d <= 7) week1Egr += dayEgresos;
                else if (d <= 15) week2Egr += dayEgresos;
                else if (d <= 22) week3Egr += dayEgresos;
                else week4Egr += dayEgresos;
              }

              const balanceMes = grandTotalIng - grandTotalEgr;
              const pct = (v: number) => grandTotalIng > 0 ? ((v / grandTotalIng) * 100).toFixed(1) : "0.0";
              const pctEgr = (v: number) => grandTotalEgr > 0 ? ((v / grandTotalEgr) * 100).toFixed(1) : "0.0";

              // Preparar datos para gráfico
              const chartData = [];
              for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${monthStr}-${d.toString().padStart(2, '0')}`;
                const cashFlowItem = cashFlowMap.get(dateStr);
                chartData.push({
                  dia: d,
                  ingresos: cashFlowItem?.ingresos || 0,
                  egresos: cashFlowItem?.egresos || 0
                });
              }

              return (
                <>
                  {/* Encabezado */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Estado de Flujo de Efectivo</h2>
                        <p className="text-xs text-indigo-600 font-bold uppercase tracking-widest mt-1">
                          Mes: {new Date().toLocaleString('es-VE', { month: 'long', year: 'numeric' })} | Generado el: {new Date().toLocaleDateString('es-VE')}
                        </p>
                      </div>
                    </div>

                    {/* Resumen Ejecutivo Superior */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl text-white shadow-sm">
                        <div className="text-[9px] font-bold uppercase opacity-80">Total Ingresos</div>
                        <div className="text-lg font-black mt-1">Bs. {formatBs(grandTotalIng)}</div>
                      </div>
                      <div className="bg-gradient-to-br from-red-500 to-red-600 p-4 rounded-xl text-white shadow-sm">
                        <div className="text-[9px] font-bold uppercase opacity-80">Total Egresos</div>
                        <div className="text-lg font-black mt-1">Bs. {formatBs(grandTotalEgr)}</div>
                      </div>
                      <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-4 rounded-xl text-white shadow-sm">
                        <div className="text-[9px] font-bold uppercase opacity-80">Balance del Mes</div>
                        <div className={`text-lg font-black mt-1 ${balanceMes >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                          Bs. {formatBs(balanceMes)}
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-4 rounded-xl text-white shadow-sm">
                        <div className="text-[9px] font-bold uppercase opacity-80">Saldo Final</div>
                        <div className="text-lg font-black mt-1">Bs. {formatBs((balance?.saldo_anterior || 0) + balanceMes)}</div>
                      </div>
                    </div>

                    {/* Distribución Semanal */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
                      <h3 className="text-xs font-black text-gray-500 uppercase mb-3 tracking-widest">Distribución Semanal</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-white p-3 rounded-lg border">
                          <div className="text-[9px] text-gray-400 uppercase font-bold">Días 1-7</div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-green-600 text-xs font-bold">Ing: {pct(week1Ing)}%</span>
                            <span className="text-red-600 text-xs font-bold">Egr: {pctEgr(week1Egr)}%</span>
                          </div>
                          <div className="text-[10px] text-gray-500 mt-1">Bs. {formatBs(week1Ing)} / {formatBs(week1Egr)}</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border">
                          <div className="text-[9px] text-gray-400 uppercase font-bold">Días 8-15</div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-green-600 text-xs font-bold">Ing: {pct(week2Ing)}%</span>
                            <span className="text-red-600 text-xs font-bold">Egr: {pctEgr(week2Egr)}%</span>
                          </div>
                          <div className="text-[10px] text-gray-500 mt-1">Bs. {formatBs(week2Ing)} / {formatBs(week2Egr)}</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border">
                          <div className="text-[9px] text-gray-400 uppercase font-bold">Días 16-22</div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-green-600 text-xs font-bold">Ing: {pct(week3Ing)}%</span>
                            <span className="text-red-600 text-xs font-bold">Egr: {pctEgr(week3Egr)}%</span>
                          </div>
                          <div className="text-[10px] text-gray-500 mt-1">Bs. {formatBs(week3Ing)} / {formatBs(week3Egr)}</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border">
                          <div className="text-[9px] text-gray-400 uppercase font-bold">Días 23-{daysInMonth}</div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-green-600 text-xs font-bold">Ing: {pct(week4Ing)}%</span>
                            <span className="text-red-600 text-xs font-bold">Egr: {pctEgr(week4Egr)}%</span>
                          </div>
                          <div className="text-[10px] text-gray-500 mt-1">Bs. {formatBs(week4Ing)} / {formatBs(week4Egr)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Análisis de Tendencia y Día pico */}
                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                      <div className="bg-indigo-900 hover:bg-indigo-800 transition-colors shadow-lg p-4 rounded-xl text-white">
                        <h3 className="text-xs font-black text-indigo-300 uppercase mb-3 tracking-widest">Análisis de Tendencia</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-500/30 rounded-lg flex items-center justify-center text-xl">📈</div>
                            <div>
                              <div className="text-[9px] text-indigo-300 uppercase">Mayor Ingreso</div>
                              <div className="font-black text-green-400 text-lg">Día {maxIng.dia}</div>
                              <div className="text-[10px] text-indigo-300">Bs. {formatBs(maxIng.monto)}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-500/30 rounded-lg flex items-center justify-center text-xl">📉</div>
                            <div>
                              <div className="text-[9px] text-indigo-300 uppercase">Mayor Egreso</div>
                              <div className="font-black text-red-400 text-lg">Día {maxEgr.dia}</div>
                              <div className="text-[10px] text-indigo-300">Bs. {formatBs(maxEgr.monto)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-xl text-white hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg">
                        <h3 className="text-xs font-black text-purple-200 uppercase mb-3 tracking-widest">Resumen Rápido</h3>
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-black">{cashFlowMap.size}</div>
                            <div className="text-[9px] uppercase opacity-80">Días c/Movimiento</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-black text-green-300">{grandTotalIng > 0 ? ((grandTotalIng / (grandTotalIng + grandTotalEgr)) * 100).toFixed(0) : 0}%</div>
                            <div className="text-[9px] uppercase opacity-80">% Ingresos</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-black text-red-300">{grandTotalEgr > 0 ? ((grandTotalEgr / (grandTotalIng + grandTotalEgr)) * 100).toFixed(0) : 0}%</div>
                            <div className="text-[9px] uppercase opacity-80">% Egresos</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Gráfico de Barras por Día */}
                    {chartData.some(d => d.ingresos > 0 || d.egresos > 0) ? (
                      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
                        <h3 className="text-sm font-black text-gray-700 uppercase mb-4 tracking-widest">Flujo de Caja por Día</h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="dia" tick={{ fontSize: 9 }} stroke="#9ca3af" />
                            <YAxis tick={{ fontSize: 9 }} stroke="#9ca3af" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                            <Tooltip
                              formatter={(value: any, name: any) => [`Bs. ${formatBs(value as number)}`, name === 'ingresos' ? 'Ingresos' : 'Egresos']}
                              contentStyle={{ fontSize: 11, borderRadius: 8 }}
                              labelFormatter={(d) => `Día ${d}`}
                            />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Bar dataKey="ingresos" name="Ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="egresos" name="Egresos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center mb-6">
                        <div className="text-4xl mb-2">📊</div>
                        <p className="text-gray-500 text-sm font-medium">No hay datos de flujo de caja para este mes</p>
                      </div>
                    )}
                  </div>

                  {/* TABLA DE FLUJO DE CAJA - Abajo */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <h3 className="text-lg font-black text-gray-900 uppercase mb-4 tracking-tight">Detalle Diario</h3>
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-[10px] border-collapse">
                        <thead>
                          <tr className="bg-indigo-900 text-white uppercase tracking-tighter">
                            <th className="py-2 px-1 border border-indigo-800">Día</th>
                            <th className="py-2 px-1 border border-indigo-800 text-right">Saldo Inicial</th>
                            <th className="py-2 px-1 border border-indigo-800 text-right">Cobranza</th>
                            <th className="py-2 px-1 border border-indigo-800 text-right">Otros Ing.</th>
                            <th className="py-2 px-1 border border-indigo-800 text-right bg-green-800/50">Total Ing.</th>
                            <th className="py-2 px-1 border border-indigo-800 text-right">Egr. Operat.</th>
                            <th className="py-2 px-1 border border-indigo-800 text-right">Otros Egr.</th>
                            <th className="py-2 px-1 border border-indigo-800 text-right bg-red-800/50">Total Egr.</th>
                            <th className="py-2 px-1 border border-indigo-800 text-right">Ajustes</th>
                            <th className="py-2 px-1 border border-indigo-800 text-right bg-indigo-800">Saldo Final</th>
                          </tr>
                        </thead>
                        <tbody className="font-bold text-gray-700">
                          {(() => {
                            const rows = [];
                            let currentSaldo = balance?.saldo_anterior || 0;

                            for (let d = 1; d <= daysInMonth; d++) {
                              const dateStr = `${monthStr}-${d.toString().padStart(2, '0')}`;
                              const cashFlowItem = cashFlowMap.get(dateStr);
                              const dayIngresos = cashFlowItem?.ingresos || 0;
                              const dayEgresos = cashFlowItem?.egresos || 0;

                              const saldoInicial = currentSaldo;
                              currentSaldo = saldoInicial + dayIngresos - dayEgresos;

                              const hasMovement = dayIngresos > 0 || dayEgresos > 0;

                              rows.push(
                                <tr key={d} className={`${d % 2 === 0 ? 'bg-gray-50' : 'bg-white'} ${hasMovement ? 'hover:bg-indigo-50' : 'text-gray-300'} transition-colors`}>
                                  <td className="py-1 px-1 border text-center font-black text-indigo-900">{d}</td>
                                  <td className="py-1 px-1 border text-right font-mono text-gray-400">{formatBs(saldoInicial)}</td>
                                  <td className={`py-1 px-1 border text-right font-mono ${dayIngresos > 0 ? 'text-green-600' : 'text-gray-300'}`}>{formatBs(dayIngresos)}</td>
                                  <td className="py-1 px-1 border text-right font-mono text-gray-300">0,00</td>
                                  <td className={`py-1 px-1 border text-right font-mono ${dayIngresos > 0 ? 'bg-green-50 text-green-800' : ''}`}>{formatBs(dayIngresos)}</td>
                                  <td className={`py-1 px-1 border text-right font-mono ${dayEgresos > 0 ? 'text-red-600' : 'text-gray-300'}`}>{formatBs(dayEgresos)}</td>
                                  <td className="py-1 px-1 border text-right font-mono text-gray-300">0,00</td>
                                  <td className={`py-1 px-1 border text-right font-mono ${dayEgresos > 0 ? 'bg-red-50 text-red-800' : ''}`}>{formatBs(dayEgresos)}</td>
                                  <td className="py-1 px-1 border text-right font-mono text-gray-300">0,00</td>
                                  <td className={`py-1 px-1 border text-right font-mono ${currentSaldo >= 0 ? 'bg-indigo-50 text-indigo-900' : 'bg-red-50 text-red-700'}`}>{formatBs(currentSaldo)}</td>
                                </tr>
                              );
                            }

                            return (
                              <>
                                {rows}
                                <tr className="bg-indigo-900 text-white uppercase text-[11px]">
                                  <td className="py-2 px-2 font-black">TOTAL</td>
                                  <td className="border border-indigo-800"></td>
                                  <td className="py-2 px-1 border border-indigo-800 text-right font-mono">{formatBs(grandTotalIng)}</td>
                                  <td className="py-2 px-1 border border-indigo-800 text-right font-mono">0,00</td>
                                  <td className="py-2 px-1 border border-indigo-800 text-right font-mono bg-green-700">{formatBs(grandTotalIng)}</td>
                                  <td className="py-2 px-1 border border-indigo-800 text-right font-mono">{formatBs(grandTotalEgr)}</td>
                                  <td className="py-2 px-1 border border-indigo-800 text-right font-mono">0,00</td>
                                  <td className="py-2 px-1 border border-indigo-800 text-right font-mono bg-red-700">{formatBs(grandTotalEgr)}</td>
                                  <td className="py-2 px-1 border border-indigo-800 text-right font-mono">0,00</td>
                                  <td className="py-2 px-1 border border-indigo-800 text-right font-mono bg-indigo-950">{formatBs(currentSaldo)}</td>
                                </tr>
                              </>
                            );
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {activeTab === "pre-recibo" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom duration-500">
            {!planInfo?.permissions?.hasProjections ? (
                <UpgradeCard 
                  title="Generación de Recibos Proyectados" 
                  feature="Borrador de recibo estimado y pre-emisión" 
                  planRequired="Empresarial" 
                  onUpgrade={() => setActiveTab("planes")}
                />
            ) : (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Borrador de Recibo Estimado</h2>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Selecciona los conceptos que integrarán el próximo recibo</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={loadPreReciboData} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-200 transition-all uppercase tracking-widest">
                    {loadingPreRecibo ? "Cargando..." : "🔄 Refrescar Items"}
                  </button>
                  <button 
                    onClick={sendPreReciboEmail} 
                    disabled={sendingEmail || selectedPreReciboIds.size === 0}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-black text-xs hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200 uppercase tracking-widest disabled:opacity-50"
                  >
                    {sendingEmail ? "Enviando..." : "📧 Enviar Borrador"}
                  </button>
                </div>
              </div>

              {emailMessage && (
                <div className={`mb-6 p-4 rounded-xl text-xs font-black uppercase tracking-widest ${emailMessage.includes('✅') ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                  {emailMessage}
                </div>
              )}

              <div className="grid lg:grid-cols-3 gap-8">
                {/* Panel de Selección */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="flex justify-between items-center px-2">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono">Conceptos Disponibles</h3>
                    <div className="flex gap-3">
                      <button onClick={() => setSelectedPreReciboIds(new Set(preReciboItems.map(i => i.id)))} className="text-[9px] font-bold text-blue-600 hover:underline uppercase">Todos</button>
                      <button onClick={() => setSelectedPreReciboIds(new Set())} className="text-[9px] font-bold text-gray-400 hover:underline uppercase">Ninguno</button>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-2xl border border-gray-200 p-2 max-h-[600px] overflow-y-auto custom-scrollbar">
                    {preReciboItems.length === 0 ? (
                      <p className="text-center py-10 text-gray-400 text-xs italic font-medium">No se encontraron gastos o egresos para el mes actual.</p>
                    ) : (
                      <div className="space-y-1">
                        {preReciboItems.map((item) => (
                          <label key={item.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${selectedPreReciboIds.has(item.id) ? 'bg-white border-indigo-200 shadow-sm' : 'bg-transparent border-transparent grayscale opacity-60'}`}>
                            <input 
                              type="checkbox" 
                              className="mt-1 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" 
                              checked={selectedPreReciboIds.has(item.id)}
                              onChange={() => {
                                const newSet = new Set(selectedPreReciboIds);
                                if (newSet.has(item.id)) newSet.delete(item.id);
                                else newSet.add(item.id);
                                setSelectedPreReciboIds(newSet);
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center gap-2 mb-1">
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${item.tipo === 'gasto' ? 'bg-orange-100 text-orange-700' : item.tipo === 'egreso' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                  {item.tipo}
                                </span>
                                <span className="text-[10px] font-black text-gray-900">Bs. {formatBs(item.monto)}</span>
                              </div>
                              <p className="text-xs font-bold text-gray-700 leading-tight line-clamp-2">{item.descripcion}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Panel de Vista Previa (Simulando el Formato del Usuario) */}
                <div className="lg:col-span-2">
                  <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-8 shadow-inner overflow-x-auto">
                    <div className="min-w-[700px]">
                      {/* Cabecera del Reporte */}
                      <div className="text-center mb-8 border-b pb-6">
                        <h1 className="text-xl font-black text-gray-900 uppercase tracking-tighter">PRE-RECIBO DE CONDOMINIO ESTIMADO (E)</h1>
                        <p className="text-indigo-600 font-black text-sm uppercase mt-1">PERÍODO {new Date().toLocaleDateString('es-VE', { month: '2-digit', year: 'numeric' })}</p>
                        <div className="flex justify-center gap-6 mt-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          <span>🏢 {building?.nombre}</span>
                          <span>👥 Total Unidades: {building?.unidades || 0}</span>
                          <span>📊 Alícuota Base: 2.2135%</span>
                        </div>
                      </div>

                      {/* Tabla de Detalle */}
                      <table className="w-full text-xs mb-8">
                        <thead className="bg-gray-100 text-gray-600">
                          <tr>
                            <th className="py-2 px-3 text-left font-black border uppercase">CÓDIGO</th>
                            <th className="py-2 px-3 text-left font-black border uppercase">DESCRIPCIÓN</th>
                            <th className="py-2 px-3 text-right font-black border uppercase">MONTO (Bs)</th>
                            <th className="py-2 px-3 text-right font-black border uppercase">CUOTA PARTE (Bs)</th>
                            <th className="py-2 px-3 text-right font-black border uppercase">TOTAL RECIBO (Bs)</th>
                            <th className="py-2 px-3 text-right font-black border uppercase">USD</th>
                          </tr>
                        </thead>
                        <tbody className="font-medium text-gray-700">
                          {(() => {
                            const selected = preReciboItems.filter(i => selectedPreReciboIds.has(i.id));
                            const subtotal = selected.reduce((sum, i) => sum + i.monto, 0);
                            
                            return (
                              <>
                                {selected.map((item, idx) => {
                                  // Asumimos alícuota promedio 2.2135 para la vista previa de una unidad
                                  const alicuotaRef = 2.2135; 
                                  const cuotaParte = item.monto * (alicuotaRef / 100);
                                  const fondoReserva = cuotaParte * 0.10;
                                  const totalItem = cuotaParte + fondoReserva;
                                  
                                  return (
                                    <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                                      <td className="py-2 px-3 border font-mono text-[10px]">{item.codigo}</td>
                                      <td className="py-2 px-3 border text-[10px] max-w-[200px] truncate">{item.descripcion}</td>
                                      <td className="py-2 px-3 border text-right font-mono">{formatBs(item.monto)}</td>
                                      <td className="py-2 px-3 border text-right font-mono text-gray-400">{formatBs(cuotaParte)}</td>
                                      <td className="py-2 px-3 border text-right font-black text-indigo-700 font-mono">{formatBs(totalItem)}</td>
                                      <td className="py-2 px-3 border text-right font-bold text-green-600 font-mono">${formatUsd(totalItem / (tasaBCV.dolar || 45))}</td>
                                    </tr>
                                  );
                                })}
                                
                                {/* Totales */}
                                <tr className="bg-gray-50">
                                  <td colSpan={2} className="py-3 px-3 border font-black text-right uppercase">TOTAL GASTOS COMUNES:</td>
                                  <td className="py-3 px-3 border text-right font-black font-mono text-base">{formatBs(subtotal)}</td>
                                  <td className="py-3 px-3 border text-right font-bold text-gray-400 font-mono">{formatBs(subtotal * 0.022135)}</td>
                                  <td colSpan={2} className="border"></td>
                                </tr>
                                <tr className="bg-indigo-50/50">
                                  <td colSpan={2} className="py-3 px-3 border font-black text-right uppercase">FONDO DE RESERVA (10%):</td>
                                  <td className="py-3 px-3 border text-right font-black font-mono">{formatBs(subtotal * 0.10)}</td>
                                  <td className="py-3 px-3 border text-right font-bold text-gray-400 font-mono">{formatBs((subtotal * 0.022135) * 0.10)}</td>
                                  <td colSpan={2} className="border"></td>
                                </tr>
                                <tr className="bg-indigo-900 text-white">
                                  <td colSpan={4} className="py-4 px-6 border-none font-black text-right uppercase tracking-widest text-sm">TOTAL ESTIMADO POR APARTAMENTO (2.2135%):</td>
                                  <td className="py-4 px-3 border-none text-right font-black text-lg font-mono">Bs. {formatBs((subtotal * 0.022135) * 1.10)}</td>
                                  <td className="py-4 px-3 border-none text-right font-black text-lg font-mono text-green-300">USD ${formatUsd(((subtotal * 0.022135) * 1.10) / (tasaBCV.dolar || 45))}</td>
                                </tr>
                              </>
                            );
                          })()}
                        </tbody>
                      </table>

                      {/* Desglose por Alícuotas */}
                      <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                        <h3 className="text-xs font-black text-gray-900 uppercase mb-4 tracking-tighter">CÁLCULOS ADICIONALES POR TIPO DE APARTAMENTO</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-[10px]">
                            <thead className="border-b-2 border-gray-300">
                              <tr>
                                <th className="py-2 text-left font-black uppercase">TIPO / ALÍCUOTA</th>
                                <th className="py-2 text-right font-black uppercase">CUOTA PARTE (Bs)</th>
                                <th className="py-2 text-right font-black uppercase">TOTAL (Bs.)</th>
                                <th className="py-2 text-right font-black uppercase">SUB-TOTAL COMUNES</th>
                                <th className="py-2 text-right font-black uppercase">TOTAL USD$</th>
                                <th className="py-2 text-right font-black uppercase">P/APTO USD$</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y font-bold">
                              {(() => {
                                const selected = preReciboItems.filter(i => selectedPreReciboIds.has(i.id));
                                const subtotal = selected.reduce((sum, i) => sum + i.monto, 0);
                                const tasa = tasaBCV.dolar || 45;
                                
                                // Agrupar unidades por alícuota
                                const groups: any = {};
                                alicuotas.forEach(a => {
                                  const val = Number(a.alicuota);
                                  if (!groups[val]) groups[val] = { val, count: 0 };
                                  groups[val].count++;
                                });

                                return Object.values(groups).sort((a:any, b:any) => a.val - b.val).map((group: any) => {
                                  const cpUnit = subtotal * (group.val / 100);
                                  const totalBsGroup = (cpUnit * group.count) * 1.10;
                                  const subTotalComunes = (cpUnit * group.count);
                                  const totalUsdGroup = totalBsGroup / tasa;
                                  
                                  return (
                                    <tr key={group.val} className="hover:bg-white transition-colors">
                                      <td className="py-2 uppercase font-black text-indigo-600">({group.count}) {group.val.toFixed(7)}%</td>
                                      <td className="py-2 text-right font-mono">{formatBs(cpUnit)}</td>
                                      <td className="py-2 text-right font-mono">{formatBs(cpUnit * 1.10)}</td>
                                      <td className="py-2 text-right font-mono text-gray-400">{formatBs(subTotalComunes)}</td>
                                      <td className="py-2 text-right font-mono text-green-600">${formatUsd(totalUsdGroup)}</td>
                                      <td className="py-2 text-right font-mono text-indigo-900 bg-indigo-50/30 font-black">${formatUsd((cpUnit * 1.10) / tasa)}</td>
                                    </tr>
                                  );
                                });
                              })()}
                            </tbody>
                          </table>
                        </div>
                        <div className="mt-6 flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          <span>═ Total Apartamentos: {alicuotas.length} ═</span>
                          <span>═ Tasa USD: {formatBs(tasaBCV.dolar)} Bs/USD ═</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )}

      {activeTab === "instrucciones" && (          <ManualUsuario />
        )}

 
        {activeTab === "planes" && (
          <div className="space-y-6">
            {user?.id !== "superuser-id" && (
              <div className="bg-gradient-to-br from-indigo-900 to-blue-900 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-10 text-9xl">🏢</div>
                <div className="relative z-10">
                  <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">Estado de su Suscripción</h2>
                  <p className="text-indigo-200 font-bold text-sm uppercase tracking-widest mb-8">Edificio: {building?.nombre}</p>
                  
                  <div className="grid md:grid-cols-3 gap-8">
                    <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20">
                      <div className="text-[10px] font-black text-indigo-300 uppercase mb-4 tracking-widest">Plan Actual</div>
                      <div className="text-4xl font-black mb-1">{planInfo?.name}</div>
                      <div className="inline-block px-3 py-1 bg-green-500 text-[10px] font-black uppercase rounded-full mb-4">Suscripción Activa</div>
                      <p className="text-xs text-indigo-100 leading-relaxed">Su edificio cuenta con todas las funcionalidades del nivel {planInfo?.name}.</p>
                    </div>

                    <div className="md:col-span-2 bg-white/5 backdrop-blur-sm p-6 rounded-3xl border border-white/10">
                      <div className="text-[10px] font-black text-indigo-300 uppercase mb-4 tracking-widest">Sugerencia de Mejora</div>
                      <h3 className="text-xl font-bold mb-4">Obtenga Control Estratégico</h3>
                      <p className="text-sm text-indigo-100 mb-6">Suba al plan <span className="font-bold text-white">Empresarial</span> para desbloquear Conciliación Bancaria, Semáforos de Riesgo y Alertas vía WhatsApp para toda la Junta.</p>
                      <button className="bg-amber-400 hover:bg-amber-500 text-amber-950 px-8 py-3 rounded-2xl font-black uppercase tracking-tighter transition-all transform hover:scale-105 shadow-xl shadow-amber-900/20">
                        Contactar Soporte para Upgrade
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {user?.id === "superuser-id" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Configuración de Planes y Precios</h2>
                    <p className="text-sm text-gray-500">Gestiona los planes que se muestran en la página principal</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        const newPlanes = [...planesAdmin, { 
                          id: Date.now().toString(), 
                          name: "Nuevo Plan", 
                          price_monthly: 0, 
                          price_yearly: 0, 
                          features: ["Feature 1"], 
                          is_popular: false, 
                          show_contact: false, 
                          badge_text: "", 
                          display_order: planesAdmin.length 
                        }];
                        setPlanesAdmin(newPlanes);
                      }}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm"
                    >
                      + Agregar Plan
                    </button>
                    <button 
                      onClick={() => saveAdminPlanes(planesAdmin)}
                      disabled={savingPlanesAdmin}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-lg disabled:opacity-50"
                    >
                      {savingPlanesAdmin ? "Guardando..." : "Guardar Cambios"}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {loadingPlanesAdmin ? (
                    <div className="p-12 text-center text-gray-500 font-bold">Cargando planes...</div>
                  ) : planesAdmin.length === 0 ? (
                    <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
                      <p className="text-gray-500 mb-4">No hay planes configurados. Agrega el primero.</p>
                      <button 
                        onClick={() => {
                          const initialPlanes = [
                            { name: "Básico", price_monthly: 19, price_yearly: 190, features: ["Sincronización Diaria de Datos", "Reporte diario automático a la Junta de Condominio con la situación financiera", "Acceso a Reportes Financieros Básicos", "Historial de Datos de 3 meses", "Soporte técnico por email", "Hasta 30 Unidades de Vivienda"], is_popular: false, show_contact: false, badge_text: "", display_order: 0 },
                            { name: "Profesional", price_monthly: 29, price_yearly: 290, features: ["Todo lo incluido en el Plan Básico", "Control financiero y conciliación avanzada", "Reporte diario automático a la Junta de Condominio con la situación financiera", "Historial de Datos de 12 meses", "Exportación de reportes (Excel/PDF)", "Herramientas de Auditoría Financiera", "Reportes e Indicadores Avanzados", "Hasta 50 Unidades de Vivienda"], is_popular: true, show_contact: false, badge_text: "Más popular", display_order: 1 },
                            { name: "Empresarial", price_monthly: 59, price_yearly: 0, features: ["Todo lo incluido en el Plan Profesional", "Unidades de Vivienda Ilimitadas", "Soporte Técnico Prioritario", "Actualizaciones y mejoras continuas incluidas", "Formación y capacitación in situ"], is_popular: false, show_contact: false, badge_text: "", display_order: 2 },
                            { name: "IA (En Desarrollo)", price_monthly: 79, price_yearly: 0, features: ["Todo lo incluido en el Plan Empresarial", "Asistente Virtual con IA", "Análisis Predictivo de Flujo de Caja", "Reportes inteligentes automatizados", "Acceso total a todas las funcionalidades", "Análisis detallado y recomendaciones", "Análisis de morosidad, gastos y proyecciones", "Soporte VIP Personalizado", "Formación continua in situ"], is_popular: false, show_contact: false, badge_text: "En Desarrollo", display_order: 3 }
                          ];
                          setPlanesAdmin(initialPlanes);
                        }}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg"
                      >
                        Cargar Planes por Defecto
                      </button>
                    </div>
                  ) : (
                    planesAdmin.map((plan, idx) => (
                      <div key={plan.id || idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
                        <div className="grid md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Nombre del Plan</label>
                            <input 
                              value={plan.name} 
                              onChange={(e) => {
                                const newPlanes = [...planesAdmin];
                                newPlanes[idx].name = e.target.value;
                                setPlanesAdmin(newPlanes);
                              }}
                              className="w-full px-3 py-2 border rounded-lg font-bold text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Precio Mensual ($)</label>
                            <input 
                              type="number"
                              value={plan.price_monthly} 
                              onChange={(e) => {
                                const newPlanes = [...planesAdmin];
                                newPlanes[idx].price_monthly = Number(e.target.value);
                                setPlanesAdmin(newPlanes);
                              }}
                              className="w-full px-3 py-2 border rounded-lg font-bold text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Precio Anual ($)</label>
                            <input 
                              type="number"
                              value={plan.price_yearly} 
                              onChange={(e) => {
                                const newPlanes = [...planesAdmin];
                                newPlanes[idx].price_yearly = Number(e.target.value);
                                setPlanesAdmin(newPlanes);
                              }}
                              className="w-full px-3 py-2 border rounded-lg font-bold text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Orden</label>
                            <input 
                              type="number"
                              value={plan.display_order} 
                              onChange={(e) => {
                                const newPlanes = [...planesAdmin];
                                newPlanes[idx].display_order = Number(e.target.value);
                                setPlanesAdmin(newPlanes);
                              }}
                              className="w-full px-3 py-2 border rounded-lg font-bold text-sm"
                            />
                          </div>
                        </div>
                        
                        <div className="grid md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Badge (Ej: Más popular)</label>
                            <input 
                              value={plan.badge_text || ""} 
                              onChange={(e) => {
                                const newPlanes = [...planesAdmin];
                                newPlanes[idx].badge_text = e.target.value;
                                setPlanesAdmin(newPlanes);
                              }}
                              className="w-full px-3 py-2 border rounded-lg font-bold text-sm text-blue-600"
                            />
                          </div>
                          <div className="flex items-center gap-2 pt-6">
                            <input 
                              type="checkbox"
                              checked={plan.is_popular}
                              onChange={(e) => {
                                const newPlanes = [...planesAdmin];
                                newPlanes[idx].is_popular = e.target.checked;
                                setPlanesAdmin(newPlanes);
                              }}
                              id={`pop-${idx}`}
                            />
                            <label htmlFor={`pop-${idx}`} className="text-xs font-bold text-gray-700">Popular</label>
                          </div>
                          <div className="flex items-center gap-2 pt-6">
                            <input 
                              type="checkbox"
                              checked={plan.show_contact}
                              onChange={(e) => {
                                const newPlanes = [...planesAdmin];
                                newPlanes[idx].show_contact = e.target.checked;
                                setPlanesAdmin(newPlanes);
                              }}
                              id={`cont-${idx}`}
                            />
                            <label htmlFor={`cont-${idx}`} className="text-xs font-bold text-gray-700">Mostrar "Contactar"</label>
                          </div>
                          <div className="flex justify-end pt-4">
                            <button 
                              onClick={() => {
                                const newPlanes = planesAdmin.filter((_, i) => i !== idx);
                                setPlanesAdmin(newPlanes);
                              }}
                              className="text-red-500 text-xs font-bold uppercase"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Características (una por línea)</label>
                          <textarea 
                            value={plan.features.join("\n")} 
                            onChange={(e) => {
                              const newPlanes = [...planesAdmin];
                              newPlanes[idx].features = e.target.value.split("\n");
                              setPlanesAdmin(newPlanes);
                            }}
                            rows={4}
                            className="w-full px-3 py-2 border rounded-lg font-bold text-sm"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

      {activeTab === "configuracion" && building && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Datos del Edificio</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">Nombre</label>
                  <div className="text-gray-900 font-bold">{building.nombre}</div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">Dirección</label>
                  <div className="text-gray-900 text-sm">{building.direccion || "-"}</div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">Unidades (Apartamentos)</label>
                  <input 
                    type="number" 
                    value={editConfig.unidades} 
                    disabled={!user?.isAdmin}
                    onChange={(e) => setEditConfig({ ...editConfig, unidades: parseInt(e.target.value) || 0 })} 
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-bold ${showUnitsAlert ? 'border-red-500 bg-red-50 animate-pulse' : 'border-gray-300 bg-white'} ${!user?.isAdmin ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`}
                  />
                  {showUnitsAlert && (
                    <p className="text-[10px] text-red-600 font-bold mt-1 uppercase">Suma alícuotas errónea ({alicuotaSum.toFixed(2)}%). Verifica unidades.</p>
                  )}
                </div>
              </div>
            </div>

            {syncMessage && (
              <div className={`p-4 rounded-xl font-bold text-sm shadow-sm border ${syncMessage.includes("❌") ? "bg-red-50 text-red-700 border-red-200" : "bg-green-50 text-green-700 border-green-200"}`}>
                {syncMessage}
              </div>
            )}

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuración de Integración Web Admin</h2>
              
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de Administradora</label>
                    <select
                      value={editConfig.admin_nombre || "La Ideal C.A."}
                      disabled={!user?.isAdmin}
                      onChange={(e) => updateAdminAndUrls(e.target.value)}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white ${!user?.isAdmin ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`}
                    >
                      {administradoras.length > 0 ? (
                        <>
                          {administradoras.map(adm => (
                            <option key={adm.id} value={adm.nombre}>{adm.nombre}</option>
                          ))}
                          <option value="Otra">Otra (Manual)</option>
                        </>
                      ) : (
                        <>
                          <option value="La Ideal C.A.">La Ideal C.A.</option>
                          <option value="Admastridcarrasquel">Administradora AC. Condominios, C.A.</option>
                          <option value="Administradora Elite">Administradora Elite</option>
                          <option value="Intercanar">Intercanariven</option>
                          <option value="Admactual">Administradora Actual, C.A.</option>
                          <option value="Condominios Chacao">Condominios Chacao</option>
                          <option value="Obelisco">Obelisco</option>
                          <option value="Administradora GCM">Administradora GCM</option>
                          <option value="Otra">Otra (Manual)</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Clave de Acceso (Portal Web)</label>
                    <input
                      type="password"
                      value={editConfig.admin_secret}
                      disabled={!user?.isAdmin}
                      onChange={(e) => setEditConfig({ ...editConfig, admin_secret: e.target.value })}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${!user?.isAdmin ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`}
                      placeholder="Contraseña del portal"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">URLs de Scraping (Configuración Avanzada)</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">URL Login</label>
                      <div className="flex gap-2">
                        <input type="text" value={editConfig.url_login} disabled={!user?.isAdmin} onChange={(e) => setEditConfig({ ...editConfig, url_login: e.target.value })} className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs bg-gray-50" />
                        {editConfig.url_login && (
                          <a href={editConfig.url_login} target="_blank" rel="noopener noreferrer" className="px-2 py-1.5 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200">Ver</a>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">URL Recibos (Pendientes)</label>
                      <div className="flex gap-2">
                        <input type="text" value={editConfig.url_recibos} disabled={!user?.isAdmin} onChange={(e) => setEditConfig({ ...editConfig, url_recibos: e.target.value })} className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs bg-gray-50" />
                        {editConfig.url_recibos && (
                          <a href={editConfig.url_recibos} target="_blank" rel="noopener noreferrer" className="px-2 py-1.5 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200">Ver</a>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">URL Recibo del Mes (?r=4)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editConfig.url_recibo_mes}
                          disabled={!user?.isAdmin}
                          placeholder="https://[dominio]/condlin.php?r=4"
                          onChange={(e) => setEditConfig({ ...editConfig, url_recibo_mes: e.target.value })}                        className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs bg-gray-50"
                        />
                        {editConfig.url_recibo_mes && (
                          <a href={editConfig.url_recibo_mes} target="_blank" rel="noopener noreferrer" className="px-2 py-1.5 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200">Ver</a>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">                      <label className="text-[10px] font-bold text-gray-500 uppercase">URL Egresos</label>
                      <div className="flex gap-2">
                        <input type="text" value={editConfig.url_egresos} disabled={!user?.isAdmin} onChange={(e) => setEditConfig({ ...editConfig, url_egresos: e.target.value })} className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs bg-gray-50" />
                        {editConfig.url_egresos && (
                          <a href={editConfig.url_egresos} target="_blank" rel="noopener noreferrer" className="px-2 py-1.5 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200">Ver</a>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">URL Gastos</label>
                      <div className="flex gap-2">
                        <input type="text" value={editConfig.url_gastos} disabled={!user?.isAdmin} onChange={(e) => setEditConfig({ ...editConfig, url_gastos: e.target.value })} className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs bg-gray-50" />
                        {editConfig.url_gastos && (
                          <a href={editConfig.url_gastos} target="_blank" rel="noopener noreferrer" className="px-2 py-1.5 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200">Ver</a>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">URL Balance</label>
                      <div className="flex gap-2">
                        <input type="text" value={editConfig.url_balance} disabled={!user?.isAdmin} onChange={(e) => setEditConfig({ ...editConfig, url_balance: e.target.value })} className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs bg-gray-50" />
                        {editConfig.url_balance && (
                          <a href={editConfig.url_balance} target="_blank" rel="noopener noreferrer" className="px-2 py-1.5 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200">Ver</a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Opciones de Sincronizaci&oacute;n</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <label className={`flex items-center gap-2 ${user?.isAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                      <input type="checkbox" disabled={!user?.isAdmin} checked={editConfig.sync_recibos} onChange={(e) => setEditConfig({ ...editConfig, sync_recibos: e.target.checked })} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                      <span className="text-sm text-gray-700">Recibos</span>
                    </label>
                    <label className={`flex items-center gap-2 ${user?.isAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                      <input type="checkbox" disabled={!user?.isAdmin} checked={editConfig.sync_egresos} onChange={(e) => setEditConfig({ ...editConfig, sync_egresos: e.target.checked })} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                      <span className="text-sm text-gray-700">Egresos</span>
                    </label>
                    <label className={`flex items-center gap-2 ${user?.isAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                      <input type="checkbox" disabled={!user?.isAdmin} checked={editConfig.sync_gastos} onChange={(e) => setEditConfig({ ...editConfig, sync_gastos: e.target.checked })} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                      <span className="text-sm text-gray-700">Gastos</span>
                    </label>
                    <label className={`flex items-center gap-2 ${user?.isAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                      <input type="checkbox" disabled={!user?.isAdmin} checked={editConfig.sync_alicuotas} onChange={(e) => setEditConfig({ ...editConfig, sync_alicuotas: e.target.checked })} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                      <span className="text-sm text-gray-700">Alicuotas</span>
                    </label>
                    <label className={`flex items-center gap-2 ${user?.isAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                      <input type="checkbox" disabled={!user?.isAdmin} checked={editConfig.sync_balance} onChange={(e) => setEditConfig({ ...editConfig, sync_balance: e.target.checked })} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                      <span className="text-sm text-gray-700">Balance</span>
                    </label>
                  </div>
                  <div className="mt-4">
                    <button 
                      onClick={handleSync} 
                      disabled={syncing || !hasIntegration} 
                      className="w-full md:w-auto px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 uppercase text-xs"
                    >
                      {syncing ? "Sincronizando..." : "Ejecutar Sincronizaci\u00f3n Seleccionada"}
                    </button>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Destinatarios de Informe por Email</h3>
                  <div>
                    <input
                      type="text"
                      value={editConfig.email_junta}
                      disabled={!user?.isAdmin}
                      onChange={(e) => setEditConfig({ ...editConfig, email_junta: e.target.value })}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent ${!user?.isAdmin ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`}
                      placeholder="correo1@gmail.com, correo2@gmail.com"
                    />
                    <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold italic">SOPORTA MÚLTIPLES CORREOS SEPARADOS POR COMA (,)</p>
                  </div>
                </div>

                {emailMessage && (
                  <div className={`mb-4 p-3 rounded-lg text-xs font-bold ${emailMessage.includes('✅') ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                    {emailMessage}
                  </div>
                )}

                <div className="border-t pt-6 flex flex-wrap gap-4">
                  {!user?.isAdmin && (
                    <div className="w-full mb-2 p-3 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg text-[10px] font-black uppercase tracking-widest text-center">
                      ⚠️ MODO CONSULTA: Solo un Administrador puede modificar los parámetros del sistema.
                    </div>
                  )}
                  {user?.isAdmin && (
                    <>
                      <button onClick={handleSaveConfig} disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 uppercase text-xs">
                        {saving ? "Guardando..." : "Guardar Configuración"}
                      </button>
                      <button onClick={handleTestConnection} disabled={saving} className="px-6 py-2.5 bg-white text-blue-600 border border-blue-600 rounded-lg font-bold hover:bg-blue-50 transition-colors uppercase text-xs shadow-sm">
                        Probar Conexión
                      </button>
                    </>
                  )}
                  <button onClick={sendWhatsAppReport} disabled={sendingEmail || !editConfig.email_junta} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 uppercase text-xs">
                    {sendingEmail ? "Enviando..." : "Reporte -> Whatsapp"}
                  </button>
                  <button onClick={() => sendEmailToJunta(false)} disabled={sendingEmail || !editConfig.email_junta} className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50 uppercase text-xs ml-auto">
                    {sendingEmail ? "Enviando..." : "Enviar Informe Ahora"}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-gray-100 p-6 rounded-xl border border-gray-200 shadow-inner">
               <h3 className="text-sm font-black text-gray-700 mb-4 uppercase tracking-tighter flex items-center gap-2">
                 <span>📅</span> Sincronización por Mes Específico
               </h3>
               
               <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
                 <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-3 tracking-widest">¿Qué descargar de este mes?</h4>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <label className={`flex items-center gap-2 ${user?.isAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                      <input type="checkbox" disabled={!user?.isAdmin} checked={editConfig.sync_recibos} onChange={(e) => setEditConfig({ ...editConfig, sync_recibos: e.target.checked })} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                      <span className="text-xs font-bold text-gray-700">Recibos</span>
                    </label>
                    <label className={`flex items-center gap-2 ${user?.isAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                      <input type="checkbox" disabled={!user?.isAdmin} checked={editConfig.sync_egresos} onChange={(e) => setEditConfig({ ...editConfig, sync_egresos: e.target.checked })} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                      <span className="text-sm text-gray-700 font-bold">Egresos</span>
                    </label>
                    <label className={`flex items-center gap-2 ${user?.isAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                      <input type="checkbox" disabled={!user?.isAdmin} checked={editConfig.sync_gastos} onChange={(e) => setEditConfig({ ...editConfig, sync_gastos: e.target.checked })} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                      <span className="text-xs font-bold text-gray-700">Gastos</span>
                    </label>
                    <label className={`flex items-center gap-2 ${user?.isAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                      <input type="checkbox" disabled={!user?.isAdmin} checked={editConfig.sync_balance} onChange={(e) => setEditConfig({ ...editConfig, sync_balance: e.target.checked })} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                      <span className="text-xs font-bold text-gray-700">Balance</span>
                    </label>
                  </div>
               </div>

               <div className="flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Seleccionar Mes/Año</label>
                    <div className="flex gap-2">
                      <select 
                        disabled={!user?.isAdmin}
                        value={syncMes.split('-')[0]} 
                        onChange={(e) => {
                          const year = syncMes.split('-')[1] || new Date().getFullYear().toString();
                          setSyncMes(`${e.target.value}-${year}`);
                        }}
                        className={`flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white ${!user?.isAdmin ? 'bg-gray-50 text-gray-400' : ''}`}
                      >
                        <option value="">Mes</option>
                        {["01","02","03","04","05","06","07","08","09","10","11","12"].map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <select 
                        disabled={!user?.isAdmin}
                        value={syncMes.split('-')[1]} 
                        onChange={(e) => {
                          const month = syncMes.split('-')[0] || "01";
                          setSyncMes(`${month}-${e.target.value}`);
                        }}
                        className={`flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white ${!user?.isAdmin ? 'bg-gray-50 text-gray-400' : ''}`}
                      >
                        <option value="">Año</option>
                        {[2024, 2025, 2026].map(y => (
                          <option key={y} value={y.toString()}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">O escribir (MM-YYYY)</label>
                    <input type="text" disabled={!user?.isAdmin} value={syncMes} onChange={(e) => setSyncMes(e.target.value)} className={`w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 ${!user?.isAdmin ? 'bg-gray-50 text-gray-400' : ''}`} placeholder="03-2026" />
                  </div>
                  <button onClick={handleSyncMes} disabled={!user?.isAdmin || syncingMes || !syncMes} className={`px-6 py-2 rounded-lg font-bold transition-colors uppercase text-xs h-[38px] shadow-sm ${!user?.isAdmin ? 'bg-gray-300 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                    {syncingMes ? "Sincronizando..." : "Descargar Mes Histórico"}
                  </button>
               </div>
               <p className="text-[10px] text-gray-500 mt-2 italic font-black uppercase tracking-tighter">Útil para recuperar datos de meses anteriores cerrados en el portal.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-tight flex items-center gap-2">
                <span>⏰</span> Programación de Tareas Automáticas
              </h2>
              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 space-y-6">
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-indigo-100 shadow-sm">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Estado del Reporte Automático</h3>
                    <p className="text-xs text-gray-500">Activa o desactiva el envío diario del informe por email.</p>
                  </div>
                  <button
                    onClick={() => setEditConfig({ ...editConfig, cron_enabled: !editConfig.cron_enabled })}
                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${editConfig.cron_enabled ? 'bg-green-100 text-green-700 border-2 border-green-200' : 'bg-gray-100 text-gray-400 border-2 border-gray-200'}`}
                  >
                    {editConfig.cron_enabled ? '● ACTIVO' : '○ INACTIVO'}
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white p-4 rounded-lg border border-indigo-100 shadow-sm">
                    <h4 className="text-[10px] font-bold text-indigo-400 uppercase mb-3">Hora de Ejecución (VET)</h4>
                    <input
                      type="time"
                      value={editConfig.cron_time}
                      onChange={(e) => setEditConfig({ ...editConfig, cron_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-indigo-100 shadow-sm">
                    <h4 className="text-[10px] font-bold text-indigo-400 uppercase mb-3">Frecuencia de Envío</h4>
                    <select
                      value={editConfig.cron_frequency}
                      onChange={(e) => setEditConfig({ ...editConfig, cron_frequency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    >
                      <option value="diaria">DIARIA</option>
                      <option value="semanal">SEMANAL</option>
                      <option value="mensual">MENSUAL</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-indigo-100/50 rounded-lg">
                  <p className="text-[10px] text-indigo-700 font-bold mb-2">URL DEL SERVICIO (ENDPOINT CRON):</p>
                  <div className="bg-white p-2 rounded border border-indigo-200 font-mono text-[9px] break-all text-indigo-600 select-all">
                    {window.location.origin}/api/cron
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-4 italic font-bold uppercase tracking-tighter">
                Nota: El envío automático utiliza los emails configurados en la pestaña &quot;Junta&quot;. Si hay un error, se notificará a correojago@gmail.com.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-tight">Mantenimiento de la Plataforma</h2>              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex-1">
                  <h3 className="text-blue-800 font-bold mb-1">Mantenimiento de Base de Datos Supabase</h3>
                  <p className="text-xs text-blue-600 leading-relaxed font-medium">
                    Realiza una operaci&oacute;n de mantenimiento preventivo para optimizar el rendimiento de las tablas, compactar el almacenamiento y reindexar los datos. 
                    Al finalizar, se enviar&aacute; un reporte detallado a <strong>correojago@gmail.com</strong>.
                  </p>
                </div>
                <div className="flex-shrink-0 flex flex-col items-center gap-2">
                  <button
                    onClick={handleMaintenance}
                    disabled={maintenanceLoading}
                    className={`px-6 py-2.5 rounded-lg font-black uppercase text-xs shadow-sm transition-all flex items-center gap-2 ${
                      maintenanceLoading 
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                      : "bg-indigo-600 text-white hover:bg-indigo-700 active:transform active:scale-95"
                    }`}
                  >
                    {maintenanceLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Ejecutando...
                      </>
                    ) : (
                      "Ejecutar Mantenimiento"
                    )}
                  </button>
                </div>
              </div>
              {maintenanceMessage && (
                <div className={`mt-4 p-3 rounded-lg text-sm font-bold border ${maintenanceMessage.includes("❌") ? "bg-red-50 border-red-100 text-red-700" : "bg-green-50 border-green-100 text-green-700"}`}>
                  {maintenanceMessage}
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Detalle de Datos Almacenados Off-line</h3>
                <button onClick={loadDataSummary} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-blue-600" title="Refrescar disponibilidad">
                  <span className={loadingDataSummary ? "animate-spin inline-block" : ""}>🔄</span>
                </button>
              </div>

              {loadingDataSummary ? (
                <p className="text-gray-500 text-center py-8">Analizando tablas de datos...</p>
              ) : dataSummary.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No hay datos almacenados en las tablas locales.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="py-2 px-3 font-bold text-gray-600 uppercase text-[10px]">Mes / Bloque</th>
                        <th className="py-2 px-3 font-bold text-gray-600 uppercase text-[10px] text-center">Recibos</th>
                        <th className="py-2 px-3 font-bold text-gray-600 uppercase text-[10px] text-center">Gastos</th>
                        <th className="py-2 px-3 font-bold text-gray-600 uppercase text-[10px] text-center">Egresos</th>
                        <th className="py-2 px-3 font-bold text-gray-600 uppercase text-[10px] text-center">Balance</th>
                        <th className="py-2 px-3 font-bold text-gray-600 uppercase text-[10px] text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {dataSummary.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-3 font-black text-indigo-600 uppercase text-xs">{item.mes}</td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.recibos > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                              {item.recibos}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.gastos > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                              {item.gastos}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.egresos > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                              {item.egresos}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.balances > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                              {item.balances > 0 ? 'SÍ' : 'NO'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button 
                              onClick={() => user?.isAdmin && deleteSync('', item.mes)}
                              disabled={!user?.isAdmin}
                              className={`text-red-500 hover:text-red-700 font-bold text-xs uppercase flex items-center justify-end gap-1 ml-auto group ${!user?.isAdmin ? 'opacity-30 cursor-not-allowed' : ''}`}
                            >
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity">Eliminar Mes</span>
                              <span className="text-base">🗑️</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-[10px] text-gray-400 mt-6 uppercase font-bold italic">
                ESTA TABLA REFLEJA LA DATA REAL ALMACENADA EN LA BASE DE DATOS. AL ELIMINAR UN MES, SE BORRAN TODOS LOS REGISTROS ASOCIADOS (RECIBOS, GASTOS, EGRESOS Y BALANCES) DE ESE PERIODO.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Bienvenida e Instrucciones */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in duration-500 border-4 border-white">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-10 text-center text-white relative">
              <div className="absolute top-0 right-0 p-6 opacity-10 text-8xl">🏢</div>
              <div className="text-6xl mb-4 drop-shadow-lg">👋</div>
              <h2 className="text-3xl font-black uppercase tracking-tighter leading-none mb-2">¡Bienvenido al Sistema!</h2>
              <p className="text-indigo-100 font-bold text-sm uppercase tracking-widest">Su edificio ha sido registrado satisfactoriamente</p>
            </div>
            
            <div className="p-10 space-y-8">
              <div className="space-y-6">
                <div className="flex gap-6 items-start group">
                  <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-2xl flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform">1</div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-1">Primer Paso: Sincronización</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">Pulse el botón <span className="font-black text-indigo-600">SINCRONIZAR</span> para descargar los datos actuales en línea disponibles en la página web de su administradora.</p>
                  </div>
                </div>

                <div className="flex gap-6 items-start group">
                  <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center font-black text-2xl flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform">2</div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-1">Segundo Paso: Miembros de Junta</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">Para agregar miembros de la Junta de Condominio, simplemente agréguelos en la pestaña <span className="font-black text-blue-600">JUNTA</span>. Recibirán un email para crear su propia clave de acceso.</p>
                  </div>
                </div>

                <div className="p-6 bg-amber-50 rounded-3xl border-2 border-amber-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5 text-6xl">⚠️</div>
                  <h4 className="text-xs font-black text-amber-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span>📢</span> IMPORTANTE
                  </h4>
                  <p className="text-amber-800 text-xs leading-relaxed font-medium">
                    Toda la información mostrada proviene de la página web de su administradora. La disponibilidad y actualización de los datos depende de la eficacia con la que su administradora actualice su portal web.
                  </p>
                </div>
              </div>

              <button 
                onClick={completeOnboarding}
                className="w-full bg-indigo-600 text-white py-5 rounded-2xl text-xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95 uppercase tracking-tighter"
              >
                ¡Entendido, comencemos! 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      </main>

      {/* Modal Cambio de Clave Obligatorio */}
      {showPasswordChange && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="bg-indigo-600 p-6 text-center text-white">
              <div className="text-4xl mb-2">🔒</div>
              <h2 className="text-xl font-black uppercase tracking-tight">Cambio de Clave Obligatorio</h2>
              <p className="text-indigo-100 text-xs mt-1">Por seguridad, debes personalizar tu contraseña para acceder al sistema.</p>
            </div>
            
            <form onSubmit={handlePasswordChange} className="p-8 space-y-4">
              {passwordError && (
                <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs font-bold text-center">
                  {passwordError}
                </div>
              )}
              
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Nueva Contraseña</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono"
                  placeholder="Mínimo 6 caracteres"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Confirmar Contraseña</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono"
                  placeholder="Repite la contraseña"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200 disabled:opacity-50"
              >
                {saving ? "Actualizando..." : "Activar mi Cuenta"}
              </button>
            </form>
            
            <div className="p-4 bg-gray-50 text-center border-t">
              <button 
                onClick={() => router.push('/logout')}
                className="text-xs font-bold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest"
              >
                Cancelar y Salir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
