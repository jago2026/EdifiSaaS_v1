"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, ComposedChart } from "recharts";

type Tab = "resumen" | "ingresos" | "movimientos" | "egresos" | "gastos" | "recibos" | "recibo" | "balance" | "alicuotas" | "alertas" | "edificio" | "configuracion" | "manual" | "kpis" | "informes" | "instrucciones" | "junta";

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
  const [selectedMesGastos, setSelectedMesGastos] = useState<string>("");
  const [mesesRecibos, setMesesRecibos] = useState<string[]>([]);
  const [selectedMesRecibos, setSelectedMesRecibos] = useState<string>("");
  const [movimientosManual, setMovimientosManual] = useState<MovimientoManual[]>([]);
  const [loadingManual, setLoadingManual] = useState(false);
  const [alicuotas, setAlicuotas] = useState<Alicuota[]>([]);
  const [loadingAlicuotas, setLoadingAlicuotas] = useState(false);
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
  const [selectedUnidad, setSelectedUnidad] = useState<string>("");
  const [reciboDetalle, setReciboDetalle] = useState<any[]>([]);
  const [loadingRecibo, setLoadingRecibo] = useState(false);
  const [reciboGeneral, setReciboGeneral] = useState<any[]>([]);
  const [loadingReciboGeneral, setLoadingReciboGeneral] = useState(false);
  const [syncMes, setSyncMes] = useState("");
  const [syncing, setSyncing] = useState(false);

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
  const [informeFecha, setInformeFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [informeData, setInformeData] = useState<any>(null);
  const [loadingInforme, setLoadingInforme] = useState(false);
  const [gastosRecurrentes, setGastosRecurrentes] = useState<any[]>([]);
  const [loadingGastosRecurrentes, setLoadingGastosRecurrentes] = useState(false);
  const [evolucionRecurrentes, setEvolucionRecurrentes] = useState<any[]>([]);

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
  };  const [editConfig, setEditConfig] = useState({
    admin_id: "",
    admin_secret: "",
    admin_nombre: "La Ideal C.A.",
    url_login: "",
    url_recibos: "",
    url_recibo_mes: "",
    url_egresos: "",
    url_gastos: "",
    url_balance: "",
    cron_enabled: true,
    cron_time: "05:00",
    cron_frequency: "diaria",
    email_junta: "",
    sync_recibos: true,
    sync_egresos: true,
    sync_gastos: true,
    sync_alicuotas: true,
    sync_balance: true,
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
        url_recibo_mes: building.url_recibo_mes || "",
        url_egresos: building.url_egresos || "",
        url_gastos: building.url_gastos || "",
        url_balance: building.url_balance || "",
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
    }
    if (activeTab === "junta" && building?.id) {
      loadJunta();
    }
    if (activeTab === "alertas" && building?.id) {
      loadSincronizaciones();
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
      console.log("[Balance] API response:", data);
      if (res.ok) {
        setBalance(data.balance || null);
        // Siempre actualizar los meses disponibles
        if (data.mesesDisponibles && data.mesesDisponibles.length > 0) {
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
        const processed = sorted.map((m: any, index: number) => {
          // Si es el primero, empezamos con su saldo inicial
          // Si no, el saldo final de la fila es inicial - egresos + ingresos
          const saldoFinalFila = (m.saldo_inicial || 0) - (m.egresos || 0) + (m.ingresos || 0);
          return { ...m, saldo_acumulado: saldoFinalFila, computed_saldo_final: saldoFinalFila };
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
    let urls = {
      url_login: '',
      url_recibos: '',
      url_recibo_mes: '',
      url_egresos: '',
      url_gastos: '',
      url_balance: '',
    };

    if (adminName === "La Ideal C.A.") {
      urls = {
        url_login: 'https://admlaideal.com.ve/condlin.php?r=1',
        url_recibos: 'https://admlaideal.com.ve/condlin.php?r=5',
        url_recibo_mes: 'https://admlaideal.com.ve/condlin.php?r=4',
        url_egresos: 'https://admlaideal.com.ve/condlin.php?r=21',
        url_gastos: 'https://admlaideal.com.ve/condlin.php?r=3',
        url_balance: 'https://admlaideal.com.ve/condlin.php?r=2',
      };
    } else if (adminName === "Admastridcarrasquel" || adminName === "Administradora AC. Condominios, C.A.") {
      urls = {
        url_login: 'https://www.admastridcarrasquel.com/condlin.php',
        url_recibos: 'https://www.admastridcarrasquel.com/condlin.php?r=5',
        url_recibo_mes: 'https://www.admastridcarrasquel.com/condlin.php?r=4',
        url_egresos: 'https://www.admastridcarrasquel.com/condlin.php?r=21',
        url_gastos: 'https://www.admastridcarrasquel.com/condlin.php?r=3',
        url_balance: 'https://www.admastridcarrasquel.com/condlin.php?r=2',
      };
    } else if (adminName === "Administradora Elite") {
      urls = {
        url_login: 'https://www.administradoraelite.com/control.php',
        url_recibos: 'https://www.administradoraelite.com/condlin.php?r=5',
        url_recibo_mes: 'https://www.administradoraelite.com/condlin.php?r=4',
        url_egresos: 'https://www.administradoraelite.com/condlin.php?r=21',
        url_gastos: 'https://www.administradoraelite.com/condlin.php?r=3',
        url_balance: 'https://www.administradoraelite.com/condlin.php?r=2',
      };
    } else if (adminName === "Intercanar" || adminName === "Intercanariven") {
      urls = {
        url_login: 'https://www.intercanariven.com/control.php',
        url_recibos: 'https://www.intercanariven.com/condlin.php?r=5',
        url_recibo_mes: 'https://www.intercanariven.com/condlin.php?r=4',
        url_egresos: 'https://www.intercanariven.com/condlin.php?r=21',
        url_gastos: 'https://www.intercanariven.com/condlin.php?r=3',
        url_balance: 'https://www.intercanariven.com/condlin.php?r=2',
      };
    } else if (adminName === "Admactual" || adminName === "Administradora Actual, C.A.") {
      urls = {
        url_login: 'https://www.admactual.com/control.php',
        url_recibos: 'https://www.admactual.com/condlin.php?r=5',
        url_recibo_mes: 'https://www.admactual.com/condlin.php?r=4',
        url_egresos: 'https://www.admactual.com/condlin.php?r=21',
        url_gastos: 'https://www.admactual.com/condlin.php?r=3',
        url_balance: 'https://www.admactual.com/condlin.php?r=2',
      };
    } else if (adminName === "Condominios Chacao") {
      urls = {
        url_login: 'https://condominioschacao.com/control.php',
        url_recibos: 'https://condominioschacao.com/condlin.php?r=5',
        url_recibo_mes: 'https://condominioschacao.com/condlin.php?r=4',
        url_egresos: 'https://condominioschacao.com/condlin.php?r=21',
        url_gastos: 'https://condominioschacao.com/condlin.php?r=3',
        url_balance: 'https://condominioschacao.com/condlin.php?r=2',
      };
    } else if (adminName === "Obelisco") {
      urls = {
        url_login: 'https://www.obelisco.com.ve/condlin.php?r=1',
        url_recibos: 'https://www.obelisco.com.ve/condlin.php?r=5',
        url_recibo_mes: 'https://www.obelisco.com.ve/condlin.php?r=4',
        url_egresos: 'https://www.obelisco.com.ve/condlin.php?r=21',
        url_gastos: 'https://www.obelisco.com.ve/condlin.php?r=3',
        url_balance: 'https://www.obelisco.com.ve/condlin.php?r=2',
      };
    } else if (adminName === "Administradora GCM") {
      urls = {
        url_login: 'https://administradoragcm.com/empresa.htm/control.php',
        url_recibos: 'https://administradoragcm.com/empresa.htm/condlin.php?r=5',
        url_recibo_mes: 'https://administradoragcm.com/empresa.htm/condlin.php?r=4',
        url_egresos: 'https://administradoragcm.com/empresa.htm/condlin.php?r=21',
        url_gastos: 'https://administradoragcm.com/empresa.htm/condlin.php?r=3',
        url_balance: 'https://administradoragcm.com/empresa.htm/condlin.php?r=2',
      };
    }

    setEditConfig(prev => ({
      ...prev,
      admin_nombre: adminName,
      ...urls
    }));
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
          <button onClick={() => setActiveTab("recibo")} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "recibo" ? "bg-indigo-600 text-white" : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"}`}>Recibo Condominio</button>
          <button onClick={() => setActiveTab("balance")} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "balance" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"}`}>Balance</button>
          <button onClick={() => setActiveTab("alicuotas")} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "alicuotas" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"}`}>Alicuotas</button>
          <button onClick={() => setActiveTab("alertas")} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "alertas" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"}`}>Alertas</button>
          <button onClick={() => setActiveTab("kpis")} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "kpis" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"}`}>KPIs</button>
          <button onClick={() => setActiveTab("informes")} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "informes" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"}`}>Informes</button>
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
                  Bs. {formatBs(movimientosManual.length > 0 ? (movimientosManual[0]?.saldo_acumulado || 0) : 0)}
                </div>
                <div className="text-sm text-gray-500 font-medium">
                  $ {formatUsd(movimientosManual.length > 0 ? ((movimientosManual[0]?.saldo_acumulado || 0) / (movimientosManual[0]?.tasa_bcv || tasaBCV.dolar || 45)) : 0)}
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
                        loadReciboGeneral(newMes);
                      }}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                    >
                      <option value="">Mes Actual</option>
                      {mesesRecibos.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  )}
                  {building?.url_recibo_mes && (
                    <a
                      href={`${building.url_recibo_mes}${selectedMesRecibos ? `&combo=${selectedMesRecibos}` : ""}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors flex items-center gap-1.5"
                    >
                      <span>📄</span> PDF
                    </a>
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
                    <p className="text-[10px] text-emerald-600 font-bold uppercase mb-1">Fondo Reserva</p>
                    <p className="text-xl font-black text-emerald-900">Bs. {formatBs(balance.fondo_reserva)}</p>
                    <p className="text-xs text-emerald-700 font-medium">$ {formatUsd(tasaBCV.dolar > 0 ? balance.fondo_reserva / tasaBCV.dolar : 0)}</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 bg-gray-50">
                      <th className="text-left py-3 px-4 font-bold text-gray-600 uppercase tracking-wider">Concepto</th>
                      <th className="text-right py-3 px-4 font-bold text-gray-600 uppercase tracking-wider">Bs.</th>
                      <th className="text-right py-3 px-4 font-bold text-gray-600 uppercase tracking-wider">USD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr className="bg-blue-50 font-bold"><td className="py-2.5 px-4 text-blue-800" colSpan={3}>DISPONIBILIDAD EN CAJA</td></tr>
                    {balance.saldo_anterior ? <tr><td className="py-2.5 px-4 pl-4 text-gray-700">SALDO DE CAJA MES ANTERIOR</td><td className="py-2.5 px-4 text-right text-gray-500">{formatBs(balance.saldo_anterior)}</td><td className="py-2.5 px-4 text-right text-gray-400 italic">$ {formatUsd(tasaBCV.dolar > 0 ? balance.saldo_anterior / tasaBCV.dolar : 0)}</td></tr> : null}
                    {balance.cobranza_mes ? <tr><td className="py-2.5 px-4 pl-4 text-gray-700">COBRANZA DEL MES</td><td className="py-2.5 px-4 text-right text-green-600 font-medium">+{formatBs(balance.cobranza_mes)}</td><td className="py-2.5 px-4 text-right text-green-500 italic">$ {formatUsd(tasaBCV.dolar > 0 ? balance.cobranza_mes / tasaBCV.dolar : 0)}</td></tr> : null}
                    {balance.gastos_facturados ? <tr><td className="py-2.5 px-4 pl-4 text-gray-700">GASTOS FACTURADOS EN EL MES</td><td className="py-2.5 px-4 text-right text-red-600 font-medium">{formatBs(balance.gastos_facturados)}</td><td className="py-2.5 px-4 text-right text-red-500 italic">$ {formatUsd(tasaBCV.dolar > 0 ? balance.gastos_facturados / tasaBCV.dolar : 0)}</td></tr> : null}
                    <tr className="bg-gray-100 font-bold"><td className="py-3 px-4 text-blue-700">SALDO ACTUAL DISPONIBLE EN CAJA</td><td className="py-3 px-4 text-right text-blue-700 font-extrabold">{formatBs(balance.saldo_disponible)}</td><td className="py-3 px-4 text-right text-blue-600 font-extrabold">$ {formatUsd(tasaBCV.dolar > 0 ? balance.saldo_disponible / tasaBCV.dolar : 0)}</td></tr>
                    
                    <tr className="bg-orange-50 font-bold"><td className="py-2.5 px-4 text-orange-800" colSpan={3}>CUENTAS POR COBRAR</td></tr>
                    {balance.recibos_mes ? <tr><td className="py-2.5 px-4 pl-4 text-gray-700">RECIBOS DE CONDOMINIOS DEL MES</td><td className="py-2.5 px-4 text-right text-gray-500">{formatBs(balance.recibos_mes)}</td><td className="py-2.5 px-4 text-right text-gray-400 italic">$ {formatUsd(tasaBCV.dolar > 0 ? balance.recibos_mes / tasaBCV.dolar : 0)}</td></tr> : null}
                    <tr className="bg-gray-100 font-bold"><td className="py-3 px-4 text-orange-700">TOTAL CONDOMINIOS POR COBRAR</td><td className="py-3 px-4 text-right text-orange-700 font-extrabold">{formatBs(balance.total_por_cobrar)}</td><td className="py-3 px-4 text-right text-orange-600 font-extrabold">$ {formatUsd(tasaBCV.dolar > 0 ? balance.total_por_cobrar / tasaBCV.dolar : 0)}</td></tr>
                    
                    <tr className="bg-purple-50 font-bold"><td className="py-3 px-4 text-purple-800">CAPITAL TOTAL (CAJA + CONDOMINIOS)</td><td className="py-3 px-4 text-right text-purple-800 font-black">{formatBs(Number(balance.saldo_disponible || 0) + Number(balance.total_por_cobrar || 0))}</td><td className="py-3 px-4 text-right text-purple-700 font-black">$ {formatUsd(tasaBCV.dolar > 0 ? (Number(balance.saldo_disponible || 0) + Number(balance.total_por_cobrar || 0)) / tasaBCV.dolar : 0)}</td></tr>
                    
                    <tr className="bg-emerald-50 font-bold"><td className="py-2.5 px-4 text-emerald-800" colSpan={3}>FONDOS DE RESERVA</td></tr>
                    {balance.fondo_reserva ? <tr><td className="py-2 px-4 pl-4 text-gray-600">FONDO DE RESERVA</td><td className="py-2 px-4 text-right font-medium text-emerald-700">{formatBs(balance.fondo_reserva)}</td><td className="py-2 px-4 text-right text-emerald-600 italic font-medium">$ {formatUsd(tasaBCV.dolar > 0 ? balance.fondo_reserva / tasaBCV.dolar : 0)}</td></tr> : null}
                    {balance.fondo_prestaciones ? <tr><td className="py-2 px-4 pl-4 text-gray-600">FONDO PRESTACIONES SOCIALES</td><td className="py-2 px-4 text-right font-medium text-emerald-700">{formatBs(balance.fondo_prestaciones)}</td><td className="py-2 px-4 text-right text-emerald-600 italic font-medium">$ {formatUsd(tasaBCV.dolar > 0 ? balance.fondo_prestaciones / tasaBCV.dolar : 0)}</td></tr> : null}
                    {balance.fondo_trabajos_varios ? <tr><td className="py-2 px-4 pl-4 text-gray-600">FONDO TRABAJOS VARIOS</td><td className="py-2 px-4 text-right font-medium text-emerald-700">{formatBs(balance.fondo_trabajos_varios)}</td><td className="py-2 px-4 text-right text-emerald-600 italic font-medium">$ {formatUsd(tasaBCV.dolar > 0 ? balance.fondo_trabajos_varios / tasaBCV.dolar : 0)}</td></tr> : null}
                    {balance.fondo_intereses ? <tr><td className="py-2 px-4 pl-4 text-gray-600">FONDO INTERESES MORATORIOS</td><td className="py-2 px-4 text-right font-medium text-emerald-700">{formatBs(balance.fondo_intereses)}</td><td className="py-2 px-4 text-right text-emerald-600 italic font-medium">$ {formatUsd(tasaBCV.dolar > 0 ? balance.fondo_intereses / tasaBCV.dolar : 0)}</td></tr> : null}
                    {balance.fondo_diferencial_cambiario ? <tr><td className="py-2 px-4 pl-4 text-gray-600">FONDO DIFERENCIAL CAMBIARIO</td><td className="py-2 px-4 text-right font-medium text-emerald-700">{formatBs(balance.fondo_diferencial_cambiario)}</td><td className="py-2 px-4 text-right text-emerald-600 italic font-medium">$ {formatUsd(tasaBCV.dolar > 0 ? balance.fondo_diferencial_cambiario / tasaBCV.dolar : 0)}</td></tr> : null}
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
             {/* Tarjetas de Métricas USD */}
             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
               <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                 <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Disponible en Caja</div>
                 <div className="text-lg font-black text-blue-600">$ {formatUsd(balance?.saldo_disponible_usd || 0)}</div>
                 <div className="text-[9px] text-gray-400 font-bold uppercase">Bs. {formatBs(balance?.saldo_disponible)}</div>
               </div>
               <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                 <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Cuentas por Cobrar</div>
                 <div className="text-lg font-black text-orange-600">$ {formatUsd(balance?.total_por_cobrar_usd || 0)}</div>
                 <div className="text-[9px] text-gray-400 font-bold uppercase">Bs. {formatBs(balance?.total_por_cobrar)}</div>
               </div>
               <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                 <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Fondo de Reserva</div>
                 <div className="text-lg font-black text-emerald-600">$ {formatUsd(balance?.fondo_reserva_usd || 0)}</div>
                 <div className="text-[9px] text-gray-400 font-bold uppercase">Bs. {formatBs(balance?.fondo_reserva)}</div>
               </div>
               <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                 <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Int. Moratorios</div>
                 <div className="text-lg font-black text-pink-600">$ {formatUsd(balance?.fondo_intereses_usd || 0)}</div>
                 <div className="text-[9px] text-gray-400 font-bold uppercase">Bs. {formatBs(balance?.fondo_intereses)}</div>
               </div>
               <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
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
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Flujo de Caja Diario (Bs.)</h2>
              {loadingKpis ? (
                <p className="text-gray-500 text-center py-8">Cargando...</p>
              ) : kpisData.cashFlow?.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={kpisData.cashFlow} margin={{ top: 10, right: 40, left: 10, bottom: 20 }}>
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
                      label={{ value: "Ingresos (Bs)", angle: -90, position: "insideLeft", fontSize: 10 }}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      tick={{ fontSize: 9 }} 
                      label={{ value: "Egresos (Bs)", angle: 90, position: "insideRight", fontSize: 10 }}
                    />
                    <Tooltip 
                      formatter={(value: any, name: any) => [`Bs. ${formatBs(value as number)}`, name]}
                      contentStyle={{ fontSize: "11px", borderRadius: "8px" }}
                    />
                    <Legend verticalAlign="top" wrapperStyle={{ fontSize: "11px", paddingBottom: "10px" }} />
                    <Bar yAxisId="left" dataKey="ingresos" fill="#10b981" name="Ingresos (Bs.)" radius={[2, 2, 0, 0]} barSize={15} />
                    <Line yAxisId="right" type="monotone" dataKey="egresos" stroke="#ef4444" name="Egresos (Bs.)" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-center py-8">No hay datos de flujo de caja para este periodo</p>
              )}
              <p className="text-[10px] text-gray-400 mt-2 text-center uppercase font-bold">Comparativa diaria de ingresos (barras verdes, eje izq) vs egresos (línea roja, eje der)</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
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
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Evolución Fondos de Reserva (USD)</h2>
                {loadingKpis ? (
                  <p className="text-gray-500 text-center py-8">Cargando...</p>
                ) : kpisData.balances?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={kpisData.balances} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} tickFormatter={(v: any) => `$${v.toFixed(0)}`} />
                      <Tooltip formatter={(value: any) => [`$${formatUsd(value as number)}`, "Monto"]} />
                      <Legend verticalAlign="top" height={36} />
                      <Line type="monotone" dataKey="fondo_reserva_usd" stroke="#059669" name="Fondo Reserva ($)" strokeWidth={2} />
                      <Line type="monotone" dataKey="fondo_intereses_usd" stroke="#d97706" name="Intereses Morat. ($)" strokeWidth={2} />
                      <Line type="monotone" dataKey="fondo_diferencial_cambiario_usd" stroke="#2563eb" name="Dif. Cambiario ($)" strokeWidth={2} />
                    </LineChart>
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
                      <YAxis tick={{ fontSize: 9 }} tickFormatter={(v: any) => `$${v.toFixed(0)}`} />
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
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Evoluci&oacute;n Fondo de Reserva (USD)</h2>
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
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Total Cuentas por Cobrar (USD)</h2>
                {loadingKpis ? (
                  <p className="text-gray-500 text-center py-8">Cargando...</p>
                ) : kpisData.balances?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={kpisData.balances} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} tickFormatter={(v: any) => `$${v.toFixed(0)}`} />
                      <Tooltip formatter={(value: any) => [`$${formatUsd(value as number)}`, "Por Cobrar"]} />
                      <Bar dataKey="total_por_cobrar_usd" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Por Cobrar ($)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No hay datos</p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Evoluci&oacute;n Fondo Intereses Moratorios (USD)</h2>
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

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Evoluci&oacute;n Diferencial Cambiario (USD)</h2>
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
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Monto Total del Recibo de Condominio (USD)</h2>
              {loadingKpis ? (
                <p className="text-gray-500 text-center py-8">Cargando...</p>
              ) : kpisData.balances?.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={kpisData.balances} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} tickFormatter={(v: any) => `$${v.toFixed(0)}`} />
                    <Tooltip formatter={(value: any) => [`$${formatUsd(value as number)}`, "Recibos del Mes"]} />
                    <Area type="monotone" dataKey="recibos_mes_usd" stroke="#10b981" fill="#d1fae5" name="Recibos Emitidos ($)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-center py-8">No hay datos</p>
              )}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Evoluci&oacute;n Mensual de Gesti&oacute;n</h2>
              {loadingKpis ? (
                <p className="text-gray-500 text-center py-8">Cargando...</p>
              ) : kpisData.balances?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="py-3 px-4 font-bold text-gray-600">Mes de Cierre</th>
                        <th className="py-3 px-4 font-bold text-gray-600 text-right">Efectividad Recaudaci&oacute;n</th>
                        <th className="py-3 px-4 font-bold text-gray-600 text-right">Índice Morosidad</th>
                        <th className="py-3 px-4 font-bold text-gray-600 text-right">Cobertura de Gastos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kpisData.balances.map((b: any, idx: number) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-gray-800 font-medium">{b.mes_normalizado}</td>
                          <td className="py-3 px-4 text-right text-blue-600 font-bold">{formatCurrency(b.efectividad_recaudacion, 2)}%</td>
                          <td className="py-3 px-4 text-right text-red-500 font-bold">{formatCurrency(b.indice_morosidad, 2)}%</td>
                          <td className="py-3 px-4 text-right text-emerald-600 font-bold">{formatCurrency(b.cobertura_gastos, 2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No hay datos suficientes para calcular la evoluci&oacute;n de gesti&oacute;n.</p>
              )}
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
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "informes" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumen por Fecha</h2>
              <div className="flex gap-4 items-end mb-6">
                <div className="flex-1 max-w-xs">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Seleccionar Fecha</label>
                  <input 
                    type="date" 
                    value={informeFecha} 
                    onChange={(e) => setInformeFecha(e.target.value)} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  />
                </div>
                <button 
                  onClick={loadInforme} 
                  disabled={loadingInforme || !informeFecha}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  {loadingInforme ? "Cargando..." : "Consultar"}
                </button>
              </div>

              {loadingInforme ? (
                <p className="text-gray-500 text-center py-8">Cargando datos...</p>
              ) : (informeData === "not_found" || !informeData) ? (
                <div className="text-center py-8 border border-dashed rounded-lg bg-gray-50">
                  <p className="text-gray-500 font-medium">No hay datos registrados en Control Diario para esta fecha.</p>
                  <p className="text-[10px] text-gray-400 mt-1">Los datos se generan autom&aacute;ticamente al realizar una sincronizaci&oacute;n exitosa.</p>
                </div>
              ) : (
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-inner">
                  <h3 className="font-bold text-gray-800 mb-4 border-b pb-2 flex justify-between">
                    <span>Resumen Financiero al: {informeFecha.split('-').reverse().join('/')}</span>
                    <span className="text-xs text-blue-600 font-black uppercase">Fotograf&iacute;a de Sincronizaci&oacute;n</span>
                  </h3>
                  <div className="grid md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    <div className="flex justify-between border-b border-gray-200 pb-1">
                      <span className="text-gray-600">Saldo Inicial Bs:</span>
                      <span className="font-medium">{formatBs(informeData.saldo_inicial_bs)}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-1">
                      <span className="text-gray-600">Fondo Reserva Bs:</span>
                      <span className="font-medium text-purple-700">{formatBs(informeData.fondo_reserva_bs)}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-1">
                      <span className="text-gray-600">Ingresos Bs:</span>
                      <span className="font-medium text-green-600">+{formatBs(informeData.ingresos_bs)}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-1">
                      <span className="text-gray-600">Fondo Dif. Camb. Bs:</span>
                      <span className="font-medium text-blue-600">{formatBs(informeData.fondo_dif_camb_bs)}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-1">
                      <span className="text-gray-600">Egresos Bs:</span>
                      <span className="font-medium text-red-600">-{formatBs(informeData.egresos_bs)}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-1">
                      <span className="text-gray-600">Fondo Int. Mor. Bs:</span>
                      <span className="font-medium text-pink-600">{formatBs(informeData.fondo_int_mor_bs)}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-1">
                      <span className="text-gray-600">Ajustes Bs:</span>
                      <span className="font-medium">{formatBs(informeData.ajustes_bs)}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-1">
                      <span className="font-bold text-gray-800">Total Fondos Bs:</span>
                      <span className="font-bold text-indigo-700">{formatBs(informeData.total_fondos_bs)}</span>
                    </div>
                    <div className="flex justify-between bg-blue-50 p-2 rounded-md mt-2">
                      <span className="font-bold text-blue-800">Saldo Final Bs (Operativo):</span>
                      <span className="font-bold text-blue-800">{formatBs(informeData.saldo_final_bs)}</span>
                    </div>
                    <div className="flex justify-between bg-emerald-50 p-2 rounded-md mt-2">
                      <span className="font-bold text-emerald-800">Disponibilidad Total Bs:</span>
                      <span className="font-bold text-emerald-800">{formatBs(informeData.disponibilidad_total_bs)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-2 col-span-full">
                      <span>Tasa Cambio Aplicada: {informeData.tasa_cambio} Bs/USD</span>
                      <span>Recibos Pendientes: {informeData.recibos_pendientes}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Gesti&oacute;n de Gastos Recurrentes</h2>
              
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Lista de Gestión */}
                <div className="lg:col-span-1 space-y-4">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider border-b pb-2">Conceptos Detectados</h3>
                  <div className="overflow-y-auto max-h-[500px] pr-2 space-y-2">
                    {gastosRecurrentes.map((g: any, i: number) => (
                      <div key={i} className={`p-3 rounded-lg border transition-all ${g.activo ? 'bg-white border-blue-100 shadow-sm' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-mono font-black text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{g.codigo}</span>
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
                    <button onClick={loadEvolucionRecurrentes} className="text-xs text-blue-600 font-bold hover:underline">Refrescar Gr&aacute;ficos</button>
                  </div>
                  
                  {evolucionRecurrentes.length === 0 ? (
                    <div className="bg-gray-50 rounded-xl p-8 text-center border-2 border-dashed border-gray-200">
                      <p className="text-sm text-gray-500 font-medium">No hay datos históricos para los conceptos marcados como activos.</p>
                      <p className="text-[10px] text-gray-400 mt-1 italic">Marca los gastos que quieres monitorear en la lista de la izquierda.</p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="bg-gray-50 p-4 rounded-xl">
                        <h4 className="text-xs font-black text-gray-500 uppercase mb-4 text-center">Inversi&oacute;n Mensual por Categor&iacute;a (Bs.)</h4>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={evolucionRecurrentes} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="mes" tick={{fontSize: 10}} />
                            <YAxis tick={{fontSize: 10}} />
                            <Tooltip formatter={(value: any) => `Bs. ${formatBs(value as number)}`} />
                            <Legend wrapperStyle={{fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase'}} />
                            <Bar dataKey="categorias.servicios" name="Servicios" stackId="a" fill="#3b82f6" />
                            <Bar dataKey="categorias.seguridad" name="Seguridad" stackId="a" fill="#10b981" />
                            <Bar dataKey="categorias.mantenimiento" name="Mantenimiento" stackId="a" fill="#f59e0b" />
                            <Bar dataKey="categorias.otros" name="Otros" stackId="a" fill="#94a3b8" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-xl">
                        <h4 className="text-xs font-black text-gray-500 uppercase mb-4 text-center">Tendencia de Gasto Recurrente Total (Bs.)</h4>
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={evolucionRecurrentes} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="mes" tick={{fontSize: 10}} />
                            <YAxis tick={{fontSize: 10}} />
                            <Tooltip formatter={(value: any) => `Bs. ${formatBs(value as number)}`} />
                            <Line type="monotone" dataKey="total" stroke="#ef4444" strokeWidth={3} name="Total Recurrente" dot={{ r: 4 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

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
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">Unidades (Apartamentos)</label>
                  <input 
                    type="number" 
                    value={editConfig.unidades} 
                    onChange={(e) => setEditConfig({ ...editConfig, unidades: parseInt(e.target.value) || 0 })} 
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-bold ${showUnitsAlert ? 'border-red-500 bg-red-50 animate-pulse' : 'border-gray-300 bg-white'}`}
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
                      onChange={(e) => updateAdminAndUrls(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                    >                      <option value="La Ideal C.A.">La Ideal C.A.</option>
                      <option value="Admastridcarrasquel">Administradora AC. Condominios, C.A.</option>
                      <option value="Administradora Elite">Administradora Elite</option>
                      <option value="Intercanar">Intercanariven</option>
                      <option value="Admactual">Administradora Actual, C.A.</option>
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
                        <input type="text" value={editConfig.url_login} onChange={(e) => setEditConfig({ ...editConfig, url_login: e.target.value })} className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs bg-gray-50" />
                        {editConfig.url_login && (
                          <a href={editConfig.url_login} target="_blank" rel="noopener noreferrer" className="px-2 py-1.5 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200">Ver</a>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">URL Recibos (Pendientes)</label>
                      <div className="flex gap-2">
                        <input type="text" value={editConfig.url_recibos} onChange={(e) => setEditConfig({ ...editConfig, url_recibos: e.target.value })} className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs bg-gray-50" />
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
                          placeholder="https://admlaideal.com.ve/condlin.php?r=4"
                          onChange={(e) => setEditConfig({ ...editConfig, url_recibo_mes: e.target.value })}
                          className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs bg-gray-50"
                        />
                        <a href={editConfig.url_recibo_mes || "https://admlaideal.com.ve/condlin.php?r=4"} target="_blank" rel="noopener noreferrer" className="px-2 py-1.5 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200">Ver</a>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">URL Egresos</label>
                      <div className="flex gap-2">
                        <input type="text" value={editConfig.url_egresos} onChange={(e) => setEditConfig({ ...editConfig, url_egresos: e.target.value })} className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs bg-gray-50" />
                        {editConfig.url_egresos && (
                          <a href={editConfig.url_egresos} target="_blank" rel="noopener noreferrer" className="px-2 py-1.5 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200">Ver</a>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">URL Gastos</label>
                      <div className="flex gap-2">
                        <input type="text" value={editConfig.url_gastos} onChange={(e) => setEditConfig({ ...editConfig, url_gastos: e.target.value })} className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs bg-gray-50" />
                        {editConfig.url_gastos && (
                          <a href={editConfig.url_gastos} target="_blank" rel="noopener noreferrer" className="px-2 py-1.5 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200">Ver</a>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">URL Balance</label>
                      <div className="flex gap-2">
                        <input type="text" value={editConfig.url_balance} onChange={(e) => setEditConfig({ ...editConfig, url_balance: e.target.value })} className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs bg-gray-50" />
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
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editConfig.sync_recibos} onChange={(e) => setEditConfig({ ...editConfig, sync_recibos: e.target.checked })} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                      <span className="text-sm text-gray-700">Recibos</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editConfig.sync_egresos} onChange={(e) => setEditConfig({ ...editConfig, sync_egresos: e.target.checked })} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                      <span className="text-sm text-gray-700">Egresos</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editConfig.sync_gastos} onChange={(e) => setEditConfig({ ...editConfig, sync_gastos: e.target.checked })} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                      <span className="text-sm text-gray-700">Gastos</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editConfig.sync_alicuotas} onChange={(e) => setEditConfig({ ...editConfig, sync_alicuotas: e.target.checked })} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                      <span className="text-sm text-gray-700">Alicuotas</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editConfig.sync_balance} onChange={(e) => setEditConfig({ ...editConfig, sync_balance: e.target.checked })} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
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
                      onChange={(e) => setEditConfig({ ...editConfig, email_junta: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                  <button onClick={handleSaveConfig} disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 uppercase text-xs">
                    {saving ? "Guardando..." : "Guardar Configuración"}
                  </button>
                  <button onClick={handleTestConnection} disabled={saving} className="px-6 py-2.5 bg-white text-blue-600 border border-blue-600 rounded-lg font-bold hover:bg-blue-50 transition-colors uppercase text-xs shadow-sm">
                    Probar Conexión
                  </button>
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
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editConfig.sync_recibos} onChange={(e) => setEditConfig({ ...editConfig, sync_recibos: e.target.checked })} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                      <span className="text-xs font-bold text-gray-700">Recibos</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editConfig.sync_egresos} onChange={(e) => setEditConfig({ ...editConfig, sync_egresos: e.target.checked })} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                      <span className="text-xs font-bold text-gray-700">Egresos</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editConfig.sync_gastos} onChange={(e) => setEditConfig({ ...editConfig, sync_gastos: e.target.checked })} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                      <span className="text-xs font-bold text-gray-700">Gastos</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editConfig.sync_balance} onChange={(e) => setEditConfig({ ...editConfig, sync_balance: e.target.checked })} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                      <span className="text-xs font-bold text-gray-700">Balance</span>
                    </label>
                  </div>
               </div>

               <div className="flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Seleccionar Mes/Año</label>
                    <div className="flex gap-2">
                      <select 
                        value={syncMes.split('-')[0]} 
                        onChange={(e) => {
                          const year = syncMes.split('-')[1] || new Date().getFullYear().toString();
                          setSyncMes(`${e.target.value}-${year}`);
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                      >
                        <option value="">Mes</option>
                        {["01","02","03","04","05","06","07","08","09","10","11","12"].map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <select 
                        value={syncMes.split('-')[1]} 
                        onChange={(e) => {
                          const month = syncMes.split('-')[0] || "01";
                          setSyncMes(`${month}-${e.target.value}`);
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
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
                    <input type="text" value={syncMes} onChange={(e) => setSyncMes(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder="03-2026" />
                  </div>
                  <button onClick={handleSyncMes} disabled={syncingMes || !syncMes} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors uppercase text-xs h-[38px] shadow-sm">
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
              <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Detalle de Datos Sincronizados Off-line</h3>
              {sincronizaciones.filter(s => s.estado === 'completado').length === 0 ? (
                <p className="text-sm text-gray-500 italic">No hay registros detallados de sincronización exitosa.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-2">
                  {sincronizaciones.filter(s => s.estado === 'completado').map((s, idx) => (
                    <div key={idx} className="bg-gray-50 border border-gray-200 p-4 rounded-xl shadow-sm relative overflow-hidden">
                      <div className={`absolute top-0 right-0 px-2 py-0.5 text-[8px] font-black text-white uppercase ${s.tipo === 'sync_historica' ? 'bg-orange-500' : 'bg-green-500'}`}>
                        {s.tipo === 'sync_historica' ? 'Hist&oacute;rica' : 'Diaria'}
                      </div>
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-xs font-black text-indigo-600 uppercase">{s.detalles?.mes || 'Actual'}</div>
                        <div className="text-[9px] text-gray-400 font-bold">{new Date(s.created_at).toLocaleString("es-VE")}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-1 mb-2">
                        <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex justify-between ${s.detalles?.sync_recibos ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-400'}`}>
                          <span>RECIBOS</span>
                          {s.detalles?.sync_recibos && <span className="ml-1 opacity-70">({s.detalles?.stats?.recibos || 0})</span>}
                        </div>
                        <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex justify-between ${s.detalles?.sync_gastos ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-400'}`}>
                          <span>GASTOS</span>
                          {s.detalles?.sync_gastos && <span className="ml-1 opacity-70">({s.detalles?.stats?.gastos || 0})</span>}
                        </div>
                        <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex justify-between ${s.detalles?.sync_egresos ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-400'}`}>
                          <span>EGRESOS</span>
                          {s.detalles?.sync_egresos && <span className="ml-1 opacity-70">({s.detalles?.stats?.egresos || 0})</span>}
                        </div>
                        <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex justify-between ${s.detalles?.sync_balance ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-400'}`}>
                          <span>BALANCE</span>
                          {s.detalles?.sync_balance && <span className="ml-1 opacity-70">OK</span>}
                        </div>
                      </div>
                      {(s.detalles?.stats?.recibo_total > 0 || s.movimientos_nuevos > 0) && (
                        <div className="text-[9px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded mb-1 border border-blue-100">
                          {s.detalles?.stats?.recibo_total > 0 ? `TOTAL RECIBO: Bs. ${formatBs(s.detalles.stats.recibo_total)}` : `REGISTROS: ${s.movimientos_nuevos}`}
                        </div>
                      )}
                      <div className="text-[10px] text-gray-600 line-clamp-1 italic">{s.error}</div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-gray-400 mt-4 uppercase font-bold italic">ESTA LISTA MUESTRA EL DETALLE DE LOS ÚLTIMOS ARCHIVOS Y MÓDULOS DESCARGADOS CON ÉXITO.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
