import os
path = 'src/app/dashboard/page.tsx'
with open(path, 'r') as f:
    content = f.read()

# Forzar el cambio en CANTV reemplazando la línea entera para evitar errores de coincidencia parcial
old_line = "{svc.tipo === 'cantv' ? 'Ver Email' : `Bs. ${formatBs(svc.ultimo_monto || 0)}`}"
new_line = "{`Bs. ${formatBs(svc.ultimo_monto || 0)}`}"
content = content.replace(old_line, new_line)

# Forzar el campo de Email de Administradora
if 'email_administradora' not in content:
    content = content.replace('placeholder="Contraseña del portal"', 
        'placeholder="Contraseña del portal"\n                    />\n                  </div>\n                  <div>\n                    <label className="block text-sm font-medium text-gray-700 mb-1">Email de la Administradora</label>\n                    <input\n                      type="email"\n                      value={editConfig.email_administradora}\n                      disabled={!user?.isAdmin}\n                      onChange={(e) => setEditConfig({ ...editConfig, email_administradora: e.target.value })}\n                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${!user?.isAdmin ? "bg-gray-50 text-gray-400 cursor-not-allowed" : ""}`}\n                      placeholder="ejemplo@administradora.com"')

with open(path, 'w') as f:
    f.write(content)
