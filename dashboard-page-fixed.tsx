"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from "recharts";

type Tab = "resumen" | "movimientos" | "egresos" | "gastos" | "recibos" | "balance" | "alicuotas" | "alertas" | "edificio" | "configuracion" | "manual" | "kpis" | "instrucciones" | "junta";

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
}

interface Movement {
  id: string;
  fecha: string;
  descripcion: string;
  monto: number;
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
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [movimientosManual, setMovimientosManual] = useState<any[]>([]);
  const [loadingManual, setLoadingManual] = useState(false);
  const [alicuotas, setAlicuotas] = useState<Alicuota[]>([]);
  const [loadingAlicuotas, setLoadingAlicuotas] = useState(false);
  const [alicuotasCount, setAlicuotasCount] = useState(0);
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
  });
  const [saving, setSaving] = useState(false);

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
      const res = await fetch(`/api/movimientos-all?edificioId=${building.id}`);
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
      const res = await fetch(`/api/gastos-summary?edificioId=${building.id}`);
      const data = await res.json();
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
          <button onClick={() => setActiveTab("resumen")} className={`px-4 py-2 rounded-lg font-medium ${activeTab === "resumen" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>Resumen</button>
          <button onClick={() => setActiveTab("movimientos")} className={`px-4 py-2 rounded-lg font-medium ${activeTab === "movimientos" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>Movimientos</button>
          <button onClick={() => setActiveTab("egresos")} className={`px-4 py-2 rounded-lg font-medium ${activeTab === "egresos" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>Egresos</button>
          <button onClick={() => setActiveTab("gastos")} className={`px-4 py-2 rounded-lg font-medium ${activeTab === "gastos" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>Gastos</button>
          <button onClick={() => setActiveTab("recibos")} className={`px-4 py-2 rounded-lg font-medium ${activeTab === "recibos" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>Recibos</button>
          <button onClick={() => setActiveTab("balance")} className={`px-4 py-2 rounded-lg font-medium ${activeTab === "balance" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>Balance</button>
          <button onClick={() => setActiveTab("alicuotas")} className={`px-4 py-2 rounded-lg font-medium ${activeTab === "alicuotas" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>Alicuotas</button>
          <button onClick={() => setActiveTab("alertas")} className={`px-4 py-2 rounded-lg font-medium ${activeTab === "alertas" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>Alertas</button>
          <button onClick={() => setActiveTab("kpis")} className={`px-4 py-2 rounded-lg font-medium ${activeTab === "kpis" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>KPIs</button>
          <button onClick={() => setActiveTab("manual")} className={`px-4 py-2 rounded-lg font-medium ${activeTab === "manual" ? "bg-yellow-600 text-white" : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"}`}>Ing/Egr Manual</button>
          <button onClick={() => setActiveTab("junta")} className={`px-4 py-2 rounded-lg font-medium ${activeTab === "junta" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>Junta</button>
          <button onClick={() => setActiveTab("configuracion")} className={`px-4 py-2 rounded-lg font-medium ${activeTab === "configuracion" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>Configuración</button>
        </div>

        {activeTab === "resumen" && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50" onClick={() => setActiveTab("balance")}>
                <div className="text-sm text-gray-500 mb-1">Saldo Disponible</div>
                <div className="text-2xl font-bold text-blue-600">Bs.{formatBs(balance?.saldo_disponible || 0)}</div>
                {tasaBCV.dolar > 0 && <div className="text-sm text-gray-400">$ {formatUsd((balance?.saldo_disponible || 0) / tasaBCV.dolar)}</div>}
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50" onClick={() => setActiveTab("balance")}>
                <div className="text-sm text-gray-500 mb-1">Cobranza del Mes</div>
                <div className="text-2xl font-bold text-green-600">Bs.{formatBs(balance?.cobranza_mes || ingresosSummary.monto)}</div>
                {tasaBCV.dolar > 0 && <div className="text-sm text-gray-400">$ {formatUsd((balance?.cobranza_mes || ingresosSummary.monto) / tasaBCV.dolar)}</div>}
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50" onClick={() => setActiveTab("egresos")}>
                <div className="text-sm text-gray-500 mb-1">Gastos del Mes</div>
                <div className="text-2xl font-bold text-orange-600">Bs.{formatBs(balance?.gastos_facturados || gastosSummary.monto)}</div>
                {tasaBCV.dolar > 0 && <div className="text-sm text-gray-400">$ {formatUsd((balance?.gastos_facturados || gastosSummary.monto) / tasaBCV.dolar)}</div>}
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50" onClick={() => setActiveTab("balance")}>
                <div className="text-sm text-gray-500 mb-1">Fondo Reserva</div>
                <div className="text-2xl font-bold text-purple-600">Bs.{formatBs(balance?.fondo_reserva || 0)}</div>
                {tasaBCV.dolar > 0 && <div className="text-sm text-gray-400">$ {formatUsd((balance?.fondo_reserva || 0) / tasaBCV.dolar)}</div>}
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Movimientos Recientes</h2>
                <button onClick={handleSync} disabled={syncing || !hasIntegration} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
                  {syncing ? "Sincronizando..." : "Sincronizar Ahora"}
                </button>
              </div>
              {syncMessage && <div className={`mb-4 p-3 rounded-lg ${syncMessage.includes("Error") ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>{syncMessage}</div>}
              <p className="text-gray-500 text-center py-8">
                No hay movimientos aún. {hasIntegration ? "Haz clic en sincronizar para obtener datos." : "Configura la integración primero."}
              </p>
            </div>
          </div>
        )}

        {activeTab === "kpis" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Evolución del Saldo Disponible (USD)</h2>
              {loadingKpis ? (
                <p className="text-gray-500 text-center py-8">Cargando...</p>
              ) : kpisData.balances?.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={kpisData.balances}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
                    <Tooltip formatter={(value: any) => `$${formatUsd(value as number)}`} />
                    <Legend />
                    <Line type="monotone" dataKey="saldo_disponible_usd" stroke="#2563eb" strokeWidth={2} name="Saldo ($)" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-center py-8">No hay datos. Sincroniza desde Configuración.</p>
              )}
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Cobranza vs Gastos (USD)</h2>
              {loadingKpis ? (
                <p className="text-gray-500 text-center py-8">Cargando...</p>
              ) : kpisData.balances?.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={kpisData.balances}>
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
                <p className="text-gray-500 text-center py-8">No hay datos suficientes</p>
              )}
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Evolución de Gastos (USD)</h2>
                {loadingKpis ? (
                  <p className="text-gray-500 text-center py-8">Cargando...</p>
                ) : kpisData.gastos?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={kpisData.gastos}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
                      <Tooltip formatter={(value: any) => `$${formatUsd(value as number)}`} />
                      <Area type="monotone" dataKey="monto_usd" stroke="#f97316" fill="#f97316" fillOpacity={0.3} name="Gastos ($)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No hay datos</p>
                )}
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Fondo de Reserva (USD)</h2>
                {loadingKpis ? (
                  <p className="text-gray-500 text-center py-8">Cargando...</p>
                ) : kpisData.balances?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={kpisData.balances}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
                      <Tooltip formatter={(value: any) => `$${formatUsd(value as number)}`} />
                      <Line type="monotone" dataKey="fondo_reserva_usd" stroke="#9333ea" strokeWidth={2} name="Fondo ($)" dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No hay datos</p>
                )}
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm text-center">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Deuda Total</h2>
                <div className="text-3xl font-bold text-red-600">$ {formatUsd(kpisData.deudaTotalUsd || 0)}</div>
                <div className="text-lg text-gray-600 mt-1">Bs. {formatBs(kpisData.deudaTotal || 0)}</div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm text-center">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Unidades</h2>
                <div className="text-3xl font-bold text-blue-600">{kpisData.unidadesCount || 0}</div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm text-center">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Alicuota Promedio</h2>
                <div className="text-3xl font-bold text-purple-600">$ {formatUsd(kpisData.alicuotaPromedio || 0)}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "configuracion" && building && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuración</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Administradora</label>
                  <select value={editConfig.admin_nombre} onChange={(e) => setEditConfig({ ...editConfig, admin_nombre: e.target.value })} className="w-full px-4 py-3 border rounded-lg">
                    <option value="La Ideal C.A.">La Ideal C.A.</option>
                    <option value="Administradora Elite">Administradora Elite</option>
                    <option value="Otra">Otra</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Clave de Acceso</label>
                  <input type="password" value={editConfig.admin_secret} onChange={(e) => setEditConfig({ ...editConfig, admin_secret: e.target.value })} className="w-full px-4 py-3 border rounded-lg" placeholder="Tu contraseña" />
                </div>
              </div>
              <button onClick={handleSaveConfig} disabled={saving} className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Guardando..." : "Guardar"}
              </button>
              <div className="mt-8 pt-6 border-t">
                <button onClick={handleSync} disabled={syncing || !hasIntegration} className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50">
                  {syncing ? "Sincronizando..." : "Sincronizar Ahora"}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "manual" && (
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Control Manual</h2>
            <p className="text-sm text-gray-500 mb-4">Agrega registros para cuadre de saldo.</p>
            {movimientosManual.length === 0 ? (
              <p className="text-gray-500">No hay registros.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50"><th className="text-left py-2 px-2">Fecha</th><th className="text-right py-2 px-2">Saldo Final</th><th className="text-right py-2 px-2">USD</th></tr></thead>
                  <tbody>
                    {movimientosManual.map((m: any) => (
                      <tr key={m.id} className="border-b">
                        <td className="py-2 px-2">{m.fecha_corte}</td>
                        <td className="py-2 px-2 text-right">{formatBs(m.saldo_final)}</td>
                        <td className="py-2 px-2 text-right">{formatUsd(m.saldo_final_usd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button onClick={createMovimientoManual} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">+ Agregar</button>
          </div>
        )}

        {activeTab === "junta" && (
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Miembros de Junta</h2>
            {junta.length === 0 ? (
              <p className="text-gray-500">No hay miembros.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50"><th className="text-left py-2 px-2">Email</th><th className="text-left py-2 px-2">Nombre</th><th className="text-left py-2 px-2">Cargo</th></tr></thead>
                  <tbody>
                    {junta.map((m: any) => (
                      <tr key={m.id} className="border-b">
                        <td className="py-2 px-2">{m.email}</td>
                        <td className="py-2 px-2">{m.nombre}</td>
                        <td className="py-2 px-2">{m.cargo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 pt-4 border-t flex gap-2">
              <input type="email" placeholder="Email" className="border rounded px-3 py-2" id="newEmail" />
              <input type="text" placeholder="Nombre" className="border rounded px-3 py-2" id="newNombre" />
              <select className="border rounded px-3 py-2" id="newCargo">
                <option value="">Cargo</option>
                <option value="Presidente">Presidente</option>
                <option value="Tesorero">Tesorero</option>
              </select>
              <button onClick={addMiembro} className="px-4 py-2 bg-blue-600 text-white rounded">Agregar</button>
            </div>
          </div>
        )}

        {activeTab === "instrucciones" && (
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ayuda</h2>
            <div className="space-y-4 text-sm text-gray-600">
              <p>📊 Resumen - Vista principal con indicadores.</p>
              <p>📋 Movimientos - Historial de transacciones.</p>
              <p>📈 KPIs - Gráficos de evolución financiera en USD.</p>
              <p>⚙️ Configuración - Credenciales de administradora.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}