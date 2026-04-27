import os
import re

path = 'src/app/dashboard/page.tsx'
with open(path, 'r') as f:
    content = f.read()

# Eliminar cualquier alert de debug previo
content = content.replace('alert("EDIFISAAS LOADED: VERSION 12:40 VET");', '')

# Corrección CANTV: Mostrar monto en vez de "Ver Email"
old_cantv = "svc.tipo === 'cantv' ? 'Ver Email' : `Bs. ${formatBs(svc.ultimo_monto || 0)}`"
new_cantv = "`Bs. ${formatBs(svc.ultimo_monto || 0)}`"
content = content.replace(old_cantv, new_cantv)

# Añadir Email Administradora al interface y estado si faltan
if "email_administradora?: string | null;" not in content:
    content = content.replace("admin_nombre: string | null;", "admin_nombre: string | null;\n  email_administradora?: string | null;")

if 'email_administradora: "adm_laideal@hotmail.com"' not in content:
    content = content.replace('admin_nombre: "La Ideal C.A."', 'admin_nombre: "La Ideal C.A.",\n    email_administradora: "adm_laideal@hotmail.com"')

# Añadir campo a la UI de configuración
if 'label className="block text-sm font-medium text-gray-700 mb-1">Email de la Administradora' not in content:
    ui_field = '''                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email de la Administradora</label>
                    <input
                      type="email"
                      value={editConfig.email_administradora}
                      disabled={!user?.isAdmin}
                      onChange={(e) => setEditConfig({ ...editConfig, email_administradora: e.target.value })}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${!user?.isAdmin ? "bg-gray-50 text-gray-400 cursor-not-allowed" : ""}`}
                      placeholder="ejemplo@administradora.com"
                    />
                  </div>'''
    content = content.replace('placeholder="Contraseña del portal"', 'placeholder="Contraseña del portal"\n                    />\n                  </div>\n' + ui_field)

with open(path, 'w') as f:
    f.write(content)
