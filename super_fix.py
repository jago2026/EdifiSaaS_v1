import os
import re

path = 'src/app/dashboard/page.tsx'
with open(path, 'r') as f:
    content = f.read()

# 1. Brutal replacement of ANY "Ver Email" logic in CANTV
# Pattern matches: {svc.tipo === 'cantv' ? 'Ver Email' : ...} or variations
pattern = r"\{\s*svc\.tipo\s*===\s*['\"]cantv['\"]\s*\?\s*['\"]Ver [Ee]mail['\"]\s*:\s*(`Bs\.\s*\${formatBs\(svc\.ultimo_monto\s*\|\|\s*0\)}`|'Bs\.\s*'\s*\+\s*formatBs\(svc\.ultimo_monto\s*\|\|\s*0\))\s*\}"
content = re.sub(pattern, r"{`Bs. ${formatBs(svc.ultimo_monto || 0)}`}", content)

# 2. Add email_administradora to interface if missing
if "email_administradora?: string | null;" not in content:
    content = content.replace("admin_nombre: string | null;", "admin_nombre: string | null;\n  email_administradora?: string | null;")

# 3. Add email_administradora to state if missing
if 'email_administradora: "adm_laideal@hotmail.com"' not in content:
    content = content.replace('admin_nombre: "La Ideal C.A."', 'admin_nombre: "La Ideal C.A.",\n    email_administradora: "adm_laideal@hotmail.com"')

# 4. Add email_administradora to configuration UI
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
    # Insert after password field
    content = content.replace('placeholder="Contraseña del portal"', 'placeholder="Contraseña del portal"\n                    />\n                  </div>\n' + ui_field)

with open(path, 'w') as f:
    f.write(content)
