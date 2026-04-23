import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
    const filePath = path.join(process.cwd(), 'src/app/dashboard/page.tsx');
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Add manualFilter state
    if (!content.includes('const [manualFilter, setManualFilter]')) {
        content = content.replace(
            'const [movimientosManual, setMovimientosManual] = useState<MovimientoManual[]>([]);',
            'const [movimientosManual, setMovimientosManual] = useState<MovimientoManual[]>([]);\n  const [manualFilter, setManualFilter] = useState<"todos" | "pendientes" | "ingresos" | "egresos" | "ambos">("todos");'
        );
    }

    // 2. Add filter UI
    const oldHeader = `<div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Control Manual de Movimientos Bancarios</h2>
                <p className="text-sm text-gray-500 italic font-medium">Registra movimientos bancarios pendientes por cargar en Web Admin.</p>
              </div>
              <button onClick={createMovimientoManual} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm text-sm uppercase">
                + Nuevo Registro
              </button>
            </div>`;

    const newHeader = `<div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Control Manual de Movimientos Bancarios</h2>
                <p className="text-sm text-gray-500 italic font-medium">Registra movimientos bancarios pendientes por cargar en Web Admin.</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                  {(["todos", "pendientes", "ingresos", "egresos", "ambos"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setManualFilter(f)}
                      className={\`px-3 py-1.5 text-[10px] font-black rounded-md transition-all uppercase \${manualFilter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}\`}
                    >
                      {f === "todos" ? "Ver Todo" : f === "pendientes" ? "Pendientes" : f === "ingresos" ? "Ingresos" : f === "egresos" ? "Egresos" : "Ambos"}
                    </button>
                  ))}
                </div>
                
                <button onClick={createMovimientoManual} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm text-sm uppercase">
                  + Nuevo Registro
                </button>
              </div>
            </div>`;

    if (content.includes('Control Manual de Movimientos Bancarios') && !content.includes('setManualFilter(f)')) {
         // Attempting a more robust replacement by matching parts if exact match fails due to whitespace
         content = content.replace(/<div className="flex items-center justify-between mb-6">[\s\S]*?Control Manual de Movimientos Bancarios[\s\S]*?<\/button>\s*<\/div>/, newHeader);
    }

    // 3. Apply filter to list
    const oldMap = '{movimientosManual.map((m: MovimientoManual) => (';
    const newMap = `{movimientosManual
                      .filter((m: MovimientoManual) => {
                        if (manualFilter === "pendientes") return !m.comparado;
                        if (manualFilter === "ingresos") return (Number(m.ingresos) || 0) > 0;
                        if (manualFilter === "egresos") return (Number(m.egresos) || 0) > 0;
                        if (manualFilter === "ambos") return (Number(m.ingresos) || 0) > 0 && (Number(m.egresos) || 0) > 0;
                        return true;
                      })
                      .map((m: MovimientoManual) => (`;

    if (content.includes(oldMap)) {
        content = content.replace(oldMap, newMap);
    }

    fs.writeFileSync(filePath, content);
    return NextResponse.json({ success: true });
}
