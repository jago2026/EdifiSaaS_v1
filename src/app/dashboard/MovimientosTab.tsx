"use client";

import { formatBs, formatDate } from "@/lib/formatters";

interface MovimientosTabProps {
  activeTab: string;
  movimientosDia: any[];
  loadingMovements: boolean;
  movements: any[];
  movementTypeFilter: string;
  setMovementTypeFilter: (filter: any) => void;
}

export function MovimientosTab({
  activeTab,
  movimientosDia,
  loadingMovements,
  movements,
  movementTypeFilter,
  setMovementTypeFilter
}: MovimientosTabProps) {
  if (activeTab !== "movimientos") return null;

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
                    onClick={() => setMovementTypeFilter(f.id)}
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
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Unidad</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Bs</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Fuente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMovements.map((mov) => (
                  <tr key={mov.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-sm text-gray-600">{formatDate(mov.fecha)}</td>
                    <td className="py-3 px-4 text-sm text-gray-900 font-medium">
                      {mov.descripcion}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 font-medium">
                      {mov.unidad || "-"}
                    </td>
                    <td className={`py-3 px-4 text-sm text-right font-bold ${
                      mov.tipo === "pago" || mov.tipo === "recibo" ? "text-green-600" : "text-red-600"
                    }`}>
                      {mov.tipo === "pago" || mov.tipo === "recibo" ? "+" : "-"} Bs. {formatBs(mov.monto)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider">
                        {mov.fuente === "movimientos_dia" ? "Hoy" : "Sincronizado"}
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
  );
}
