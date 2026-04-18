"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from "recharts";

type Tab = "resumen" | "ingresos" | "movimientos" | "egresos" | "gastos" | "recibos" | "balance" | "alicuotas" | "alertas" | "edificio" | "configuracion" | "manual" | "kpis" | "instrucciones" | "junta";

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
  url_egresos: string | null;
  url_gastos: string | null;
  url_balance: string | null;
  ultima_sincronizacion: string | null;
  sync_recibos?: boolean;
  sync_egresos?: boolean;
  sync_gastos?: boolean;
  sync_alicuotas?: boolean;
  email_junta?: string | null;
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

interface Recibo {
  id: string;
  unidad: string;
  propietario: string;
  num_recibos: number;
  deuda: number;
  deuda_usd?: number;
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
}

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("resumen");
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState<Building | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [syncing, setSyncing] = useState(false);
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
  const [movimientosManual, setMovimientosManual] = useState<any[]>([]);
  const [loadingManual, setLoadingManual] = useState(false);
  const [alicuotas, setAlicuotas] = useState<Alicuota[]>([]);
  const [loadingAlicuotas, setLoadingAlicuotas] = useState(false);
  const [alicuotasCount, setAlicuotasCount] = useState(0);
  const [alicuotaSum, setAlicuotaSum] = useState(0);
  const [alicuotaWarning, setAlicuotaWarning] = useState<any>(null);
  const [kpisData, setKpisData] = useState<any>({ egresos: [], gastos: [], balances: [], movimientos: [] });
  const [loadingKpis, setLoadingKpis] = useState(false);
  const [junta, setJunta] = useState<any[]>([]);
  const [loadingJunta, setLoadingJunta] = useState(false);
  const [sincronizaciones, setSincronizaciones] = useState<any[]>([]);
  const [loadingSincronizaciones, setLoadingSincronizaciones] = useState(false);
  const [tasaBCV, setTasaBCV] = useState({ dolar: 0, euro: 0, fecha: "" });
  const [loadingTasa, setLoadingTasa] = useState(false);
  const [selectedMes, setSelectedMes] = useState<string>("");
  const [selectedUnidad, setSelectedUnidad] = useState<string>("");
  const [reciboDetalle, setReciboDetalle] = useState<any[]>([]);
  const [loadingRecibo, setLoadingRecibo] = useState(false);
  const [syncMes, setSyncMes] = useState("");
  const [syncingMes, setSyncingMes] = useState(false);
  const [editConfig, setEditConfig] = useState({
    admin_id: "",
    admin_secret: "",
    admin_nombre: "La Ideal C.A.",
    url_login: "",
    url_recibos: "",
    url_egresos: "",
    url_gastos: "",
    url_balance: "",
    email_junta: "",
    sync_recibos: true,
    sync_egresos: true,
    sync_gastos: true,
    sync_alicuotas: true,
  });
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");

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
        if (data.building) {
          setEditConfig({
            admin_id: data.building.admin_id || "",
            admin_secret: data.building.admin_secret || "",
            admin_nombre: data.building.admin_nombre || "La Ideal C.A.",
            url_login: data.building.url_login || "",
            url_recibos: data.building.url_recibos || "",
            url_egresos: data.building.url_egresos || "",
            url_gastos: data.building.url_gastos || "",
            url_balance: data.building.url_balance || "",
            email_junta: data.building.email_junta || "",
            sync_recibos: data.building.sync_recibos !== false,
            sync_egresos: data.building.sync_egresos !== false,
            sync_gastos: data.building.sync_gastos !== false,
            sync_alicuotas: data.building.sync_alicuotas !== false,
          });
        }
      } catch (error) {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [router]);

  useEffect(() => {
    if (building?.id) {
      loadMovements();
      loadGastosSummary();
      loadEgresosSummary();
      loadIngresosSummary();
      loadRecibos();
      loadBalance();
      loadAlicuotas();
    }
    loadTasaBCV();
  }, [building?.id]);

  const loadMovements = async () => {
    if (!building?.id) return;
    setLoadingMovements(true);
    try {
      // Get current month for filtering
      const today = new Date();
      const currentMes = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      // Get all movements for current month (gastos + egresos)
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
    if (activeTab === "ingresos" && building?.id) {
      loadIngresosData();
    }
    if (activeTab === "movimientos" && building?.id) {
      loadMovements();
      loadMovimientosDia();
    }
    if (activeTab === "recibos" && building?.id) {
      loadRecibos();
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
    if (activeTab === "junta" && building?.id) {
      loadJunta();
    }
    if (activeTab === "alertas" && building?.id) {
      loadSincronizaciones();
    }
  }, [activeTab, building?.id]);

  const loadRecibos = async () => {
    if (!building?.id) return;
    setLoadingRecibos(true);
    try {
      const res = await fetch(`/api/recibos?edificioId=${building.id}`);
      const data = await res.json();
      if (res.ok && data.recibos) {
        setRecibos(data.recibos);
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
      const res = await fetch(`/api/movimientos-dia?edificioId=${building.id}`);
      const data = await res.json();
      if (res.ok && data.movimientos) {
        setMovimientosDia(data.movimientos);
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
      console.log("DEBUG: Loading gastos for building:", building.id);
      const res = await fetch(`/api/gastos-summary?edificioId=${building.id}`);
      const data = await res.json();
      console.log("DEBUG gastos result:", res.status, data);
      if (res.ok) {
        setGastosSummary(data);
      }
    } catch (error) {
      console.error("Error loading gastos summary:", error);
    }
  };

  const loadEgresosSummary = async () => {
    if (!building?.id) return;
    try {
      console.log("DEBUG: Loading egresos for building:", building.id);
      const res = await fetch(`/api/egresos-summary?edificioId=${building.id}`);
      const data = await res.json();
      console.log("DEBUG egresos result:", res.status, data);
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
      console.log("DEBUG: Loading ingresos for building:", building.id);
      const res = await fetch(`/api/ingresos-summary?edificioId=${building.id}`);
      const data = await res.json();
      console.log("DEBUG ingresos result:", res.status, data);
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

  const loadBalance = async () => {
    if (!building?.id) return;
    setLoadingBalance(true);
    try {
      const res = await fetch(`/api/balance?edificioId=${building.id}`);
      const data = await res.json();
      if (res.ok && data.balance) {
        setBalance(data.balance);
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
        setMovimientosManual(data.movimientos);
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
        setKpisData(data);
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

  const loadReciboDetalle = async () => {
    if (!building?.id) return;
    setLoadingRecibo(true);
    try {
      const params = new URLSearchParams({ edificioId: building.id });
      if (selectedMes) params.append("mes", selectedMes);
      if (selectedUnidad) params.append("unidad", selectedUnidad);
      const res = await fetch(`/api/recibo-detalle?${params}`);
      const data = await res.json();
      if (res.ok && data.detalles) {
        setReciboDetalle(data.detalles);
      }
    } catch (error) {
      console.error("Error loading recibo detalle:", error);
    } finally {
      setLoadingRecibo(false);
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
    try {
      const res = await fetch(`/api/sincronizaciones?edificioId=${building.id}`);
      const data = await res.json();
      if (res.ok && data.sincronizaciones) {
        setSincronizaciones(data.sincronizaciones);
      }
    } catch (error) {
      console.error("Error loading sincronizaciones:", error);
    } finally {
      setLoadingSincronizaciones(false);
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

  const updateMovimientoManual = async (id: string, field: string, value: string | number) => {
    try {
      const movimiento = movimientosManual.find((m: any) => m.id === id);
      if (!movimiento) return;
      
      const newValues = { ...movimiento, [field]: value };
      
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
        setMovimientosManual(movimientosManual.map(m => m.id === id ? { ...m, [field]: value } : m));
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
        setMovimientosManual([data.movimiento, ...movimientosManual]);
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
        setMovimientosManual(movimientosManual.filter((m: any) => m.id !== id));
      }
    } catch (error) {
      console.error("Error deleting movimiento:", error);
    }
  };

  const addMiembro = async () => {
    if (!building?.id) return;
    const email = (document.getElementById("newEmail") as HTMLInputElement)?.value;
    const nombre = (document.getElementById("newNombre") as HTMLInputElement)?.value;
    const cargo = (document.getElementById("newCargo") as HTMLSelectElement)?.value;
    const telefono = (document.getElementById("newTelefono") as HTMLInputElement)?.value;
    if (!email) {
      alert("Ingrese el email");
      return;
    }
    try {
      const res = await fetch("/api/junta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edificio_id: building.id, email, nombre, cargo, telefono }),
      });
      if (res.ok) {
        loadJunta();
        (document.getElementById("newEmail") as HTMLInputElement).value = "";
        (document.getElementById("newNombre") as HTMLInputElement).value = "";
        (document.getElementById("newTelefono") as HTMLInputElement).value = "";
      }
    } catch (error) {
      console.error("Error adding miembro:", error);
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

  const loadEgresos = async () => {
    if (!building?.id) return;
    setLoadingEgresos(true);
    try {
      const res = await fetch(`/api/egresos?edificioId=${building.id}`);
      const data = await res.json();
      if (res.ok && data.egresos) {
        setEgresos(data.egresos);
      }
    } catch (error) {
      console.error("Error loading egresos:", error);
    } finally {
      setLoadingEgresos(false);
    }
  };

  const loadGastos = async () => {
    if (!building?.id) return;
    setLoadingGastos(true);
    try {
      const res = await fetch(`/api/gastos?edificioId=${building.id}`);
      const data = await res.json();
      if (res.ok && data.gastos) {
        setGastos(data.gastos);
      }
    } catch (error) {
      console.error("Error loading gastos:", error);
    } finally {
      setLoadingGastos(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    
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
      setActiveTab("resumen");
    } catch (error: any) {
      alert(error.message);
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
        body: JSON.stringify({ userId: user?.id }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Error al sincronizar");
      }
      
      setSyncMessage(data.message || "Sincronización completada");
      
      if (data.nuevos > 0) {
        loadMovements();
        loadGastosSummary();
        loadEgresosSummary();
        loadIngresosSummary();
        loadRecibos();
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
        body: JSON.stringify({ userId: user?.id, mes: syncMes }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Error al sincronizar");
      }
      
      setSyncMessage(data.message || `Sincronización completada para ${syncMes}`);
      
      if (data.nuevos > 0) {
        loadMovements();
        loadEgresos();
        loadRecibos();
      }
    } catch (error: any) {
      setSyncMessage(error.message);
    } finally {
      setSyncingMes(false);
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
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <span className="font-bold text-lg text-gray-800">CondominioSaaS</span>
            </Link>
            <span className="text-gray-300">|</span>
            <span className="text-gray-700 font-medium">{building?.nombre || "Mi Edificio"}</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-sm text-gray-500">
              {building?.ultima_sincronizacion 
                ? `Última sincronización: ${new Date(building.ultima_sincronizacion).toLocaleString("es-VE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`
                : "Sin sincronizar"}
            </div>
            <div className="text-sm font-medium text-green-700 flex items-center gap-2">
              {loadingTasa ? (
                <span className="text-gray-400">Cargando...</span>
              ) : tasaBCV.dolar > 0 ? (
                <button onClick={loadTasaBCV} className="hover:bg-gray-100 rounded px-1" title="Actualizar tasa">
                  🔄 Tasa BCV: Bs. {formatBs(tasaBCV.dolar)}/$ al {tasaBCV.fecha ? new Date(tasaBCV.fecha).toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit" }) : "N/A"}
                </button>
              ) : (
                <button onClick={loadTasaBCV} className="text-gray-400 hover:bg-gray-100 rounded px-1" title="Actualizar tasa">
                  🔄 Tasa BCV: N/A
                </button>
              )}
            </div>
            <button onClick={() => setActiveTab("instrucciones")} className="text-sm text-blue-600 hover:text-blue-800">
              ❓ Ayuda
            </button>
            <Link href="/logout" className="text-sm text-gray-600 hover:text-gray-800">
              Cerrar sesión
            </Link>
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">{userInitial}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab("resumen")}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === "resumen"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Resumen
          </button>
          <button
            onClick={() => setActiveTab("ingresos")}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === "ingresos"
                ? "bg-green-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Ingresos
          </button>
          <button
            onClick={() => setActiveTab("movimientos")}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === "movimientos"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Movimientos
          </button>
          <button
            onClick={() => setActiveTab("egresos")}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === "egresos"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Egresos
          </button>
          <button
            onClick={() => setActiveTab("gastos")}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === "gastos"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Gastos
          </button>
          <button
            onClick={() => setActiveTab("recibos")}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === "recibos"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Recibos
          </button>
          <button
            onClick={() => setActiveTab("balance")}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === "balance"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Balance
          </button>
          <button
            onClick={() => setActiveTab("alicuotas")}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === "alicuotas"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Alicuotas
          </button>
          <button
            onClick={() => setActiveTab("alertas")}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === "alertas"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Alertas
          </button>
          <button
            onClick={() => setActiveTab("kpis")}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === "kpis"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            KPIs
          </button>
          <button
            onClick={() => setActiveTab("manual")}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === "manual"
                ? "bg-yellow-600 text-white"
                : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
            }`}
          >
            Ing/Egr Manual
          </button>
          <button
            onClick={() => setActiveTab("junta")}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === "junta"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Junta
          </button>
          <button
            onClick={() => setActiveTab("configuracion")}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === "configuracion"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Configuración
          </button>
        </div>

        {activeTab === "resumen" && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50" onClick={() => setActiveTab("balance")}>
                <div className="text-sm text-gray-500 mb-1">Saldo Disponible seg&uacute;n Web Admin</div>
                <div className="text-2xl font-bold text-blue-600">Bs.{(balance?.saldo_disponible || 0).toLocaleString("es-ES", { minimumFractionDigits: 2 })}</div>
                {tasaBCV.dolar > 0 && <div className="text-sm text-gray-400">$ {((balance?.saldo_disponible || 0) / tasaBCV.dolar).toLocaleString("es-ES", { minimumFractionDigits: 2 })}</div>}
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50" onClick={() => setActiveTab("balance")}>
                <div className="text-sm text-gray-500 mb-1">Cobranza del Mes</div>
                <div className="text-2xl font-bold text-green-600">Bs.{(balance?.cobranza_mes || ingresosSummary.monto).toLocaleString("es-ES", { minimumFractionDigits: 2 })}</div>
                {tasaBCV.dolar > 0 && <div className="text-sm text-gray-400">$ {((balance?.cobranza_mes || ingresosSummary.monto) / tasaBCV.dolar).toLocaleString("es-ES", { minimumFractionDigits: 2 })}</div>}
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50" onClick={() => setActiveTab("egresos")}>
                <div className="text-sm text-gray-500 mb-1">Gastos del Mes</div>
                <div className="text-2xl font-bold text-orange-600">Bs.{(balance?.gastos_facturados || gastosSummary.monto).toLocaleString("es-ES", { minimumFractionDigits: 2 })}</div>
                {tasaBCV.dolar > 0 && <div className="text-sm text-gray-400">$ {((balance?.gastos_facturados || gastosSummary.monto) / tasaBCV.dolar).toLocaleString("es-ES", { minimumFractionDigits: 2 })}</div>}
                <div className="text-xs text-gray-400 mt-1">
                  {gastosSummary.cantidad} movimiento{gastosSummary.cantidad !== 1 ? "s" : ""}
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50" onClick={() => setActiveTab("balance")}>
                <div className="text-sm text-gray-500 mb-1">Fondo Reserva</div>
                <div className="text-2xl font-bold text-purple-600">Bs.{(balance?.fondo_reserva || 0).toLocaleString("es-ES", { minimumFractionDigits: 2 })}</div>
                {tasaBCV.dolar > 0 && <div className="text-sm text-gray-400">$ {((balance?.fondo_reserva || 0) / tasaBCV.dolar).toLocaleString("es-ES", { minimumFractionDigits: 2 })}</div>}
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50" onClick={() => setActiveTab("egresos")}>
                <div className="text-sm text-gray-500 mb-1">Egresos del Mes</div>
                <div className="text-2xl font-bold text-red-600">
                  Bs.{formatBs(egresosSummary.monto)}
                </div>
                {tasaBCV.dolar > 0 && <div className="text-sm text-gray-400">$ {formatUsd(egresosSummary.monto / tasaBCV.dolar)}</div>}
                <div className="text-xs text-gray-400 mt-1">
                  {egresosSummary.cantidad} movimiento{egresosSummary.cantidad !== 1 ? "s" : ""}
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50" onClick={() => setActiveTab("recibos")}>
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
              <div className="bg-white p-6 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50" onClick={() => setActiveTab("manual")}>
                <div className="text-sm text-gray-500 mb-1">Saldo Manual</div>
                <div className="text-2xl font-bold text-indigo-600">
                  Bs. {formatBs(movimientosManual.length > 0 ? movimientosManual[0].saldo_final : 0)}
                </div>
                <div className="text-sm text-gray-500">
                  $ {formatUsd(movimientosManual.length > 0 ? movimientosManual[0].saldo_final_usd : 0)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {movimientosManual.length} registro{movimientosManual.length !== 1 ? "s" : ""}
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50" onClick={() => setActiveTab("manual")}>
                <div className="text-sm text-gray-500 mb-1">Por Conciliar</div>
                <div className="text-2xl font-bold text-amber-600">
                  {(() => {
                    const noContemplados = movimientosManual.filter((m: any) => !m.comparado).length;
                    return noContemplados;
                  })()}
                </div>
                <div className="text-xs text-gray-500">
                  registro{(() => { const n = movimientosManual.filter((m: any) => !m.comparado).length; return n !== 1 ? "s" : ""; })()}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Bs. {formatBs(movimientosManual.filter((m: any) => !m.comparado).reduce((sum, m) => sum + Number(m.saldo_final || 0), 0))}
                </div>
                <div className="text-sm text-gray-500">
                  $ {formatUsd(movimientosManual.filter((m: any) => !m.comparado).reduce((sum, m) => sum + Number(m.saldo_final_usd || 0), 0))}
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Movimientos de Hoy ({new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })})</h2>
                <button
                  onClick={handleSync}
                  disabled={syncing || !hasIntegration}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {syncing ? "Sincronizando..." : "Sincronizar Ahora"}
                </button>
              </div>
              {syncMessage && (
                <div className={`mb-4 p-3 rounded-lg ${syncMessage.includes("Error") ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
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
                <p className="text-gray-500 text-center py-8">
                  No hay movimientos hoy. {hasIntegration ? "Haz clic en sincronizar para obtener datos." : "Configura la integración primero."}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Tipo</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Descripción</th>
                        <th className="text-right py-2 px-3 text-sm font-medium text-gray-500">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimientosDia.map((m: any) => (
                        <tr key={m.id} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              m.tipo === "recibo" ? "bg-green-200 text-green-800" : 
                              m.tipo === "gasto" ? "bg-orange-200 text-orange-800" : "bg-red-200 text-red-800"
                            }`}>
                              {m.tipo === "recibo" ? "Recibo" : m.tipo === "gasto" ? "Gasto" : "Egreso"}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-gray-800">{m.descripcion}</td>
                          <td className={`py-2 px-3 text-right font-bold ${
                            m.tipo === "recibo" ? "text-green-600" : "text-red-600"
                          }`}>
                            {m.tipo === "recibo" ? "+" : "-"}Bs. {formatCurrency(m.monto)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-100 font-bold">
                        <td className="py-2 px-3" colSpan={2}>TOTALES DEL DÍA</td>
                        <td className={`py-2 px-3 text-right ${
                          movimientosDia.filter((m: any) => m.tipo === "recibo").reduce((s, m) => s + Number(m.monto), 0) -
                          movimientosDia.filter((m: any) => m.tipo !== "recibo").reduce((s, m) => s + Number(m.monto), 0) >= 0 ? "text-green-600" : "text-red-600"
                        }`}>
                          Bs. {formatCurrency(
                            movimientosDia.filter((m: any) => m.tipo === "recibo").reduce((s, m) => s + Number(m.monto), 0) -
                            movimientosDia.filter((m: any) => m.tipo !== "recibo").reduce((s, m) => s + Number(m.monto), 0)
                          )}
                        </td>
                      </tr>
                      <tr className="text-sm text-gray-500">
                        <td className="py-1 px-3" colSpan={2}>
                          <span className="text-green-600">Ingresos: Bs. {formatCurrency(movimientosDia.filter((m: any) => m.tipo === "recibo").reduce((s, m) => s + Number(m.monto), 0))}</span>
                          <span className="mx-2">|</span>
                          <span className="text-red-600">Egresos: Bs. {formatCurrency(movimientosDia.filter((m: any) => m.tipo !== "recibo").reduce((s, m) => s + Number(m.monto), 0))}</span>
                        </td>
                        <td className="py-1 px-3 text-right text-gray-500">
                          {movimientosDia.length} registro{movimientosDia.length !== 1 ? "s" : ""}
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
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pagos de Condominio por Unidad</h2>
            <p className="text-sm text-gray-500 mb-4">Estado de pagos de recibos del mes - Comparación entre sync actual y anterior</p>
            {loadingIngresos ? (
              <p className="text-gray-500 text-center py-8">Cargando...</p>
            ) : ingresosData.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No hay datos de pagos. Sincroniza datos desde la sección de configuración.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Unidad</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Propietario</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">#Recibos</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Monto Bs</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Monto USD</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingresosData.map((pago: any) => (
                      <tr key={pago.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{pago.unidad}</td>
                        <td className="py-3 px-4 text-gray-600">{pago.propietario || "-"}</td>
                        <td className="py-3 px-4 text-right text-gray-900">{pago.numRecibos}</td>
                        <td className="py-3 px-4 text-right text-gray-600">
                          Bs. {formatCurrency(pago.montoBs)}
                        </td>
                        <td className="py-3 px-4 text-right text-green-600 font-medium">
                          $ {formatCurrency(pago.montoUsd)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs ${
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
            {/* Movimientos del día */}
            {movimientosDia.length > 0 && (
              <div className="bg-green-50 p-6 rounded-xl shadow-sm border border-green-200">
                <h2 className="text-lg font-semibold text-green-800 mb-4">📊 Movimientos del Día</h2>
                <p className="text-sm text-green-700 mb-4">Nuevos movimientos detectados hoy:</p>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-green-200">
                        <th className="text-left py-2 px-3 text-sm font-medium text-green-700">Tipo</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-green-700">Descripción</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-green-700">Unidad</th>
                        <th className="text-right py-2 px-3 text-sm font-medium text-green-700">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimientosDia.map((m: any) => (
                        <tr key={m.id} className="border-b border-green-100">
                          <td className="py-2 px-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              m.tipo === "pago" ? "bg-green-200 text-green-800" : 
                              m.tipo === "recibo" ? "bg-green-200 text-green-800" : 
                              m.tipo === "gasto" ? "bg-orange-200 text-orange-800" : "bg-red-200 text-red-800"
                            }`}>
                              {m.tipo === "pago" ? "Pago" : m.tipo === "recibo" ? "Recibo" : m.tipo === "gasto" ? "Gasto" : "Egreso"}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-gray-800">{m.descripcion}</td>
                          <td className="py-2 px-3 text-gray-600">{m.unidad_apartamento || "-"}</td>
                          <td className={`py-2 px-3 text-right font-bold ${
                            m.tipo === "pago" || m.tipo === "recibo" ? "text-green-600" : "text-red-600"
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

            {/* Todos los movimientos */}
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Historial de Movimientos del Mes</h2>
              {loadingMovements ? (
                <p className="text-gray-500 text-center py-8">Cargando...</p>
              ) : movements.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No hay movimientos este mes. Sincroniza datos desde la sección de configuración.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <div className="text-sm text-gray-500 mb-2">
                    Total: {movements.length} movimiento{movements.length !== 1 ? "s" : ""}
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Fecha</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Tipo</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Descripción</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Unidad</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Monto Bs.</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Monto USD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map((mov) => (
                        <tr key={mov.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 text-gray-900">{mov.fecha}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              mov.tipo === "pago" ? "bg-green-100 text-green-700" :
                              mov.tipo === "recibo" ? "bg-green-100 text-green-700" : 
                              mov.tipo === "gasto" ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"
                            }`}>
                              {mov.tipo === "pago" ? "Pago" : mov.tipo === "recibo" ? "Recibo" : mov.tipo === "gasto" ? "Gasto" : "Egreso"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600">{mov.descripcion}</td>
                          <td className="py-3 px-4 text-gray-500">{mov.unidad_apartamento || mov.unidad || "-"}</td>
                          <td className={`py-3 px-4 text-right font-medium ${
                            mov.tipo === "pago" || mov.tipo === "recibo" ? "text-green-600" : "text-red-600"
                          }`}>
                            {mov.tipo === "pago" || mov.tipo === "recibo" ? "+" : "-"}Bs.{Number(mov.monto || 0).toLocaleString("es-ES", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-500">
                            $ {Number(mov.monto_usd || mov.monto / tasaBCV.dolar || 0).toLocaleString("es-ES", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "recibos" && (
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recibos Pendientes por Unidad</h2>
            {loadingRecibos ? (
              <p className="text-gray-500 text-center py-8">Cargando...</p>
            ) : recibos.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No hay recibos pendientes. Sincroniza datos desde la sección de configuración.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Unidad</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Propietario</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">#Recibos</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Deuda USD</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Deuda Bs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recibos.map((recibo) => (
                      <tr key={recibo.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{recibo.unidad}</td>
                        <td className="py-3 px-4 text-gray-600">{recibo.propietario}</td>
                        <td className="py-3 px-4 text-right text-gray-900">{recibo.num_recibos}</td>
                        <td className="py-3 px-4 text-right text-red-600 font-medium">
                          ${Number(recibo.deuda_usd || 0).toLocaleString("es-ES", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right text-red-600 font-medium">
                          Bs.{Number(recibo.deuda).toLocaleString("es-ES", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-semibold">
                      <td className="py-3 px-4" colSpan={2}>TOTAL</td>
                      <td className="py-3 px-4 text-right">{recibos.reduce((sum, r) => sum + r.num_recibos, 0)}</td>
                      <td className="py-3 px-4 text-right text-red-600">
                        ${recibos.reduce((sum, r) => sum + Number(r.deuda_usd || 0), 0).toLocaleString("es-ES", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right text-red-600">
                        Bs.{recibos.reduce((sum, r) => sum + Number(r.deuda), 0).toLocaleString("es-ES", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "egresos" && (
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Egresos Generales</h2>
            {loadingEgresos ? (
              <p className="text-gray-500 text-center py-8">Cargando...</p>
            ) : egresos.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No hay egresos registrados.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Fecha</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Beneficiario</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Operación</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">USD</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Bolivares</th>
                    </tr>
                  </thead>
                  <tbody>
                    {egresos.filter((e: any) => !e.isTotal && e.fecha !== "2099-12-31" && !e.beneficiario?.includes("TOTAL")).map((egreso: any) => (
                      <tr key={egreso.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-900">{egreso.fecha}</td>
                        <td className="py-3 px-4 text-gray-600">{egreso.beneficiario}</td>
                        <td className="py-3 px-4 text-gray-600">{egreso.operacion}</td>
                        <td className="py-3 px-4 text-right text-gray-600">
                          $ {formatUsd(egreso.monto_usd)}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-red-600">
                          Bs. {formatBs(Number(egreso.monto_bs || egreso.monto))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {egresos.filter((e: any) => !e.isTotal && e.fecha !== "2099-12-31" && !e.beneficiario?.includes("TOTAL")).length > 0 && (
                    <>
                      <tr className="bg-gray-100 font-bold">
                        <td className="py-3 px-4 text-gray-900">TOTAL GENERAL</td>
                        <td className="py-3 px-4 text-gray-600 text-xs" colSpan={2}>
                          ({egresos.filter((e: any) => !e.isTotal && e.fecha !== "2099-12-31" && !e.beneficiario?.includes("TOTAL")).length} registros)
                        </td>
                        <td className="py-3 px-4 text-right text-gray-900">
                          $ {formatUsd(egresos.filter((e: any) => !e.isTotal && e.fecha !== "2099-12-31" && !e.beneficiario?.includes("TOTAL")).reduce((sum, e) => sum + (e.monto_usd || 0), 0))}
                        </td>
                        <td className="py-3 px-4 text-right text-red-600">
                          Bs. {formatBs(egresos.filter((e: any) => !e.isTotal && e.fecha !== "2099-12-31" && !e.beneficiario?.includes("TOTAL")).reduce((sum, e) => sum + Number(e.monto_bs || e.monto), 0))}
                        </td>
                      </tr>
                    </>
                    )}
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "gastos" && (
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Gastos del Edificio</h2>
            {loadingGastos ? (
              <p className="text-gray-500 text-center py-8">Cargando...</p>
            ) : gastos.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No hay gastos de edificio registrados.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Fecha</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Concepto</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Código</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">USD</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Bolivares</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gastos.map((gasto: any) => (
                      <tr key={gasto.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-900">{gasto.fecha}</td>
                        <td className="py-3 px-4 text-gray-600">{gasto.descripcion}</td>
                        <td className="py-3 px-4 text-gray-600">{gasto.codigo || "-"}</td>
                        <td className="py-3 px-4 text-right text-gray-600">
                          $ {formatUsd(gasto.monto_usd)}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-orange-600">
                          Bs. {formatBs(Number(gasto.monto_bs || gasto.monto))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-bold">
                      <td className="py-3 px-4 text-gray-900">TOTAL GENERAL</td>
                      <td className="py-3 px-4 text-gray-600 text-xs">({gastos.length} registros)</td>
                      <td className="py-3 px-4"></td>
                      <td className="py-3 px-4 text-right text-gray-900">
                        $ {formatUsd(gastos.reduce((sum, g: any) => sum + Number(g.monto_usd || 0), 0))}
                      </td>
                      <td className="py-3 px-4 text-right text-orange-600">
                        Bs. {formatBs(gastos.reduce((sum, g: any) => sum + Number(g.monto_bs || g.monto || 0), 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "balance" && (
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Estado de Cuenta del Edificio</h2>
            {loadingBalance ? (
              <p className="text-gray-500 text-center py-8">Cargando...</p>
            ) : !balance ? (
              <p className="text-gray-500 text-center py-8">
                No hay datos de balance. Ejecuta una sincronización primero.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Concepto</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Monto Bs.</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Monto USD</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Saldo Bs.</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Saldo USD</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b font-medium"><td className="py-2 px-4">CAJA</td><td className="py-2 px-4"></td><td className="py-2 px-4"></td><td className="py-2 px-4"></td><td className="py-2 px-4"></td></tr>
                    <tr className="border-b"><td className="py-2 px-4 pl-8 text-gray-600">SALDO DE CAJA MES ANTERIOR</td><td className="py-2 px-4 text-right text-gray-500">Bs. {formatCurrency(balance.saldo_anterior)}</td><td className="py-2 px-4 text-right text-gray-400">$ {formatUsd(balance.saldo_anterior / tasaBCV.dolar)}</td><td className="py-2 px-4 text-right"></td><td className="py-2 px-4 text-right"></td></tr>
                    <tr className="border-b"><td className="py-2 px-4 pl-8 text-gray-600">COBRANZA DEL MES</td><td className="py-2 px-4 text-right text-green-600">Bs. {formatCurrency(balance.cobranza_mes)}</td><td className="py-2 px-4 text-right text-green-500">$ {formatUsd(balance.cobranza_mes / tasaBCV.dolar)}</td><td className="py-2 px-4 text-right"></td><td className="py-2 px-4 text-right"></td></tr>
                    <tr className="border-b"><td className="py-2 px-4 pl-8 text-gray-600">GASTOS FACTURADOS EN EL MES COMUNES</td><td className="py-2 px-4 text-right text-red-600">Bs. {formatCurrency(balance.gastos_facturados)}</td><td className="py-2 px-4 text-right text-red-500">$ {formatUsd(balance.gastos_facturados / tasaBCV.dolar)}</td><td className="py-2 px-4 text-right"></td><td className="py-2 px-4 text-right"></td></tr>
                    <tr className="border-b"><td className="py-2 px-4 pl-8 text-gray-600">DESC/DIF/CAMB/PAGO A TIEMPO</td><td className="py-2 px-4 text-right text-gray-500">Bs. {formatCurrency(balance.ajuste_pago_tiempo || 0)}</td><td className="py-2 px-4 text-right text-gray-400">$ {formatUsd((balance.ajuste_pago_tiempo || 0) / tasaBCV.dolar)}</td><td className="py-2 px-4 text-right"></td><td className="py-2 px-4 text-right"></td></tr>
                    <tr className="border-b bg-gray-100 font-medium"><td className="py-2 px-4">SALDO ACTUAL DISPONIBLE EN CAJA</td><td className="py-2 px-4 text-right"></td><td className="py-2 px-4 text-right"></td><td className="py-2 px-4 text-right text-blue-600 font-bold">Bs. {formatCurrency(balance.saldo_disponible)}</td><td className="py-2 px-4 text-right text-blue-500 font-bold">$ {formatUsd(balance.saldo_disponible / tasaBCV.dolar)}</td></tr>
                    
                    <tr className="border-b font-medium"><td className="py-2 px-4">CUENTAS POR COBRAR</td><td className="py-2 px-4"></td><td className="py-2 px-4"></td><td className="py-2 px-4"></td><td className="py-2 px-4"></td></tr>
                    <tr className="border-b"><td className="py-2 px-4 pl-8 text-gray-600">RECIBOS DE CONDOMINIOS DEL MES</td><td className="py-2 px-4 text-right text-gray-500">Bs. {formatCurrency(balance.recibos_mes)}</td><td className="py-2 px-4 text-right text-gray-400">$ {formatUsd(balance.recibos_mes / tasaBCV.dolar)}</td><td className="py-2 px-4 text-right"></td><td className="py-2 px-4 text-right"></td></tr>
                    <tr className="border-b"><td className="py-2 px-4 pl-8 text-gray-600">CONDOMINIOS ATRASADOS</td><td className="py-2 px-4 text-right text-gray-500">Bs. {formatCurrency(balance.condominios_atrasados)}</td><td className="py-2 px-4 text-right text-gray-400">$ {formatUsd(balance.condominios_atrasados / tasaBCV.dolar)}</td><td className="py-2 px-4 text-right"></td><td className="py-2 px-4 text-right"></td></tr>
                    <tr className="border-b"><td className="py-2 px-4 pl-8 text-gray-600">CONDOMINIOS SOBRANTES</td><td className="py-2 px-4 text-right text-gray-500">Bs. {formatCurrency(balance.condominios_sobrantes || 0)}</td><td className="py-2 px-4 text-right text-gray-400">$ {formatUsd((balance.condominios_sobrantes || 0) / tasaBCV.dolar)}</td><td className="py-2 px-4 text-right"></td><td className="py-2 px-4 text-right"></td></tr>
                    <tr className="border-b bg-gray-100 font-medium"><td className="py-2 px-4">TOTAL CONDOMINIOS POR COBRAR</td><td className="py-2 px-4 text-right"></td><td className="py-2 px-4 text-right"></td><td className="py-2 px-4 text-right text-orange-600 font-bold">Bs. {formatCurrency(balance.total_por_cobrar)}</td><td className="py-2 px-4 text-right text-orange-500 font-bold">$ {formatUsd(balance.total_por_cobrar / tasaBCV.dolar)}</td></tr>
                    <tr className="border-b bg-gray-100 font-medium"><td className="py-2 px-4">TOTAL CAJA Y POR COBRAR</td><td className="py-2 px-4 text-right"></td><td className="py-2 px-4 text-right"></td><td className="py-2 px-4 text-right text-purple-600 font-bold">Bs. {formatCurrency(balance.total_caja_y_cobrar || 0)}</td><td className="py-2 px-4 text-right text-purple-500 font-bold">$ {formatUsd((balance.total_caja_y_cobrar || 0) / tasaBCV.dolar)}</td></tr>
                    
                    <tr className="border-b font-medium"><td className="py-2 px-4">RESERVAS</td><td className="py-2 px-4"></td><td className="py-2 px-4"></td><td className="py-2 px-4"></td><td className="py-2 px-4"></td></tr>
                    <tr className="border-b"><td className="py-2 px-4 pl-8 text-gray-600">FONDO DE RESERVA MES ANTERIOR</td><td className="py-2 px-4 text-right text-gray-500">Bs. {formatCurrency(balance.fondo_reserva_mes_anterior)}</td><td className="py-2 px-4 text-right text-gray-400">$ {formatUsd(balance.fondo_reserva_mes_anterior / tasaBCV.dolar)}</td><td className="py-2 px-4 text-right"></td><td className="py-2 px-4 text-right"></td></tr>
                    <tr className="border-b bg-gray-50"><td className="py-2 px-4 pl-8 text-gray-600">SALDO FONDO DE RESERVA</td><td className="py-2 px-4 text-right"></td><td className="py-2 px-4 text-right"></td><td className="py-2 px-4 text-right">Bs. {formatCurrency(balance.fondo_reserva)}</td><td className="py-2 px-4 text-right text-gray-500">$ {formatUsd(balance.fondo_reserva / tasaBCV.dolar)}</td></tr>
                    <tr className="border-b"><td className="py-2 px-4 pl-8 text-gray-600">FONDO PRESTACIONES SOCIALES MES ANTERIOR</td><td className="py-2 px-4 text-right text-gray-500">Bs. {formatCurrency(balance.fondo_prestaciones_mes_anterior)}</td><td className="py-2 px-4 text-right text-gray-400">$ {formatUsd(balance.fondo_prestaciones_mes_anterior / tasaBCV.dolar)}</td><td className="py-2 px-4 text-right"></td><td className="py-2 px-4 text-right"></td></tr>
                    <tr className="border-b bg-gray-50"><td className="py-2 px-4 pl-8 text-gray-600">SALDO FONDO PRESTACIONES SOCIALES</td><td className="py-2 px-4 text-right"></td><td className="py-2 px-4 text-right"></td><td className="py-2 px-4 text-right">Bs. {formatCurrency(balance.fondo_prestaciones)}</td><td className="py-2 px-4 text-right text-gray-500">$ {formatUsd(balance.fondo_prestaciones / tasaBCV.dolar)}</td></tr>
                    <tr className="border-b"><td className="py-2 px-4 pl-8 text-gray-600">FONDO TRABAJOS VARIOS MES ANTERIOR</td><td className="py-2 px-4 text-right text-gray-500">Bs. {formatCurrency(balance.fondo_trabajos_varios_mes_anterior)}</td><td className="py-2 px-4 text-right text-gray-400">$ {formatUsd(balance.fondo_trabajos_varios_mes_anterior / tasaBCV.dolar)}</td><td className="py-2 px-4 text-right"></td><td className="py-2 px-4 text-right"></td></tr>
                    <tr className="border-b bg-gray-50"><td className="py-2 px-4 pl-8 text-gray-600">SALDO FONDO TRABAJOS VARIOS</td><td className="py-2 px-4 text-right"></td><td className="py-2 px-4 text-right"></td><td className="py-2 px-4 text-right">Bs. {formatCurrency(balance.fondo_trabajos_varios)}</td><td className="py-2 px-4 text-right text-gray-500">$ {formatUsd(balance.fondo_trabajos_varios / tasaBCV.dolar)}</td></tr>
                    <tr className="border-b"><td className="py-2 px-4 pl-8 text-gray-600">AJUSTE DIFERENCIA ALICUOTA MES ANTERIOR</td><td className="py-2 px-4 text-right text-gray-500">Bs. {formatCurrency(balance.ajuste_alicuota_mes_anterior)}</td><td className="py-2 px-4 text-right text-gray-400">$ {formatUsd(balance.ajuste_alicuota_mes_anterior / tasaBCV.dolar)}</td><td className="py-2 px-4 text-right"></td><td className="py-2 px-4 text-right"></td></tr>
                    <tr className="border-b bg-gray-50"><td className="py-2 px-4 pl-8 text-gray-600">SALDO AJUSTE DIFERENCIA ALICUOTA</td><td className="py-2 px-4 text-right"></td><td className="py-2 px-4 text-right"></td><td className="py-2 px-4 text-right">Bs. {formatCurrency(balance.ajuste_alicuota)}</td><td className="py-2 px-4 text-right text-gray-500">$ {formatUsd(balance.ajuste_alicuota / tasaBCV.dolar)}</td></tr>
                    <tr className="border-b"><td className="py-2 px-4 pl-8 text-gray-600">FONDO INTERESES MORATORIOS MES ANTERIOR</td><td className="py-2 px-4 text-right text-gray-500">Bs. {formatCurrency(balance.fondo_intereses_mes_anterior)}</td><td className="py-2 px-4 text-right text-gray-400">$ {formatUsd(balance.fondo_intereses_mes_anterior / tasaBCV.dolar)}</td><td className="py-2 px-4 text-right"></td><td className="py-2 px-4 text-right"></td></tr>
                    <tr className="border-b bg-gray-50"><td className="py-2 px-4 pl-8 text-gray-600">SALDO FONDO INTERESES MORATORIOS</td><td className="py-2 px-4 text-right"></td><td className="py-2 px-4 text-right"></td><td className="py-2 px-4 text-right">Bs. {formatCurrency(balance.fondo_intereses)}</td><td className="py-2 px-4 text-right text-gray-500">$ {formatUsd(balance.fondo_intereses / tasaBCV.dolar)}</td></tr>
                    <tr className="border-b"><td className="py-2 px-4 pl-8 text-gray-600">FONDO DIFERENCIAL CAMBIARIO MES ANTERIOR</td><td className="py-2 px-4 text-right text-gray-500">Bs. {formatCurrency(balance.fondo_diferencial_mes_anterior)}</td><td className="py-2 px-4 text-right text-gray-400">$ {formatUsd(balance.fondo_diferencial_mes_anterior / tasaBCV.dolar)}</td><td className="py-2 px-4 text-right"></td><td className="py-2 px-4 text-right"></td></tr>
                    <tr className="border-b"><td className="py-2 px-4 pl-8 text-gray-600">DESC/DIF/CAMB/PAGO A TIEMPO</td><td className="py-2 px-4 text-right text-gray-500">Bs. {formatCurrency(balance.fondo_diferencial_ajuste || 0)}</td><td className="py-2 px-4 text-right text-gray-400">$ {formatUsd((balance.fondo_diferencial_ajuste || 0) / tasaBCV.dolar)}</td><td className="py-2 px-4 text-right"></td><td className="py-2 px-4 text-right"></td></tr>
                    <tr className="border-b bg-gray-50"><td className="py-2 px-4 pl-8 text-gray-600">SALDO FONDO DIFERENCIAL CAMBIARIO</td><td className="py-2 px-4 text-right"></td><td className="py-2 px-4 text-right"></td><td className="py-2 px-4 text-right">Bs. {formatCurrency(balance.fondo_diferencial_cambiario)}</td><td className="py-2 px-4 text-right text-gray-500">$ {formatUsd(balance.fondo_diferencial_cambiario / tasaBCV.dolar)}</td></tr>
                    <tr className="border-b bg-blue-50 font-bold"><td className="py-3 px-4">SALDO RESERVAS</td><td className="py-3 px-4 text-right"></td><td className="py-3 px-4 text-right"></td><td className="py-3 px-4 text-right text-blue-700">Bs. {formatCurrency(balance.saldo_reservas)}</td><td className="py-3 px-4 text-right text-blue-600">$ {formatUsd(balance.saldo_reservas / tasaBCV.dolar)}</td></tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "alicuotas" && (
          <div className="bg-white p-6 rounded-xl shadow-sm">
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
                <div className="mb-2 text-sm text-gray-500">
                  Haz clic en el lápiz para editar. Los cambios se guardan automáticamente al perder el foco del campo.
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Unidad</th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Propietario</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">Alícuota</th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Email 1</th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Email 2</th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Telf 1</th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Telf 2</th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alicuotas.map((a) => (
                      <tr key={a.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-2 font-medium">{a.unidad}</td>
                        <td className="py-2 px-2 text-gray-600 max-w-[120px] truncate">{a.propietario || "-"}</td>
                        <td className="py-2 px-2 text-right">{a.alicuota?.toFixed(5) || "-"}</td>
                        <td className="py-2 px-1">
                          <input
                            type="text"
                            placeholder="email@..."
                            defaultValue={a.email1 || ""}
                            onChange={(e) => {
                              if (e.target.value !== a.email1) {
                                updateAlicuota(a.id, "email1", e.target.value);
                              }
                            }}
                            className="w-full text-xs border border-gray-200 rounded px-1"
                          />
                        </td>
                        <td className="py-2 px-1">
                          <input
                            type="text"
                            placeholder="email@..."
                            defaultValue={a.email2 || ""}
                            onChange={(e) => {
                              if (e.target.value !== a.email2) {
                                updateAlicuota(a.id, "email2", e.target.value);
                              }
                            }}
                            className="w-full text-xs border border-gray-200 rounded px-1"
                          />
                        </td>
                        <td className="py-2 px-1">
                          <input
                            type="text"
                            placeholder="0000-0000000"
                            defaultValue={a.telefono1 || ""}
                            onChange={(e) => {
                              if (e.target.value !== a.telefono1) {
                                updateAlicuota(a.id, "telefono1", e.target.value);
                              }
                            }}
                            className="w-full text-xs border border-gray-200 rounded px-1"
                          />
                        </td>
                        <td className="py-2 px-1">
                          <input
                            type="text"
                            placeholder="0000-0000000"
                            defaultValue={a.telefono2 || ""}
                            onChange={(e) => {
                              if (e.target.value !== a.telefono2) {
                                updateAlicuota(a.id, "telefono2", e.target.value);
                              }
                            }}
                            className="w-full text-xs border border-gray-200 rounded px-1"
                          />
                        </td>
                        <td className="py-2 px-1">
                          <input
                            type="text"
                            placeholder="notas..."
                            defaultValue={a.observaciones || ""}
                            onChange={(e) => {
                              if (e.target.value !== a.observaciones) {
                                updateAlicuota(a.id, "observaciones", e.target.value);
                              }
                            }}
                            className="w-full text-xs border border-gray-200 rounded px-1"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-semibold">
                      <td className="py-2 px-2" colSpan={2}>TOTAL UNIDADES</td>
                      <td className="py-2 px-2 text-right">{alicuotasCount}</td>
                      <td className="py-2 px-2" colSpan={5}></td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="py-2 px-2" colSpan={2}>SUMA ALÍCUOTAS</td>
                      <td className={`py-2 px-2 text-right font-bold ${alicuotaSum >= 99.5 && alicuotaSum <= 100 ? "text-green-600" : "text-red-600"}`}>
                        {alicuotaSum.toFixed(2)}%
                      </td>
                      <td className="py-2 px-2" colSpan={5}>
                        {alicuotaWarning && (
                          <span className="text-xs text-orange-600 ml-2">
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
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Historial de Ejecución y Sincronizaciones</h2>
            <div className="space-y-4">
              {!hasIntegration && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⚙️</span>
                    <span className="font-medium text-yellow-800">Configuración Pendiente</span>
                  </div>
                  <p className="text-sm text-yellow-700 mt-1">
                    Debes configurar las credenciales de tu administradora en &quot;Configuración&quot; para comenzar a recibir movimientos.
                  </p>
                </div>
              )}
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-blue-700">
                  <strong>Información:</strong> Esta sección muestra el log detallado de todas las ejecuciones del sistema, incluyendo sincronizaciones exitosas y errores.
                </p>
              </div>
              {loadingSincronizaciones ? (
                <p className="text-gray-500 text-center py-4">Cargando historial...</p>
              ) : sincronizaciones.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No hay sincronizaciones registradas. Haz una sincronización manual para comenzar.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-2 px-2">Fecha/Hora</th>
                        <th className="text-left py-2 px-2">Tipo</th>
                        <th className="text-left py-2 px-2">Estado</th>
                        <th className="text-right py-2 px-2">Registros</th>
                        <th className="text-left py-2 px-2">Detalles</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sincronizaciones.map((s: any) => (
                        <tr key={s.id} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-2">
                            {s.created_at ? new Date(s.created_at).toLocaleString("es-VE", { 
                              day: "2-digit", month: "2-digit", year: "numeric", 
                              hour: "2-digit", minute: "2-digit", second: "2-digit"
                            }) : "-"}
                          </td>
                          <td className="py-2 px-2">
                            <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                              sync
                            </span>
                          </td>
                          <td className="py-2 px-2">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              s.estado === "completado" ? "bg-green-100 text-green-700" :
                              s.estado === "error" ? "bg-red-100 text-red-700" :
                              "bg-yellow-100 text-yellow-700"
                            }`}>
                              {s.estado || "pendiente"}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right">{s.movimientos_nuevos || 0}</td>
                          <td className="py-2 px-2 text-gray-600 text-xs">
                            {s.error ? (
                              s.error.startsWith("{") ? (
                                <span className="text-green-600">{s.error}</span>
                              ) : (
                                <span className="text-red-600">{s.error}</span>
                              )
                            ) : (
                              <span className="text-green-600">OK</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
</div>
          )}

        {activeTab === "configuracion" && building && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Datos del Edificio</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500">Nombre</label>
                  <div className="text-gray-900 font-medium">{building.nombre}</div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Dirección</label>
                  <div className="text-gray-900">{building.direccion || "-"}</div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Unidades</label>
                  <div className="text-gray-900">{building.unidades}</div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Plan</label>
                  <div className="text-gray-900">{building.plan}</div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Administradora</label>
                  <div className="text-gray-900">{building.admin_nombre || "No configurada"}</div>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuración de Integración</h2>
              <p className="text-gray-600 mb-6">
                Configura las credenciales y URLs de tu administradora para sincronizar automáticamente los movimientos financieros.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de Administradora</label>
                  <select
                    value={editConfig.admin_nombre}
                    onChange={(e) => setEditConfig({ ...editConfig, admin_nombre: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="La Ideal C.A.">La Ideal C.A.</option>
                    <option value="Admastridcarrasquel">Admastridcarrasquel</option>
                    <option value="Administradora Elite">Administradora Elite</option>
                    <option value="Intercanar">Intercanar</option>
                    <option value="Admactual">Admactual</option>
                    <option value="Condominios Chacao">Condominios Chacao</option>
                    <option value="Obelisco">Obelisco</option>
                    <option value="Administradora GCM">Administradora GCM</option>
                    <option value="Otra">Otra (Manual)</option>
                  </select>
                </div>
               
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Clave de Acceso</label>
                    <input
                      type="password"
                      value={editConfig.admin_secret}
                      onChange={(e) => setEditConfig({ ...editConfig, admin_secret: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Tu contraseña (clave del apartamento)"
                    />
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h3 className="font-medium text-gray-900 mb-3">URLs de la Administradora</h3>
                  <p className="text-sm text-gray-500 mb-3">Configura las URLs si son diferentes a las estándar</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">URL Login</label>
                      <input
                        type="text"
                        value={editConfig.url_login}
                        onChange={(e) => setEditConfig({ ...editConfig, url_login: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">URL Recibos</label>
                      <input
                        type="text"
                        value={editConfig.url_recibos}
                        onChange={(e) => setEditConfig({ ...editConfig, url_recibos: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">URL Egresos</label>
                      <input
                        type="text"
                        value={editConfig.url_egresos}
                        onChange={(e) => setEditConfig({ ...editConfig, url_egresos: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">URL Gastos</label>
                      <input
                        type="text"
                        value={editConfig.url_gastos}
                        onChange={(e) => setEditConfig({ ...editConfig, url_gastos: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">URL Estado de Cuenta (Balance)</label>
                      <input
                        type="text"
                        value={editConfig.url_balance}
                        onChange={(e) => setEditConfig({ ...editConfig, url_balance: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="https://..."
                      />
                    </div>
                    <div className="mt-4">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Email(s) Junta de Condominio</label>
                      <input
                        type="text"
                        value={editConfig.email_junta}
                        onChange={(e) => setEditConfig({ ...editConfig, email_junta: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="email1@..., email2@..., ..."
                      />
                      <p className="text-xs text-gray-400 mt-1">Separados por coma. Se enviar informe financiero diario.</p>
                    </div>
                    <div className="mt-4 pt-3 border-t">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sincronizar:</label>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={editConfig.sync_recibos}
                            onChange={(e) => setEditConfig({ ...editConfig, sync_recibos: e.target.checked })}
                            className="w-4 h-4"
                          />
                          Recibos (Deudas)
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={editConfig.sync_egresos}
                            onChange={(e) => setEditConfig({ ...editConfig, sync_egresos: e.target.checked })}
                            className="w-4 h-4"
                          />
                          Egresos
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={editConfig.sync_gastos}
                            onChange={(e) => setEditConfig({ ...editConfig, sync_gastos: e.target.checked })}
                            className="w-4 h-4"
                          />
                          Gastos
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={editConfig.sync_alicuotas}
                            onChange={(e) => setEditConfig({ ...editConfig, sync_alicuotas: e.target.checked })}
                            className="w-4 h-4"
                          />
                          Alícuotas
                        </label>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Selecciona qué datos sincronizar</p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 block"
              >
                {saving ? "Guardando..." : "Guardar Configuración"}
              </button>

              <div className="mt-8 pt-6 border-t">
                <h3 className="font-semibold text-gray-900 mb-4">Enviar Informe Financiero</h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => sendEmailToJunta(false)}
                    disabled={sendingEmail || !editConfig.email_junta}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    {sendingEmail ? "Enviando..." : "Enviar a Junta"}
                  </button>
                  <button
                    onClick={() => sendEmailToJunta(true)}
                    disabled={sendingEmail}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
                  >
                    {sendingEmail ? "Enviando..." : "Test Email"}
                  </button>
                </div>
                {emailMessage && (
                  <div className={`mt-3 p-3 rounded-lg ${emailMessage.includes("Error") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                    {emailMessage}
                  </div>
                )}
              </div>
              
              <div className="mt-8 pt-6 border-t">
                <h3 className="font-semibold text-gray-900 mb-4">Prueba de Conexión</h3>
                <button
                  onClick={handleTestConnection}
                  disabled={saving || !editConfig.admin_secret || !editConfig.url_login}
                  className="px-6 py-3 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Probando..." : "Probar Conexión"}
                </button>
                {syncMessage && (
                  <div className={`mt-3 p-3 rounded-lg ${syncMessage.includes("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    {syncMessage}
                  </div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t">
                <h3 className="font-semibold text-gray-900 mb-4">Sincronización Manual</h3>
                <button
                  onClick={handleSync}
                  disabled={syncing || !hasIntegration}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {syncing ? "Sincronizando..." : "Sincronizar Ahora"}
                </button>
                {!hasIntegration && (
                  <p className="text-sm text-gray-500 mt-2">
                    Configura las credenciales arriba para habilitar la sincronización.
                  </p>
                )}
              </div>

              <div className="mt-8 pt-6 border-t">
                <h3 className="font-semibold text-gray-900 mb-4">Sincronizar Mes Específico</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Descarga datos de un mes específico: egresos, gastos, balance y recibos de ese mes para tener histórico.
                </p>
                <div className="flex gap-3 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
                    <input
                      type="month"
                      value={syncMes}
                      onChange={(e) => setSyncMes(e.target.value)}
                      className="border rounded px-3 py-2"
                    />
                  </div>
                  <button
                    onClick={handleSyncMes}
                    disabled={syncingMes || !hasIntegration || !syncMes}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {syncingMes ? "Descargando..." : "Descargar Datos"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "manual" && (
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Control Manual de Saldos</h2>
            <p className="text-sm text-gray-500 mb-4">
              Registra aquí los movimientos manuales para cuadre de saldo. Cada fila representa un día de corte donde se hace balance de ingresos y egresos.
            </p>
            {loadingManual ? (
              <p className="text-gray-500 text-center py-8">Cargando...</p>
            ) : movimientosManual.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No hay movimientos manuales registrados.</p>
                <p className="text-sm text-gray-400">Usa el botón &quot;+&quot; para agregar un nuevo registro.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-center py-2 px-1 text-xs font-medium text-gray-500">☠</th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Fecha Corte</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">Saldo Inicial</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">Egresos</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">Ingresos</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">Saldo Final</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">Saldo Acumulado</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">Tasa BCV</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">Saldo USD</th>
                      <th className="text-center py-2 px-2 text-xs font-medium text-gray-500">Conciliado?</th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Obs Egresos</th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Obs Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientosManual.filter((m: any) => m.fecha_corte || m.saldo_inicial || m.egresos || m.ingresos).map((m: any) => (
                      <tr key={m.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-1 text-center">
                          <button onClick={() => deleteMovimientoManual(m.id)} className="text-red-500 hover:text-red-700 font-bold">✕</button>
                        </td>
                        <td className="py-2 px-2">
                          <input type="date" defaultValue={m.fecha_corte} onChange={(e) => updateMovimientoManual(m.id, "fecha_corte", e.target.value)} className="w-full text-sm border rounded px-1 py-1" />
                        </td>
                        <td className="py-2 px-2">
                          <input type="number" defaultValue={m.saldo_inicial} onChange={(e) => updateMovimientoManual(m.id, "saldo_inicial", parseFloat(e.target.value) || 0)} className="w-24 text-right text-sm border rounded px-1 py-1" />
                        </td>
                        <td className="py-2 px-2">
                          <input type="number" defaultValue={m.egresos} onChange={(e) => updateMovimientoManual(m.id, "egresos", parseFloat(e.target.value) || 0)} className="w-24 text-right text-sm border rounded px-1 py-1 text-red-600" />
                        </td>
                        <td className="py-2 px-2">
                          <input type="number" defaultValue={m.ingresos} onChange={(e) => updateMovimientoManual(m.id, "ingresos", parseFloat(e.target.value) || 0)} className="w-24 text-right text-sm border rounded px-1 py-1 text-green-600" />
                        </td>
                        <td className="py-2 px-2 text-right font-medium">{formatBs(m.saldo_final)}</td>
                        <td className="py-2 px-2 text-right font-medium text-blue-600">
                          {(() => {
                            const sortedMan = [...movimientosManual].sort((a, b) => (a.fecha_corte || '').localeCompare(b.fecha_corte || ''));
                            let acumulado = 0;
                            for (const row of sortedMan) {
                              if (row.id === m.id) break;
                              acumulado += (row.saldo_inicial || 0) - (row.egresos || 0) + (row.ingresos || 0);
                            }
                            return formatBs(acumulado);
                          })()}
                        </td>
                        <td className="py-2 px-2">
                          <input type="number" defaultValue={m.tasa_bcv} onChange={(e) => updateMovimientoManual(m.id, "tasa_bcv", parseFloat(e.target.value) || 45.50)} className="w-20 text-right text-sm border rounded px-1 py-1" />
                        </td>
                        <td className="py-2 px-2 text-right text-gray-500">$ {formatUsd(m.saldo_final_usd)}</td>
                        <td className="py-2 px-2 text-center">
                          <select value={m.comparado ? "Si" : "No"} onChange={(e) => updateMovimientoManual(m.id, "comparado", e.target.value)} className="text-sm border rounded px-1 py-1" title="Conciliado">
                            <option value="No">No</option>
                            <option value="Si">Si</option>
                          </select>
                        </td>
                        <td className="py-2 px-2">
                          <input type="text" defaultValue={m.obs_egresos} onChange={(e) => updateMovimientoManual(m.id, "obs_egresos", e.target.value)} className="w-28 text-sm border rounded px-1 py-1" />
                        </td>
                        <td className="py-2 px-2">
                          <input type="text" defaultValue={m.obs_ingresos} onChange={(e) => updateMovimientoManual(m.id, "obs_ingresos", e.target.value)} className="w-28 text-sm border rounded px-1 py-1" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 pt-4 border-t">
              <button onClick={createMovimientoManual} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
                + Agregar Registro
              </button>
            </div>
          </div>
        )}

{activeTab === "kpis" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Evolución del Saldo Disponible (USD)</h2>
              {loadingKpis ? (
                <p className="text-gray-500 text-center py-8">Cargando...</p>
              ) : kpisData.balances?.length > 0 && kpisData.balances.some((b: any) => b.saldo_disponible_usd > 0 && b.saldo_disponible_usd < 1000000) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={kpisData.balances} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
                    <Tooltip formatter={(value: any) => `$${formatUsd(value as number)}`} />
                    <Legend />
                    <Line type="monotone" dataKey="saldo_disponible_usd" stroke="#2563eb" strokeWidth={2} name="Saldo Disponible ($)" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-center py-8">No hay datos de saldo disponible. Sincroniza el balance desde la pestaña Configuración.</p>
              )}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Cobranza vs Gastos (USD)</h2>
              {loadingKpis ? (
                <p className="text-gray-500 text-center py-8">Cargando...</p>
              ) : kpisData.balances?.length > 0 && kpisData.balances.some((b: any) => (b.cobranza_mes_usd > 0 || b.gastos_facturados_usd > 0) && b.cobranza_mes_usd < 1000000) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={kpisData.balances} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
                    <Tooltip formatter={(value: any) => `$${formatUsd(value as number)}`} />
                    <Legend />
                    <Bar dataKey="cobranza_mes_usd" fill="#22c55e" name="Cobranza ($)" />
                    <Bar dataKey="gastos_facturados_usd" fill="#ef4444" name="Gastos ($)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-center py-8">No hay datos de cobranza/gastos</p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Evolución de Gastos (USD)</h2>
                {loadingKpis ? (
                  <p className="text-gray-500 text-center py-8">Cargando...</p>
                ) : kpisData.gastos?.length > 0 && kpisData.gastos.some((g: any) => g.monto_usd > 0 && g.monto_usd < 1000000) ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={kpisData.gastos} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
                      <Tooltip formatter={(value: any) => `$${formatUsd(value as number)}`} />
                      <Area type="monotone" dataKey="monto_usd" stroke="#f97316" fill="#f97316" fillOpacity={0.3} name="Gastos ($)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No hay datos de gastos</p>
                )}
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Egresos por Mes (USD)</h2>
                {loadingKpis ? (
                  <p className="text-gray-500 text-center py-8">Cargando...</p>
                ) : kpisData.egresos?.length > 0 && kpisData.egresos.some((e: any) => e.monto_usd > 0 && e.monto_usd < 1000000) ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={kpisData.egresos} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
                      <Tooltip formatter={(value: any) => `$${formatUsd(value as number)}`} />
                      <Area type="monotone" dataKey="monto_usd" stroke="#dc2626" fill="#dc2626" fillOpacity={0.3} name="Egresos ($)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No hay datos de egresos</p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Fondo de Reserva (USD)</h2>
                {loadingKpis ? (
                  <p className="text-gray-500 text-center py-8">Cargando...</p>
                ) : kpisData.balances?.length > 0 && kpisData.balances.some((b: any) => b.fondo_reserva_usd > 0 && b.fondo_reserva_usd < 1000000) ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={kpisData.balances} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
                      <Tooltip formatter={(value: any) => `$${formatUsd(value as number)}`} />
                      <Line type="monotone" dataKey="fondo_reserva_usd" stroke="#9333ea" strokeWidth={2} name="Fondo Reserva ($)" dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No hay datos de fondo reserva</p>
                )}
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Saldo Anterior (USD)</h2>
                {loadingKpis ? (
                  <p className="text-gray-500 text-center py-8">Cargando...</p>
                ) : kpisData.balances?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={kpisData.balances} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
                      <Tooltip formatter={(value: any) => `$${formatUsd(value as number)}`} />
                      <Line type="monotone" dataKey="saldo_anterior_usd" stroke="#64748b" strokeDasharray="5 5" name="Saldo Anterior ($)" dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No hay datos</p>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Conciliación: Manual vs Administradora</h2>
              {loadingKpis ? (
                <p className="text-gray-500 text-center py-8">Cargando...</p>
              ) : movimientosManual.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={movimientosManual} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="fecha_corte" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
                    <Tooltip formatter={(value: any) => formatBs(value as number)} />
                    <Legend />
                    <Line type="monotone" dataKey="saldo_final" stroke="#6366f1" strokeWidth={2} name="Saldo Manual" dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="saldo_segun_administradora" stroke="#22c55e" strokeWidth={2} name="Saldo Admin" dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-center py-8">No hay registros manuales. Agrega registros en la pestaña &quot;Ing/Egr Manual&quot;.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "instrucciones" && (
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ayuda e Instrucciones</h2>
            <div className="space-y-4 text-sm text-gray-600">
              <div className="border-b pb-2">
                <h3 className="font-semibold text-gray-800">📊 Resumen</h3>
                <p>Muestra los indicadores principales del edificio: saldo disponible, cobranza del mes, gastos, recibos pendientes, deuda total, etc.</p>
              </div>
              <div className="border-b pb-2">
                <h3 className="font-semibold text-gray-800">📋 Movimientos</h3>
                <p>Lista todos los movimientos de ingresos y egresos detectados de la página de la administradora.</p>
              </div>
              <div className="border-b pb-2">
                <h3 className="font-semibold text-gray-800">💸 Egresos</h3>
                <p>Gastos del mes extraídos de la administradora. Muestra monto en Bs y USD según la tasa BCV.</p>
              </div>
              <div className="border-b pb-2">
                <h3 className="font-semibold text-gray-800">📄 Recibos</h3>
                <p>Estado de cuentas por apartamento. Muestra deuda en Bolivares y dólares.</p>
              </div>
              <div className="border-b pb-2">
                <h3 className="font-semibold text-gray-800">📈 Balance</h3>
                <p>Estado financiero completo del edificio según la administradora.</p>
              </div>
              <div className="border-b pb-2">
                <h3 className="font-semibold text-gray-800">🏠 Alicuotas</h3>
                <p>Lista de apartamentos con sus alícuotas. Puedes editar email y teléfonos.</p>
              </div>
              <div className="border-b pb-2">
                <h3 className="font-semibold text-gray-800">🔄 Ingresos/Egresos Manual</h3>
                <p>Registros manuales para llevar el cuadre de caja. Agrega tus registros diarios con ingresos y egresos reales.</p>
              </div>
              <div className="border-b pb-2">
                <h3 className="font-semibold text-gray-800">📊 KPIs</h3>
                <p>Gráficos de evolución histórica: saldo disponible, ingresos vs egresos, fondo de reserva, etc.</p>
              </div>
              <div className="border-b pb-2">
                <h3 className="font-semibold text-gray-800">⚙️ Configuración</h3>
                <p>Configura las credenciales de acceso a la página de la administradora y parámetros de sincronización.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "junta" && (
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Miembros de la Junta de Condominio</h2>
            <p className="text-sm text-gray-500 mb-4">Los miembros de junta reciben copia de todos los reportes.</p>
            {loadingJunta ? (
              <p className="text-gray-500 text-center py-8">Cargando...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-2 px-2">Email</th>
                      <th className="text-left py-2 px-2">Nombre</th>
                      <th className="text-left py-2 px-2">Cargo</th>
                      <th className="text-left py-2 px-2">Teléfono</th>
                      <th className="text-center py-2 px-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {junta.map((m: any) => (
                      <tr key={m.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-2">{m.email}</td>
                        <td className="py-2 px-2">{m.nombre || "-"}</td>
                        <td className="py-2 px-2">{m.cargo || "-"}</td>
                        <td className="py-2 px-2">{m.telefono || "-"}</td>
                        <td className="py-2 px-2 text-center">
                          <button onClick={() => deleteMiembro(m.id)} className="text-red-500 hover:text-red-700 font-bold">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 pt-4 border-t flex gap-2">
              <input type="email" placeholder="Email" className="border rounded px-3 py-2 flex-1" id="newEmail" />
              <input type="text" placeholder="Nombre" className="border rounded px-3 py-2 flex-1" id="newNombre" />
              <select className="border rounded px-3 py-2" id="newCargo">
                <option value="">Cargo</option>
                <option value="Presidente">Presidente</option>
                <option value="Vicepresidente">Vicepresidente</option>
                <option value="Secretario">Secretario</option>
                <option value="Tesorero">Tesorero</option>
                <option value="Vocal">Vocal</option>
                <option value="Suplente">Suplente</option>
              </select>
              <input type="text" placeholder="Teléfono" className="border rounded px-3 py-2 w-32" id="newTelefono" />
              <button onClick={addMiembro} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Agregar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}