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
  const [movimientosManual, setMovimientosManual] = useState<MovimientoManual[]>([]);
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
  const [alertas, setAlertas] = useState<any[]>([]);
  const [loadingAlertas, setLoadingAlertas] = useState(false);
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
        // Calcular saldo acumulado de forma dinámica (asumiendo que vienen ordenados por fecha corte DESC)
        // El saldo acumulado se calcula de abajo hacia arriba (más antiguos a más nuevos)
        const sorted = [...data.movimientos].sort((a: any, b: any) => a.fecha_corte.localeCompare(b.fecha_corte));
        let runningBalance = 0;
        const processed = sorted.map((m: any) => {
          runningBalance = (m.saldo_inicial || 0) - (m.egresos || 0) + (m.ingresos || 0);
          return { ...m, saldo_acumulado: runningBalance };
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
      const lastMov = movimientosManual.length > 0 ? movimientosManual[0] : null;
      const res = await fetch("/api/movimientos-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          edificio_id: building.id,
          fecha_corte: new Date().toISOString().split("T")[0],
          saldo_inicial: lastMov ? lastMov.saldo_final : 0,
          egresos: 0,
          ingresos: 0,
          saldo_final: lastMov ? lastMov.saldo_final : 0,
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
        body: JSON.stringify({ userId: user?.id, mes: syncMes }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al sincronizar");
      }
      setSyncMessage(data.message || `Sincronización completada para ${syncMes}`);
      if (data.stats) {
        loadMovements();
        loadEgresos();
        loadRecibos();
        loadSincronizaciones();
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
        <div className="flex flex-wrap gap-2 mb-8">
          <button onClick={() => setActiveTab("resumen")} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "resumen" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"}`}>Resumen</button>
          <button onClick={() => setActiveTab("ingresos")} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "ingresos" ? "bg-green-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"}`}>Ingresos</button>
          <button onClick={() => setActiveTab("movimientos")} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "movimientos" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"}`}>Movimientos</button>
          <button onClick={() => setActiveTab("egresos")} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "egresos" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"}`}>Egresos</button>
          <button onClick={() => setActiveTab("gastos")} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "gastos" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"}`}>Gastos</button>
          <button onClick={() => setActiveTab("recibos")} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "recibos" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"}`}>Recibos</button>
          <button onClick={() => setActiveTab("balance")} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "balance" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"}`}>Balance</button>
          <button onClick={() => setActiveTab("alicuotas")} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "alicuotas" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"}`}>Alicuotas</button>
          <button onClick={() => setActiveTab("alertas")} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "alertas" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"}`}>Alertas</button>
          <button onClick={() => setActiveTab("kpis")} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "kpis" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"}`}>KPIs</button>
          <button onClick={() => setActiveTab("manual")} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "manual" ? "bg-yellow-600 text-white" : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"}`}>Ing/Egr Manual</button>
          <button onClick={() => setActiveTab("junta")} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "junta" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"}`}>Junta</button>
          <button onClick={() => setActiveTab("configuracion")} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "configuracion" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"}`}>Configuración</button>
        </div>

        {activeTab === "resumen" && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50 border border-gray-100" onClick={() => setActiveTab("balance")}>
                <div className="text-sm text-gray-500 mb-1">Saldo Disponible seg&uacute;n Web Admin</div>
                <div className="text-2xl font-bold text-blue-600">Bs.{(balance?.saldo_disponible || 0).toLocaleString("es-ES", { minimumFractionDigits: 2 })}</div>
                {tasaBCV.dolar > 0 && <div className="text-sm text-gray-400">$ {((balance?.saldo_disponible || 0) / tasaBCV.dolar).toLocaleString("es-ES", { minimumFractionDigits: 2 })}</div>}
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50 border border-gray-100" onClick={() => setActiveTab("balance")}>
                <div className="text-sm text-gray-500 mb-1">Cobranza del Mes</div>
                <div className="text-2xl font-bold text-green-600">Bs.{(balance?.cobranza_mes || ingresosSummary.monto).toLocaleString("es-ES", { minimumFractionDigits: 2 })}</div>
                {tasaBCV.dolar > 0 && <div className="text-sm text-gray-400">$ {((balance?.cobranza_mes || ingresosSummary.monto) / tasaBCV.dolar).toLocaleString("es-ES", { minimumFractionDigits: 2 })}</div>}
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50 border border-gray-100" onClick={() => setActiveTab("gastos")}>
                <div className="text-sm text-gray-500 mb-1">Gastos del Mes</div>
                <div className="text-2xl font-bold text-orange-600">Bs.{Math.abs(balance?.gastos_facturados || gastosSummary.monto).toLocaleString("es-ES", { minimumFractionDigits: 2 })}</div>
                {tasaBCV.dolar > 0 && <div className="text-sm text-gray-400">$ {Math.abs((balance?.gastos_facturados || gastosSummary.monto) / tasaBCV.dolar).toLocaleString("es-ES", { minimumFractionDigits: 2 })}</div>}
                <div className="text-xs text-gray-400 mt-1">
                  {gastosSummary.cantidad} movimiento{gastosSummary.cantidad !== 1 ? "s" : ""}
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50 border border-gray-100" onClick={() => setActiveTab("balance")}>
                <div className="text-sm text-gray-500 mb-1">Fondo Reserva</div>
                <div className="text-2xl font-bold text-purple-600">Bs.{(balance?.fondo_reserva || 0).toLocaleString("es-ES", { minimumFractionDigits: 2 })}</div>
                {tasaBCV.dolar > 0 && <div className="text-sm text-gray-400">$ {((balance?.fondo_reserva || 0) / tasaBCV.dolar).toLocaleString("es-ES", { minimumFractionDigits: 2 })}</div>}
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50 border border-gray-100" onClick={() => setActiveTab("egresos")}>
                <div className="text-sm text-gray-500 mb-1">Egresos del Mes</div>
                <div className="text-2xl font-bold text-red-600">
                  Bs.{formatBs(egresosSummary.monto)}
                </div>
                {tasaBCV.dolar > 0 && <div className="text-sm text-gray-400">$ {formatUsd(egresosSummary.monto / tasaBCV.dolar)}</div>}
                <div className="text-xs text-gray-400 mt-1">
                  {egresosSummary.cantidad} movimiento{egresosSummary.cantidad !== 1 ? "s" : ""}
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50 border border-gray-100" onClick={() => setActiveTab("recibos")}>
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
              <div className="bg-white p-6 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50 border border-gray-100" onClick={() => setActiveTab("manual")}>
                <div className="text-sm text-gray-500 mb-1">Saldo Manual</div>
                <div className="text-2xl font-bold text-indigo-600">
                  Bs. {formatBs(movimientosManual.length > 0 ? movimientosManual[0].saldo_final : 0)}
                </div>
                <div className="text-sm text-gray-500 font-medium">
                  $ {formatUsd(movimientosManual.length > 0 ? movimientosManual[0].saldo_final_usd : 0)}
                </div>
                <div className="text-[10px] text-gray-400 mt-1 uppercase font-bold">
                  Último Saldo Registrado
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50 border border-gray-100" onClick={() => setActiveTab("manual")}>
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

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Movimientos de Hoy ({new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })})</h2>
                <button
                  onClick={handleSync}
                  disabled={syncing || !hasIntegration}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {syncing ? "Sincronizando..." : "Sincronizar Ahora"}
                </button>
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
                  <div className="text-xs text-gray-400 mb-3 uppercase tracking-wider font-bold">
                    Registros encontrados: {movements.length}
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
                      {movements.map((mov) => (
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
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "recibos" && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recibos Pendientes por Unidad</h2>
              <div className="flex gap-2">
                <button onClick={loadRecibos} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Refrescar">
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
        )}

        {activeTab === "egresos" && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Egresos Generales</h2>
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Gastos del Edificio</h2>
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
                        <td className="py-3 px-4 text-xs text-gray-400 font-mono">{gasto.codigo || "-"}</td>
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

        {activeTab === "balance" && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Estado de Cuenta del Edificio (Balance General)</h2>
            {loadingBalance ? (
              <p className="text-gray-500 text-center py-8">Cargando...</p>
            ) : !balance ? (
              <p className="text-gray-500 text-center py-8 border border-dashed border-gray-200 rounded-lg">
                No hay datos de balance. Ejecuta una sincronización primero.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 bg-gray-50">
                      <th className="text-left py-3 px-4 font-bold text-gray-600 uppercase tracking-wider">Concepto Detallado</th>
                      <th className="text-right py-3 px-4 font-bold text-gray-600 uppercase tracking-wider">Monto Bs.</th>
                      <th className="text-right py-3 px-4 font-bold text-gray-600 uppercase tracking-wider">Equiv. USD</th>
                      <th className="text-right py-3 px-4 font-bold text-gray-600 uppercase tracking-wider">Saldo Bs.</th>
                      <th className="text-right py-3 px-4 font-bold text-gray-600 uppercase tracking-wider">Saldo USD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr className="bg-blue-50/50 font-bold"><td className="py-2.5 px-4 text-blue-800" colSpan={5}>I. DISPONIBILIDAD EN CAJA Y BANCOS</td></tr>
                    <tr><td className="py-2.5 px-4 pl-10 text-gray-700">SALDO DE CAJA MES ANTERIOR</td><td className="py-2.5 px-4 text-right text-gray-500">{formatBs(balance.saldo_anterior)}</td><td className="py-2.5 px-4 text-right text-gray-400 italic">$ {formatUsd(tasaBCV.dolar > 0 ? balance.saldo_anterior / tasaBCV.dolar : 0)}</td><td className="py-2.5 px-4 text-right"></td><td className="py-2.5 px-4 text-right"></td></tr>
                    <tr><td className="py-2.5 px-4 pl-10 text-gray-700">COBRANZA DEL MES (INGRESOS)</td><td className="py-2.5 px-4 text-right text-green-600 font-medium">+{formatBs(balance.cobranza_mes)}</td><td className="py-2.5 px-4 text-right text-green-500 italic">$ {formatUsd(tasaBCV.dolar > 0 ? balance.cobranza_mes / tasaBCV.dolar : 0)}</td><td className="py-2.5 px-4 text-right"></td><td className="py-2.5 px-4 text-right"></td></tr>
                    <tr><td className="py-2.5 px-4 pl-10 text-gray-700">GASTOS FACTURADOS EN EL MES</td><td className="py-2.5 px-4 text-right text-red-600 font-medium">{formatBs(balance.gastos_facturados)}</td><td className="py-2.5 px-4 text-right text-red-500 italic">$ {formatUsd(tasaBCV.dolar > 0 ? balance.gastos_facturados / tasaBCV.dolar : 0)}</td><td className="py-2.5 px-4 text-right"></td><td className="py-2.5 px-4 text-right"></td></tr>
                    <tr><td className="py-2.5 px-4 pl-10 text-gray-700">AJUSTES / DIF. CAMBIARIA / PAGOS A TIEMPO</td><td className="py-2.5 px-4 text-right text-gray-500 font-medium">{formatBs(balance.ajuste_pago_tiempo || 0)}</td><td className="py-2.5 px-4 text-right text-gray-400 italic">$ {formatUsd(tasaBCV.dolar > 0 ? (balance.ajuste_pago_tiempo || 0) / tasaBCV.dolar : 0)}</td><td className="py-2.5 px-4 text-right"></td><td className="py-2.5 px-4 text-right"></td></tr>
                    <tr className="bg-gray-100 font-bold border-y border-gray-200"><td className="py-3 px-4 text-blue-700">TOTAL DISPONIBLE EN CAJA</td><td className="py-3 px-4 text-right"></td><td className="py-3 px-4 text-right"></td><td className="py-3 px-4 text-right text-blue-700 font-extrabold">{formatBs(balance.saldo_disponible)}</td><td className="py-3 px-4 text-right text-blue-600 font-extrabold">$ {formatUsd(tasaBCV.dolar > 0 ? balance.saldo_disponible / tasaBCV.dolar : 0)}</td></tr>
                    
                    <tr className="bg-orange-50/50 font-bold"><td className="py-2.5 px-4 text-orange-800" colSpan={5}>II. CUENTAS POR COBRAR (CONDOMINIOS)</td></tr>
                    <tr><td className="py-2.5 px-4 pl-10 text-gray-700">RECIBOS DE CONDOMINIOS DEL MES ACTUAL</td><td className="py-2.5 px-4 text-right text-gray-500">{formatBs(balance.recibos_mes)}</td><td className="py-2.5 px-4 text-right text-gray-400 italic">$ {formatUsd(tasaBCV.dolar > 0 ? balance.recibos_mes / tasaBCV.dolar : 0)}</td><td className="py-2.5 px-4 text-right"></td><td className="py-2.5 px-4 text-right"></td></tr>
                    <tr><td className="py-2.5 px-4 pl-10 text-gray-700">DEUDA DE MESES ATRASADOS</td><td className="py-2.5 px-4 text-right text-gray-500">{formatBs(balance.condominios_atrasados)}</td><td className="py-2.5 px-4 text-right text-gray-400 italic">$ {formatUsd(tasaBCV.dolar > 0 ? balance.condominios_atrasados / tasaBCV.dolar : 0)}</td><td className="py-2.5 px-4 text-right"></td><td className="py-2.5 px-4 text-right"></td></tr>
                    <tr><td className="py-2.5 px-4 pl-10 text-gray-700">SALDOS A FAVOR (SOBRANTES)</td><td className="py-2.5 px-4 text-right text-gray-500">{formatBs(balance.condominios_sobrantes || 0)}</td><td className="py-2.5 px-4 text-right text-gray-400 italic">$ {formatUsd(tasaBCV.dolar > 0 ? (balance.condominios_sobrantes || 0) / tasaBCV.dolar : 0)}</td><td className="py-2.5 px-4 text-right"></td><td className="py-2.5 px-4 text-right"></td></tr>
                    <tr className="bg-gray-100 font-bold border-y border-gray-200"><td className="py-3 px-4 text-orange-700">TOTAL CUENTAS POR COBRAR</td><td className="py-3 px-4 text-right"></td><td className="py-3 px-4 text-right"></td><td className="py-3 px-4 text-right text-orange-700 font-extrabold">{formatBs(balance.total_por_cobrar)}</td><td className="py-3 px-4 text-right text-orange-600 font-extrabold">$ {formatUsd(tasaBCV.dolar > 0 ? balance.total_por_cobrar / tasaBCV.dolar : 0)}</td></tr>
                    <tr className="bg-purple-50 font-bold"><td className="py-3 px-4 text-purple-800">CAPITAL TOTAL DEL EDIFICIO (CAJA + CONDOMINIOS)</td><td className="py-3 px-4 text-right"></td><td className="py-3 px-4 text-right"></td><td className="py-3 px-4 text-right text-purple-800 font-black">{formatBs(balance.total_caja_y_cobrar || (balance.saldo_disponible + balance.total_por_cobrar))}</td><td className="py-3 px-4 text-right text-purple-700 font-black">$ {formatUsd(tasaBCV.dolar > 0 ? (balance.total_caja_y_cobrar || (balance.saldo_disponible + balance.total_por_cobrar)) / tasaBCV.dolar : 0)}</td></tr>
                    
                    <tr className="bg-emerald-50/50 font-bold"><td className="py-2.5 px-4 text-emerald-800" colSpan={5}>III. FONDOS DE RESERVA Y PASIVOS</td></tr>
                    <tr className="bg-gray-50/50"><td className="py-2 px-4 pl-10 font-medium text-gray-600" colSpan={5}>FONDO DE RESERVA GENERAL</td></tr>
                    <tr><td className="py-2 px-4 pl-16 text-gray-600">Saldo Mes Anterior</td><td className="py-2 px-4 text-right text-gray-400">{formatBs(balance.fondo_reserva_mes_anterior)}</td><td className="py-2 px-4 text-right text-gray-300 italic">$ {formatUsd(tasaBCV.dolar > 0 ? balance.fondo_reserva_mes_anterior / tasaBCV.dolar : 0)}</td><td className="py-2 px-4 text-right font-medium text-emerald-700">{formatBs(balance.fondo_reserva)}</td><td className="py-2 px-4 text-right text-emerald-600 italic font-medium">$ {formatUsd(tasaBCV.dolar > 0 ? balance.fondo_reserva / tasaBCV.dolar : 0)}</td></tr>
                    
                    <tr className="bg-gray-50/50"><td className="py-2 px-4 pl-10 font-medium text-gray-600" colSpan={5}>PASIVOS LABORALES (PRESTACIONES SOCIALES)</td></tr>
                    <tr><td className="py-2 px-4 pl-16 text-gray-600">Acumulado Histórico</td><td className="py-2 px-4 text-right text-gray-400">{formatBs(balance.fondo_prestaciones_mes_anterior)}</td><td className="py-2 px-4 text-right text-gray-300 italic">$ {formatUsd(tasaBCV.dolar > 0 ? balance.fondo_prestaciones_mes_anterior / tasaBCV.dolar : 0)}</td><td className="py-2 px-4 text-right font-medium text-emerald-700">{formatBs(balance.fondo_prestaciones)}</td><td className="py-2 px-4 text-right text-emerald-600 italic font-medium">$ {formatUsd(tasaBCV.dolar > 0 ? balance.fondo_prestaciones / tasaBCV.dolar : 0)}</td></tr>

                    <tr className="bg-gray-50/50"><td className="py-2 px-4 pl-10 font-medium text-gray-600" colSpan={5}>FONDO TRABAJOS VARIOS / MEJORAS</td></tr>
                    <tr><td className="py-2 px-4 pl-16 text-gray-600">Presupuesto Asignado</td><td className="py-2 px-4 text-right text-gray-400">{formatBs(balance.fondo_trabajos_varios_mes_anterior)}</td><td className="py-2 px-4 text-right text-gray-300 italic">$ {formatUsd(tasaBCV.dolar > 0 ? balance.fondo_trabajos_varios_mes_anterior / tasaBCV.dolar : 0)}</td><td className="py-2 px-4 text-right font-medium text-emerald-700">{formatBs(balance.fondo_trabajos_varios)}</td><td className="py-2 px-4 text-right text-emerald-600 italic font-medium">$ {formatUsd(tasaBCV.dolar > 0 ? balance.fondo_trabajos_varios / tasaBCV.dolar : 0)}</td></tr>

                    <tr className="bg-gray-50/50"><td className="py-2 px-4 pl-10 font-medium text-gray-600" colSpan={5}>FONDO INTERESES MORATORIOS</td></tr>
                    <tr><td className="py-2 px-4 pl-16 text-gray-600">Acumulado por Morosidad</td><td className="py-2 px-4 text-right text-gray-400">{formatBs(balance.fondo_intereses_mes_anterior)}</td><td className="py-2 px-4 text-right text-gray-300 italic">$ {formatUsd(tasaBCV.dolar > 0 ? balance.fondo_intereses_mes_anterior / tasaBCV.dolar : 0)}</td><td className="py-2 px-4 text-right font-medium text-emerald-700">{formatBs(balance.fondo_intereses)}</td><td className="py-2 px-4 text-right text-emerald-600 italic font-medium">$ {formatUsd(tasaBCV.dolar > 0 ? balance.fondo_intereses / tasaBCV.dolar : 0)}</td></tr>

                    <tr className="bg-gray-50/50"><td className="py-2 px-4 pl-10 font-medium text-gray-600" colSpan={5}>DIFERENCIAL CAMBIARIO (FONDO PROTECCIÓN)</td></tr>
                    <tr><td className="py-2 px-4 pl-16 text-gray-600">Ajuste por Tasa BCV</td><td className="py-2 px-4 text-right text-gray-400">{formatBs(balance.fondo_diferencial_mes_anterior)}</td><td className="py-2 px-4 text-right text-gray-300 italic">$ {formatUsd(tasaBCV.dolar > 0 ? balance.fondo_diferencial_mes_anterior / tasaBCV.dolar : 0)}</td><td className="py-2 px-4 text-right font-medium text-emerald-700">{formatBs(balance.fondo_diferencial_cambiario)}</td><td className="py-2 px-4 text-right text-emerald-600 italic font-medium">$ {formatUsd(tasaBCV.dolar > 0 ? balance.fondo_diferencial_cambiario / tasaBCV.dolar : 0)}</td></tr>

                    <tr className="bg-emerald-100 font-bold border-t-2 border-emerald-200"><td className="py-3 px-4 text-emerald-800">SALDO TOTAL RESERVAS ASIGNADAS</td><td className="py-3 px-4 text-right"></td><td className="py-3 px-4 text-right"></td><td className="py-3 px-4 text-right text-emerald-800 font-black">{formatBs(balance.saldo_reservas)}</td><td className="py-3 px-4 text-right text-emerald-700 font-black">$ {formatUsd(tasaBCV.dolar > 0 ? balance.saldo_reservas / tasaBCV.dolar : 0)}</td></tr>
                  </tbody>
                </table>
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
                        <td className="py-2 px-2 text-right font-mono text-xs">{a.alicuota?.toFixed(5) || "-"}%</td>
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
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span>🔔</span> Alertas y Notificaciones Recientes
              </h2>
              {loadingAlertas ? (
                <p className="text-gray-500 text-center py-4">Cargando notificaciones...</p>
              ) : alertas.length === 0 ? (
                <p className="text-gray-500 text-center py-8 border border-dashed border-gray-200 rounded-lg">No hay alertas recientes.</p>
              ) : (
                <div className="space-y-3">
                  {alertas.map((a: any) => (
                    <div key={a.id} className={`p-4 rounded-lg border flex gap-4 ${
                      a.tipo === "error" ? "bg-red-50 border-red-100" :
                      a.tipo === "warning" ? "bg-yellow-50 border-yellow-100" :
                      "bg-green-50 border-green-100"
                    }`}>
                      <div className="text-xl">
                        {a.tipo === "error" ? "❌" : a.tipo === "warning" ? "⚠️" : "✅"}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className={`font-bold text-sm ${
                            a.tipo === "error" ? "text-red-800" :
                            a.tipo === "warning" ? "text-yellow-800" :
                            "text-green-800"
                          }`}>{a.titulo}</h3>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {new Date(a.created_at).toLocaleString("es-VE")}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{a.descripcion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span>📋</span> Historial de Procesos (Logs)
              </h2>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-4">
                <p className="text-xs text-gray-500 leading-relaxed uppercase font-bold tracking-tighter">
                  Registro técnico detallado de cada sincronización con la web administradora.
                </p>
              </div>
              {loadingSincronizaciones ? (
                <p className="text-gray-500 text-center py-4">Cargando historial...</p>
              ) : sincronizaciones.length === 0 ? (
                <p className="text-gray-500 text-center py-8 border border-dashed border-gray-200 rounded-lg">No hay registros de ejecución.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-2 px-3 text-[10px] font-bold text-gray-500 uppercase">Fecha</th>
                        <th className="text-left py-2 px-3 text-[10px] font-bold text-gray-500 uppercase">Estado</th>
                        <th className="text-right py-2 px-3 text-[10px] font-bold text-gray-500 uppercase">Nuevos</th>
                        <th className="text-left py-2 px-3 text-[10px] font-bold text-gray-500 uppercase">Mensaje de Sistema</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sincronizaciones.map((s: any) => (
                        <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-2.5 px-3 text-[10px] text-gray-400 font-mono">
                            {s.created_at ? new Date(s.created_at).toLocaleString("es-VE") : "-"}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              s.estado === "completado" ? "bg-green-100 text-green-700" :
                              s.estado === "error" ? "bg-red-100 text-red-700" :
                              "bg-yellow-100 text-yellow-700"
                            }`}>
                              {s.estado || "pendiente"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-xs font-bold text-gray-900">{s.movimientos_nuevos || 0}</td>
                          <td className="py-2.5 px-3">
                            <span className={`text-[10px] font-medium block truncate max-w-xs ${s.estado === 'error' ? 'text-red-500' : 'text-gray-600'}`}>
                              {s.error}
                            </span>
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

        {activeTab === "kpis" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Evolución del Saldo Disponible (USD)</h2>
              {loadingKpis ? (
                <p className="text-gray-500 text-center py-8">Cargando...</p>
              ) : kpisData.balances?.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={kpisData.balances} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fontWeight: 500 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={(value: any) => [`$${formatUsd(value as number)}`, "Saldo"]} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="saldo_disponible_usd" stroke="#2563eb" strokeWidth={3} name="Saldo Disponible ($)" dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-center py-8 border border-dashed rounded-lg">No hay datos suficientes para generar gráficos.</p>
              )}
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
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
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
                ) : kpisData.gastos?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={kpisData.gastos} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
                      <Tooltip formatter={(value: any) => [`$${formatUsd(value as number)}`, "Gastos"]} />
                      <Area type="monotone" dataKey="monto_usd" stroke="#f97316" fillOpacity={1} fill="url(#colorGastos)" name="Gastos ($)" />
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
                      <YAxis tick={{ fontSize: 9 }} tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
                      <Tooltip formatter={(value: any) => [`$${formatUsd(value as number)}`, "Egresos"]} />
                      <Bar dataKey="monto_usd" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Egresos ($)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No hay datos de egresos</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "manual" && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Control Manual de Movimientos Bancarios</h2>
                <p className="text-sm text-gray-500 italic font-medium">Registra movimientos bancarios pendientes por cargar en Web Admin.</p>
              </div>
              <button onClick={createMovimientoManual} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm text-sm uppercase">
                + Nuevo Registro
              </button>
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
                    {movimientosManual.map((m: MovimientoManual) => (
                      <tr key={m.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="py-2 px-1">
                          <input type="date" defaultValue={m.fecha_corte} onBlur={(e) => updateMovimientoManual(m.id, "fecha_corte", e.target.value)} className="border-none bg-transparent focus:ring-0 w-24 text-[10px] font-mono p-0" />
                        </td>
                        <td className="py-2 px-2 text-right bg-gray-100/50">
                          <input type="number" defaultValue={m.saldo_inicial} onBlur={(e) => updateMovimientoManual(m.id, "saldo_inicial", e.target.value)} className="text-right border-none bg-transparent focus:ring-0 w-full p-0 font-mono" />
                        </td>
                        <td className="py-2 px-2 text-right bg-red-50/20">
                          <input type="number" defaultValue={m.egresos} onBlur={(e) => updateMovimientoManual(m.id, "egresos", e.target.value)} className="text-right border-none bg-transparent focus:ring-0 w-full p-0 text-red-600 font-black font-mono" />
                        </td>
                        <td className="py-2 px-2">
                          <input type="text" defaultValue={m.obs_egresos || ""} onBlur={(e) => updateMovimientoManual(m.id, "obs_egresos", e.target.value)} className="text-left border-none bg-transparent focus:ring-0 w-full p-0 text-[10px] italic text-gray-500" placeholder="..." />
                        </td>
                        <td className="py-2 px-2 text-right bg-green-50/20">
                          <input type="number" defaultValue={m.ingresos} onBlur={(e) => updateMovimientoManual(m.id, "ingresos", e.target.value)} className="text-right border-none bg-transparent focus:ring-0 w-full p-0 text-green-700 font-black font-mono" />
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
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "junta" && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Miembros de la Junta de Condominio</h2>
            <div className="grid md:grid-cols-4 gap-4 mb-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre Completo</label>
                <input type="text" id="newNombre" className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Ej. Juan Perez" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                <input type="email" id="newEmail" className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="email@ejemplo.com" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cargo</label>
                <select id="newCargo" className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                  <option value="Presidente">Presidente</option>
                  <option value="Tesorero">Tesorero</option>
                  <option value="Secretario">Secretario</option>
                  <option value="Vocal">Vocal</option>
                  <option value="Administrador">Administrador</option>
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={addMiembro} className="w-full py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 transition-colors text-sm">
                  + AGREGAR MIEMBRO
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
                      <th className="text-center py-3 px-4 font-bold text-gray-600 uppercase text-xs">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {junta.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 text-gray-900">{m.nombre}</td>
                        <td className="py-3 px-4 text-gray-600">{m.email}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold uppercase">{m.cargo}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button onClick={() => deleteMiembro(m.id)} className="text-red-400 hover:text-red-600 transition-colors" title="Eliminar">
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "instrucciones" && (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Guía de Uso del Sistema</h2>
            
            <div className="space-y-8">
              <section>
                <h3 className="text-lg font-bold text-blue-700 mb-3 border-b pb-1">1. Sincronización Automática</h3>
                <p className="text-gray-700 leading-relaxed">
                  El sistema extrae datos directamente de la web de tu administradora (La Ideal, etc.). Para que funcione:
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-600">
                  <li>Ve a la pestaña <strong>Configuración</strong>.</li>
                  <li>Ingresa tu clave de acceso al portal de la administradora.</li>
                  <li>Usa el botón <strong>&quot;Sincronizar Ahora&quot;</strong> en la pestaña Resumen para actualizar datos.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-bold text-blue-700 mb-3 border-b pb-1">2. Control de Movimientos Manuales</h3>
                <p className="text-gray-700 leading-relaxed">
                  A veces hay transferencias o pagos que se reflejan en el banco pero aún no en el portal Web Admin.
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-600">
                  <li>Usa la pestaña <strong>Ing/Egr Manual</strong> para registrar estos movimientos.</li>
                  <li>El sistema usará el &quot;Saldo Final&quot; de esta pestaña para la conciliación bancaria real.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-bold text-blue-700 mb-3 border-b pb-1">3. Informes Automáticos por Email</h3>
                <p className="text-gray-700 leading-relaxed">
                  Puedes enviar un informe consolidado a todos los miembros de la junta con un solo clic.
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-600">
                  <li>Configura los correos en la pestaña <strong>Junta</strong>.</li>
                  <li>En <strong>Configuración</strong>, ingresa la lista de correos destino separados por coma.</li>
                  <li>Haz clic en <strong>Enviar Informe Financiero</strong> para despachar el reporte PDF/HTML.</li>
                </ul>
              </section>
            </div>
            
            <div className="mt-12 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-500 text-center">
                Desarrollado para CondominioSaaS v1.0 - 2026
              </p>
            </div>
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
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">Unidades</label>
                  <div className="text-gray-900 font-bold">{building.unidades} APARTAMENTOS</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuración de Integración Web Admin</h2>
              
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de Administradora</label>
                    <select
                      value={editConfig.admin_nombre}
                      onChange={(e) => setEditConfig({ ...editConfig, admin_nombre: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Clave de Acceso (Portal Web)</label>
                    <input
                      type="password"
                      value={editConfig.admin_secret}
                      onChange={(e) => setEditConfig({ ...editConfig, admin_secret: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                      placeholder="Contraseña del portal"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">URLs de Scraping (Configuración Avanzada)</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">URL Login</label>
                      <input type="text" value={editConfig.url_login} onChange={(e) => setEditConfig({ ...editConfig, url_login: e.target.value })} className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs font-mono bg-gray-50" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">URL Recibos</label>
                      <input type="text" value={editConfig.url_recibos} onChange={(e) => setEditConfig({ ...editConfig, url_recibos: e.target.value })} className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs font-mono bg-gray-50" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">URL Egresos</label>
                      <input type="text" value={editConfig.url_egresos} onChange={(e) => setEditConfig({ ...editConfig, url_egresos: e.target.value })} className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs font-mono bg-gray-50" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">URL Gastos</label>
                      <input type="text" value={editConfig.url_gastos} onChange={(e) => setEditConfig({ ...editConfig, url_gastos: e.target.value })} className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs font-mono bg-gray-50" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">URL Balance</label>
                      <input type="text" value={editConfig.url_balance} onChange={(e) => setEditConfig({ ...editConfig, url_balance: e.target.value })} className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs font-mono bg-gray-50" />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Destinatarios de Informe por Email</h3>
                  <div>
                    <input
                      type="text"
                      value={editConfig.email_junta}
                      onChange={(e) => setEditConfig({ ...editConfig, email_junta: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="correo1@gmail.com, correo2@gmail.com"
                    />
                    <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold italic">SOPORTA MÚLTIPLES CORREOS SEPARADOS POR COMA (,)</p>
                  </div>
                </div>

                <div className="border-t pt-6 flex gap-4">
                  <button onClick={handleSaveConfig} disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 uppercase text-xs">
                    {saving ? "Guardando..." : "Guardar Configuración"}
                  </button>
                  <button onClick={handleTestConnection} disabled={saving} className="px-6 py-2.5 bg-white text-blue-600 border border-blue-600 rounded-lg font-bold hover:bg-blue-50 transition-colors uppercase text-xs shadow-sm">
                    Probar Conexión
                  </button>
                  <button onClick={() => sendEmailToJunta(false)} disabled={sendingEmail || !editConfig.email_junta} className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50 uppercase text-xs ml-auto">
                    {sendingEmail ? "Enviando..." : "Enviar Informe Ahora"}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-gray-100 p-4 rounded-xl border border-gray-200 shadow-inner">
               <h3 className="text-sm font-black text-gray-700 mb-4 uppercase tracking-tighter flex items-center gap-2">
                 <span>📅</span> Sincronización por Mes Específico
               </h3>
               <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Mes a sincronizar (MM-YYYY)</label>
                    <input type="text" value={syncMes} onChange={(e) => setSyncMes(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500" placeholder="03-2026" />
                  </div>
                  <button onClick={handleSyncMes} disabled={syncingMes || !syncMes} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors uppercase text-xs h-[38px] shadow-sm">
                    {syncingMes ? "Sincronizando..." : "Sincronizar Mes Histórico"}
                  </button>
               </div>
               <p className="text-[10px] text-gray-500 mt-2 italic font-black uppercase tracking-tighter">Útil para recuperar datos de meses anteriores cerrados en el portal.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
