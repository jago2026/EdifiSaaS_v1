import os
import re

root_dir = "src/app/api"

files_to_refactor = []
for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith("route.ts"):
            files_to_refactor.append(os.path.join(root, file))

for file_path in files_to_refactor:
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Skip if already refactored
    if 'import { supabase } from "@/lib/supabase"' in content or 'import { supabaseAdmin } from "@/lib/supabaseAdmin"' in content:
        continue
    
    # Skip files that don't create a client
    if 'createClient(' not in content:
        continue
        
    # Detect if it uses SERVICE_ROLE_KEY
    is_admin = "SUPABASE_SERVICE_ROLE_KEY" in content
    
    # Remove old imports and declarations
    content = re.sub(r'import \{ createClient \} from "@supabase/supabase-js";\n?', '', content)
    content = re.sub(r'const supabaseUrl = .*;\n?', '', content)
    content = re.sub(r'const supabaseKey = .*;\n?', '', content)
    
    if is_admin:
        content = 'import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";\n' + content
    else:
        content = 'import { supabase } from "@/lib/supabase";\n' + content
        
    # Replace createClient call
    content = re.sub(r'const supabase = createClient\(supabaseUrl, supabaseKey\);', '', content)
    # Also handle cases with extra options or different spacing
    content = re.sub(r'const supabase = createClient\(supabaseUrl, supabaseKey, \{.*\}\);', '', content, flags=re.DOTALL)
    
    # Clean up empty lines at the top
    content = content.lstrip()
    
    with open(file_path, 'w') as f:
        f.write(content)
    print(f"Refactored: {file_path} ({'Admin' if is_admin else 'Standard'})")
