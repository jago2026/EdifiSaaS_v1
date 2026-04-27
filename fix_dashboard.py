import os
path = 'src/app/dashboard/page.tsx'
with open(path, 'r') as f:
    content = f.read()

# Fix CANTV display
old_cantv = "svc.tipo === 'cantv' ? 'Ver Email' : `Bs. ${formatBs(svc.ultimo_monto || 0)}`"
new_cantv = "`Bs. ${formatBs(svc.ultimo_monto || 0)}`"
content = content.replace(old_cantv, new_cantv)

# Fix Email Admin Field
if 'email_administradora' not in content:
    old_mark = 'placeholder="Contraseña del portal"'
    new_field = '''placeholder="Contraseña del portal"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email de la Administradora</label>
                    <input
                      type="email"
                      value={editConfig.email_administradora}
                      disabled={!user?.isAdmin}
                      onChange={(e) => setEditConfig({ ...editConfig, email_administradora: e.target.value })}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${!user?.isAdmin ? "bg-gray-50 text-gray-400 cursor-not-allowed" : ""}`}
                      placeholder="ejemplo@administradora.com"
                    />'''
    content = content.replace(old_mark, new_field)

with open(path, 'w') as f:
    f.write(content)
