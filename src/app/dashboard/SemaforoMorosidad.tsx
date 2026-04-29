"use client";

import { useState, useEffect } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
  LineChart, Line, AreaChart, Area 
} from "recharts";

import { formatNumber, formatCurrency, formatBs, formatUsd } from "@/lib/formatters";

export function SemaforoMorosidad({ edificioId }: { edificioId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"monto" | "montoUsd" | "porcentaje">("montoUsd");

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/analytics/morosidad?edificioId=${edificioId}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Error loading morosidad data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [edificioId]);

  if (loading) return <div className="p-8 text-center animate-pulse text-indigo-600 font-black">Cargando Semáforo...</div>;
  if (!data || !data.current) return <div className="p-8 text-center text-gray-400">No hay datos suficientes para el análisis de morosidad.</div>;

  const getChartLabel = () => {
    if (viewMode === "monto") return "Bolívares (Bs.)";
    if (viewMode === "montoUsd") return "Dólares (USD)";
    return "Porcentaje (%)";
  };

  const chartData = [
    { name: "1 Recibo", value: data.current.g1.aptos, monto: data.current.g1.monto, color: "#10b981", key: "g1" },
    { name: "2-3 Recibos", value: data.current.g2_3.aptos, monto: data.current.g2_3.monto, color: "#84cc16", key: "g2_3" },
    { name: "4-6 Recibos", value: data.current.g4_6.aptos, monto: data.current.g4_6.monto, color: "#f59e0b", key: "g4_6" },
    { name: "7-11 Recibos", value: data.current.g7_11.aptos, monto: data.current.g7_11.monto, color: "#ef4444", key: "g7_11" },
    { name: "12+ Recibos", value: data.current.g12_mas.aptos, monto: data.current.g12_mas.monto, color: "#7f1d1d", key: "g12_mas" },
  ];

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom duration-700">
      <header className="relative border-b pb-8 border-gray-100">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 border border-rose-100">
          🚦 Semáforo de Riesgo
        </div>
        <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-4">
          Antigüedad de <span className="text-rose-600">Deuda</span>
        </h2>
        <p className="text-gray-500 max-w-2xl font-medium">
          Identifique la concentración de deuda por antigüedad y el impacto financiero de la morosidad crónica.
        </p>
      </header>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-100/50">
          <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-8">Concentración de Deudores</h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#64748b'}} width={100} />
                <Tooltip 
                   cursor={{fill: '#f8fafc'}}
                   contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '15px' }}
                   formatter={(value: any, name: any, props: any) => [value, 'Apartamentos']}
                />
                <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-gray-400 mt-4 text-center uppercase font-bold tracking-widest">Número de apartamentos por grupo de recibos</p>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-900 p-8 rounded-[2rem] text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 text-8xl transition-transform group-hover:scale-110 duration-500">📉</div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400 mb-2">Pérdida por Devaluación</div>
            <h3 className="text-3xl font-black tracking-tighter leading-tight mb-4">Costo de la <br/>Morosidad Acumulada</h3>
            <div className="text-5xl font-black text-rose-500 mb-6">
              $ {formatCurrency(Object.values(data.costoMorosidad as Record<string, number>).reduce((a, b) => a + b, 0))}
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Este es el monto estimado que el edificio ha perdido en <span className="text-white font-bold">poder adquisitivo</span> debido a la inflación sobre las deudas no pagadas a tiempo.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
             {chartData.map((g, i) => (
               <div key={i} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">{g.name}</div>
                  <div className="text-lg font-black text-gray-900 mb-1">Bs. {formatBs(g.monto)}</div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: g.color}}></div>
                    <span className="text-[10px] font-bold text-gray-500">{g.value} Aptos</span>
                  </div>
                  {data.desplazamiento && data.desplazamiento[g.key] !== undefined && (
                    <div className={`mt-3 text-[9px] font-black uppercase p-1.5 rounded-lg text-center ${data.desplazamiento[g.key] <= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {data.desplazamiento[g.key] > 0 ? `+${data.desplazamiento[g.key]} Nuevos` : `${data.desplazamiento[g.key]} Reducción`}
                    </div>
                  )}
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* Gráfico de Evolución de Morosidad */}
      <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-100/50">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Evolución de la Morosidad</h3>
            <p className="text-sm text-gray-500 font-medium">Tendencia del monto pendiente ({getChartLabel()})</p>
          </div>
          <div className="flex bg-gray-100 p-1 rounded-xl self-start">
            <button 
              onClick={() => setViewMode("monto")}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === "monto" ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Bs.
            </button>
            <button 
              onClick={() => setViewMode("montoUsd")}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === "montoUsd" ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              USD
            </button>
            <button 
              onClick={() => setViewMode("porcentaje")}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === "porcentaje" ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              %
            </button>
          </div>
        </header>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.evolution}>
              <defs>
                <linearGradient id="colorMonto" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="fecha" 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
                tickFormatter={(str) => {
                  // Forzar interpretación UTC para evitar saltos de día
                  const d = new Date(str + "T00:00:00Z");
                  return d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric', timeZone: 'UTC' });
                }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
                tickFormatter={(val) => {
                  if (viewMode === "porcentaje") return `${val}%`;
                  if (viewMode === "montoUsd") return `$${formatNumber(val)}`;
                  return `Bs.${formatNumber(val/1000)}k`;
                }}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '15px' }}
                formatter={(value: any) => {
                  if (viewMode === "porcentaje") return [`${formatNumber(value)}%`, 'Porcentaje'];
                  if (viewMode === "montoUsd") return [formatUsd(value), 'Monto USD'];
                  return [`Bs. ${formatBs(value)}`, 'Monto Bs.'];
                }}
              />
              <Area 
                type="monotone" 
                dataKey={viewMode} 
                stroke="#ef4444" 
                strokeWidth={4}
                fillOpacity={1} 
                fill="url(#colorMonto)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
