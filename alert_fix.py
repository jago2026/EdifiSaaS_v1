import os
path = 'src/app/dashboard/page.tsx'
with open(path, 'r') as f:
    content = f.read()

# Add a very obvious alert to the main useEffect
if 'alert("EDIFISAAS LOADED: VERSION 12:40 VET")' not in content:
    content = content.replace('useEffect(() => {', 'useEffect(() => {\n    alert("EDIFISAAS LOADED: VERSION 12:40 VET");')

with open(path, 'w') as f:
    f.write(content)
