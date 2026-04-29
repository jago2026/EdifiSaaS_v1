"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

import { formatNumber, formatCurrency, formatBs, formatUsd, formatDate } from "@/lib/formatters";

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
        setLoading(false);
      }
    }
    loadData();
  }, [edificioId]);

  if (loading) return <div className="p-8 text-center animate-pulse text-indigo-600 font-black">Cargando Análisis...</div>;
  if (!data) return <div className="p-8 text-center text-gray-400">No hay datos suficientes para el análisis.</div>;

  // Obtener el día actual en Venezuela (excluyendo el día en curso)
  const caracasDay = Number(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Caracas',
    day: '2-digit'
  }).format(new Date()));

  // Preparar datos para el gráfico comparativo (siempre 31 días)
  // EXCLUIMOS el día en curso: solo mostramos hasta el día ANTERIOR al actual
  const chartData = Array.from({ length: 31 }, (_, i) => {
    const dia = i + 1;
    const actual = data.mesActual.find((d: any) => d.dia === dia);
    const anterior = data.mesAnterior.find((d: any) => d.dia === dia);

    // El día actual NO se grafica (dia <= caracasDay - 1 significa excluir el día en curso)
    const diaEsValido = dia < caracasDay;

    const item: any = {
      dia,
      "Mes Anterior": anterior ? anterior.pct : 0
    };

    // Solo agregar "Mes Actual" si es un día válido Y tiene datos
    if (diaEsValido && actual && actual.pct !== null) {
      item["Mes Actual"] = actual.pct;
    }

    return item;
  });

  // Para el tooltip, solo mostrar datos válidos
  const tooltipContent = (props: any) => {
    const { active, payload, label } = props;
    if (active && payload && payload.length) {
      const diaActual = payload.find((p: any) => p.dataKey === "Mes Actual");
      // Si no hay dato de mes actual, no mostrar nada para mantener limpio
      return (
        <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100">
          <p className="text-xs font-bold text-gray-500 mb-1">Día {label}</p>
          {payload.map((entry: any, index: number) => (
            entry.value !== undefined && (
              <p key={index} className="text-sm font-black" style={{ color: entry.color }}>
                {entry.name}: {entry.value}%
              </p>
            )
          ))}
        </div>
      );
    }
    return null;
  };

  const predictionDate = () => {
    if (data.stats.diasPara50Actual) {
      const targetDate = new Date();
      // Si llegamos al 50% en X días, estimamos el 100% en X*2 días
      // Pero limitamos a que no sea una fecha absurdamente lejana o pasada
      const daysTo100 = Math.min(60, data.stats.diasPara50Actual * 2);
      targetDate.setDate(1);
      targetDate.setDate(daysTo100);
      
      // Si la fecha estimada ya pasó, simplemente decimos "En curso" o "Finalizando"
      if (targetDate < new Date()) {
        return "Finalizando mes";
      }
      return formatDate(targetDate);
    }
    return "Pendiente de más datos";
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
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-8">Curva Comparativa (%)</h3>
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
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} unit="%" domain={[0, 100]} />
                <Tooltip
                  content={tooltipContent}
                  cursor={{fill: '#f8fafc'}}
                />
                <Bar dataKey="Mes Anterior" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="Mes Actual" radius={[4, 4, 0, 0]} barSize={12}>
                  {chartData.map((entry, index) => {
                    // Solo mostrar color si hay dato válido
                    const hasData = entry["Mes Actual"] !== undefined;
                    return <Cell key={`cell-${index}`} fill={hasData ? "#4f46e5" : "transparent"} />;
                  })}
                </Bar>
              </BarChart>
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
