import urllib.request
import json

env_vars = {}
with open('.env.local', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            env_vars[k.strip()] = v.strip().strip('"').strip("'")

conn_str = env_vars.get('DATABASE_URL')
# extract host from conn_str
# postgresql://user:pass@host/db?sslmode=...
from urllib.parse import urlparse
parsed = urlparse(conn_str)
host = parsed.hostname

url = f"https://{host}/sql"
payload = json.dumps({"query": "SELECT version(), current_database(), current_user;"}).encode('utf-8')
headers = {
    "Content-Type": "application/json",
    "Neon-Connection-String": conn_str,
}

req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
try:
    with urllib.request.urlopen(req, timeout=10) as response:
        result = json.loads(response.read().decode('utf-8'))
        print("SUCCESS! NEON HTTP SQL RESULT:")
        print(result)
except Exception as e:
    print("HTTP Query error:", e)
    if hasattr(e, 'read'):
        print(e.read().decode('utf-8', errors='ignore'))
