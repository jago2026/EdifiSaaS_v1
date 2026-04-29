"use client";

import { formatCurrency } from "@/lib/formatters";

interface IngresosTabProps {
  activeTab: string;
  loadingIngresos: boolean;
  ingresosData: any[];
}

export function IngresosTab({ activeTab, loadingIngresos, ingresosData }: IngresosTabProps) {
  if (activeTab !== "ingresos") return null;

  return (
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
  );
}
