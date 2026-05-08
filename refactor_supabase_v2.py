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
    
    # Check if it uses createClient or has remnants
    if 'createClient' not in content and 'supabaseUrl' not in content and 'supabaseKey' not in content:
        continue
        
    # Detect if it uses SERVICE_ROLE_KEY
    is_admin = "SUPABASE_SERVICE_ROLE_KEY" in content
    
    # Remove old imports
    content = re.sub(r'import \{ .*createClient.* \} from "@supabase/supabase-js";\n?', '', content)
    
    # Remove declarations
    content = re.sub(r'const supabaseUrl = .*;\n?', '', content)
    content = re.sub(r'const supabaseKey = .*;\n?', '', content)
    content = re.sub(r'const serviceRoleKey = .*;\n?', '', content)
    content = re.sub(r'const anonKey = .*;\n?', '', content)
    
    # Add new import if not already there
    if 'import { supabase } from "@/lib/supabase"' not in content and 'import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin"' not in content:
        if is_admin:
            content = 'import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";\n' + content
        else:
            content = 'import { supabase } from "@/lib/supabase";\n' + content
            
    # Replace all createClient calls (const supabase = ..., let supabase = ..., or just createClient(...))
    content = re.sub(r'(const|let|var)\s+supabase\s*=\s*createClient\(.*?\);?\n?', '', content, flags=re.DOTALL)
    
    # Also handle the log that used serviceRoleKey in administradoras/route.ts
    content = re.sub(r'\$\{serviceRoleKey === process\.env\.SUPABASE_SERVICE_ROLE_KEY \? \'service role\' : \'anon key\'\}', 'centralized client', content)

    # Clean up any remaining references to supabaseUrl or supabaseKey that might cause errors
    # (This is risky but often necessary if they were used in other places)
    
    # Final cleanup of empty lines at top
    content = content.lstrip()
    
    with open(file_path, 'w') as f:
        f.write(content)
    print(f"Refactored: {file_path} ({'Admin' if is_admin else 'Standard'})")
