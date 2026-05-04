"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { formatNumber, formatBs, formatUsd, formatDate } from "@/lib/formatters";

interface ResumenTabProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  building: any;
  user: any;
  editConfig: any;
  balance: any;
  tasaBCV: { dolar: number };
  ingresosSummary: { monto: number; cantidad: number };
  gastosSummary: { monto: number; cantidad: number };
  egresosSummary: { monto: number; cantidad: number };
  recibos: any[];
  movimientosManual: any[];
  syncMessage: string | null;
  hasIntegration: boolean;
  loadingMovimientosDia: boolean;
  movimientosDia: any[];
}

export function ResumenTab({
  activeTab,
  setActiveTab,
  building,
  user,
  editConfig,
  balance,
  tasaBCV,
  ingresosSummary,
  gastosSummary,
  egresosSummary,
  recibos,
  movimientosManual,
  syncMessage,
  hasIntegration,
  loadingMovimientosDia,
  movimientosDia
}: ResumenTabProps) {
  if (activeTab !== "resumen") return null;

  const currentMonth = new Date().toISOString().substring(0, 7);
  const isBalanceCurrent = balance?.mes === currentMonth;

  return (
    <div className="space-y-6">
      {/* Módulos Superiores (Resumen USD / Balance) */}
      {(editConfig.dashboard_config?.usd !== false || user?.id === "superuser-id") && (
        <div className="grid md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50 border border-gray-100 group" onClick={() => setActiveTab("balance")} title="Saldo actual según el portal de la administradora. Puedes hacer clic para ver más detalles.">
            <div className="text-sm text-gray-500 mb-1">Saldo Disponible seg&uacute;n Web Admin</div>
            <div className="text-2xl font-bold text-blue-600">Bs.{formatBs(balance?.saldo_disponible || 0)}</div>
            {tasaBCV.dolar > 0 && <div className="text-sm text-gray-400">$ {formatUsd((balance?.saldo_disponible || 0) / tasaBCV.dolar)}</div>}
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50 border border-gray-100 group" onClick={() => setActiveTab("balance")} title="Total de cobranza recibida en el mes actual. Incluye pagos de apartamentos.">
            <div className="text-sm text-gray-500 mb-1">Cobranza del Mes</div>
            <div className="text-2xl font-bold text-green-600">Bs.{formatBs(ingresosSummary.monto)}</div>
            {tasaBCV.dolar > 0 && <div className="text-sm text-gray-400">$ {formatUsd(ingresosSummary.monto / tasaBCV.dolar)}</div>}
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50 border border-gray-100 group" onClick={() => setActiveTab("gastos")} title="Gastos facturados por la administradora en el mes actual.">
            <div className="text-sm text-gray-500 mb-1">Gastos del Mes</div>
            <div className="text-2xl font-bold text-orange-600">Bs.{formatBs(Math.abs(gastosSummary.monto))}</div>
            {tasaBCV.dolar > 0 && <div className="text-sm text-gray-400">$ {formatUsd(Math.abs(gastosSummary.monto / tasaBCV.dolar))}</div>}
            <div className="text-xs text-gray-400 mt-1">
              {gastosSummary.cantidad} movimiento{gastosSummary.cantidad !== 1 ? "s" : ""}
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50 border border-gray-100 group" onClick={() => setActiveTab("balance")} title="Fondo de reserva acumulado para emergencias y mantenimiento mayor.">
            <div className="text-sm text-gray-500 mb-1">Fondo Reserva</div>
            <div className="text-2xl font-bold text-purple-600">Bs.{formatBs(balance?.fondo_reserva || 0)}</div>
            {tasaBCV.dolar > 0 && <div className="text-sm text-gray-400">$ {formatUsd((balance?.fondo_reserva || 0) / tasaBCV.dolar)}</div>}
          </div>
        </div>
      )}

      {/* Módulos de Gastos y Egresos */}
      {(editConfig.dashboard_config?.cg !== false || user?.id === "superuser-id") && (
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
      )}

      {/* Módulos de Morosidad (Gráficos) */}
      {(editConfig.dashboard_config?.mo !== false || user?.id === "superuser-id") && (
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
      )}

      {/* Módulos de Liquidez (Indicadores) */}
      {(editConfig.dashboard_config?.cf !== false || user?.id === "superuser-id") && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 group" title="Indicadores clave de rendimiento financiero del edificio. Cada indicador muestra la salud financiera del condominio.">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Indicadores Financieros</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg group" title="Indica cuántas veces el saldo disponible puede cubrir los gastos mensuales. Valores superiores a 1 son saludables.">
                <div className="text-[10px] font-bold text-blue-600 uppercase mb-1">Liquidez Inmediata</div>
                <div className="text-xl font-black text-blue-800">
                  {balance?.gastos_facturados && balance.gastos_facturados !== 0 
                    ? formatNumber(balance.saldo_disponible / Math.abs(balance.gastos_facturados), 2) 
                    : "N/A"}
                </div>
                <div className="text-[9px] text-blue-500 leading-tight">Veces que el saldo cubre los gastos del mes</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg group" title="Porcentaje de efectividad en la cobranza del mes actual. Por encima de 80% se considera bueno.">
                <div className="text-[10px] font-bold text-green-600 uppercase mb-1">Índice de Cobranza</div>
                <div className="text-xl font-black text-green-800">
                  {balance?.recibos_mes && balance.recibos_mes !== 0 
                    ? formatNumber((balance.cobranza_mes / balance.recibos_mes) * 100, 1)
                    : "0.0"}%
                </div>
                <div className="text-[9px] text-green-500 leading-tight">Efectividad de recaudación del mes</div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg group" title="Porcentaje de apartamentos que tienen deuda pendiente. Por debajo del 20% es saludable.">
                <div className="text-[10px] font-bold text-red-600 uppercase mb-1">Morosidad Global</div>
                <div className="text-xl font-black text-red-800">
                  {building?.unidades ? formatNumber((recibos.length / building.unidades) * 100, 1) : "0,0"}%
                </div>
                <div className="text-[9px] text-red-500 leading-tight">Aptos con deuda sobre el total</div>
              </div>
              <div className="bg-indigo-50 p-3 rounded-lg group" title="Cantidad promedio de meses de facturación que representan la deuda total. Valores iguales o menores a 3 meses son saludables.">
                <div className="text-[10px] font-bold text-indigo-600 uppercase mb-1">Carga de Deuda</div>
                <div className="text-xl font-black text-indigo-800">
                  {balance?.total_por_cobrar && balance.recibos_mes && balance.recibos_mes !== 0
                    ? formatNumber(balance.total_por_cobrar / balance.recibos_mes, 1)
                    : "0.0"}
                </div>
                <div className="text-[9px] text-indigo-500 leading-tight">Meses de facturación en deuda total</div>
              </div>
            </div>
          </div>
      )}

      {/* Módulo de Historial Sync */}
      {(editConfig.dashboard_config?.hs !== false || user?.id === "superuser-id") && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Movimientos de Hoy ({formatDate(new Date())})</h2>
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
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Cargando movimientos...</p>
            </div>
          ) : movimientosDia.length === 0 ? (
            <p className="text-gray-500 text-center py-8 border border-dashed border-gray-200 rounded-lg">
              No hay movimientos registrados hoy.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Descripción</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">Monto (Bs)</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientosDia.map((mov) => (
                    <tr key={mov.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-sm text-gray-600">{formatDate(mov.fecha)}</td>
                      <td className="py-3 px-4 text-sm text-gray-900 font-medium">{mov.descripcion}</td>
                      <td className={`py-3 px-4 text-sm text-right font-bold ${mov.tipo === "ingreso" || mov.tipo === "recibo" ? "text-green-600" : "text-red-600"}`}>
                        {mov.tipo === "ingreso" || mov.tipo === "recibo" ? "+" : "-"} {formatBs(mov.monto)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          mov.tipo === "ingreso" || mov.tipo === "recibo" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>
                          {mov.tipo === "recibo" ? "Recibo" : mov.tipo}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-bold">
                    <td colSpan={2} className="py-3 px-4 text-sm text-right text-gray-700">Balance del Día:</td>
                    <td className={`py-3 px-4 text-sm text-right ${
                      movimientosDia.filter((m: any) => m.tipo === "recibo" || m.tipo === "ingreso").reduce((s, m) => s + Number(m.monto), 0) -
                      movimientosDia.filter((m: any) => m.tipo !== "recibo" && m.tipo !== "ingreso").reduce((s, m) => s + Number(m.monto), 0) >= 0 ? "text-green-600" : "text-red-600"
                    }`}>
                      Bs. {formatBs(
                        movimientosDia.filter((m: any) => m.tipo === "recibo" || m.tipo === "ingreso").reduce((s, m) => s + Number(m.monto), 0) -
                        movimientosDia.filter((m: any) => m.tipo !== "recibo" && m.tipo !== "ingreso").reduce((s, m) => s + Number(m.monto), 0)
                      )}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
