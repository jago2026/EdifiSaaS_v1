import os

def apply_fixes(file_path):
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Cambio 1: CANTV Deuda
    old_cantv = "svc.tipo === 'cantv' ? 'Ver Email' : `Bs. ${formatBs(svc.ultimo_monto || 0)}`"
    new_cantv = "`Bs. ${formatBs(svc.ultimo_monto || 0)}`"
    
    # Cambio 2: Email Admin Field
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
    
    modified = False
    if old_cantv in content:
        content = content.replace(old_cantv, new_cantv)
        modified = True
        print("CANTV fix applied.")
    
    if 'email_administradora' not in content:
        content = content.replace(old_mark, new_field)
        modified = True
        print("Admin Email UI fix applied.")

    with open(file_path, 'w') as f:
        f.write(content)
    return modified

path = 'src/app/dashboard/page.tsx'
if apply_fixes(path):
    print("Success: File modified.")
else:
    print("Warning: No changes were needed or found.")
