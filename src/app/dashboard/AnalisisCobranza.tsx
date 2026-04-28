"use client";

import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";

export function AnalisisCobranza({ edificioId }: { edificioId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/analytics/cobranza?edificioId=${edificioId}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Error loading cobranza data:", err);
      } finally {
        setLoading(setLoading(false) as any);
      }
    }
    loadData();
  }, [edificioId]);

  if (loading) return <div className="p-8 text-center animate-pulse text-indigo-600 font-black">Cargando Análisis...</div>;
  if (!data) return <div className="p-8 text-center text-gray-400">No hay datos suficientes para el análisis.</div>;

  // Preparar datos para el gráfico comparativo
  const chartData = data.mesActual.map((d: any, i: number) => ({
    dia: d.dia,
    "Mes Actual": d.pct,
    "Mes Anterior": data.mesAnterior[i]?.pct || 0
  }));

  const predictionDate = () => {
    if (data.stats.diasPara50Actual) {
      const today = new Date();
      const targetDate = new Date();
      // Estimación simple: si llegó al 50% en X días, llegará al 100% en 2X días aprox.
      // Pero mejor usar la velocidad de los últimos 7 días si la tuviéramos.
      // Por ahora una fecha estimada basada en la velocidad actual.
      const daysTo100 = data.stats.diasPara50Actual * 2;
      targetDate.setDate(1);
      targetDate.setDate(daysTo100);
      return targetDate.toLocaleDateString('es-VE', { day: 'numeric', month: 'long' });
    }
    return "Pendiente de datos";
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="relative border-b pb-8 border-gray-100">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 border border-indigo-100">
          📈 Curva de Recaudación
        </div>
        <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-4">
          Análisis de <span className="text-indigo-600">Cobranza</span>
        </h2>
        <p className="text-gray-500 max-w-2xl font-medium">
          Compare la velocidad de pago de este mes contra el anterior y visualice la proyección de recaudación.
        </p>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-indigo-100/20">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Curva Comparativa (%)</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
                <span className="text-[10px] font-bold text-gray-500 uppercase">Actual</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                <span className="text-[10px] font-bold text-gray-500 uppercase">Anterior</span>
              </div>
            </div>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} unit="%" />
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '15px' }}
                  itemStyle={{ fontSize: '12px', fontWeight: '900', textTransform: 'uppercase' }}
                />
                <Area type="monotone" dataKey="Mes Actual" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorActual)" />
                <Area type="monotone" dataKey="Mes Anterior" stroke="#cbd5e1" strokeWidth={2} fillOpacity={0} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-[2rem] text-white shadow-xl shadow-indigo-200">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Predicción de Saldo</div>
            <div className="text-3xl font-black tracking-tighter leading-tight mb-4">
              Estimamos recaudar el <span className="text-amber-300 underline decoration-4 underline-offset-4">100%</span> para el:
            </div>
            <div className="text-4xl font-black mb-6">{predictionDate()}</div>
            <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 text-xs font-medium leading-relaxed">
              Basado en que se alcanzó el 50% de recaudación en el día <span className="font-black text-amber-300">{data.stats.diasPara50Actual || "-"}</span>.
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b pb-4">Velocidad de Cobro</h3>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-600 uppercase">Día 50% (Mes Ant.)</span>
              <span className="text-xl font-black text-gray-400">{data.stats.diasPara50Anterior || "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-600 uppercase">Día 50% (Mes Act.)</span>
              <span className={`text-xl font-black ${data.stats.diasPara50Actual <= data.stats.diasPara50Anterior ? 'text-emerald-500' : 'text-rose-500'}`}>
                {data.stats.diasPara50Actual || "-"}
              </span>
            </div>
            <div className={`text-[10px] font-black p-3 rounded-xl text-center uppercase tracking-tighter ${data.stats.diasPara50Actual <= data.stats.diasPara50Anterior ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {data.stats.diasPara50Actual <= data.stats.diasPara50Anterior ? "🚀 Cobrando más rápido" : "⚠️ Alerta: Cobro más lento"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
