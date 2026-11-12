import os
import psycopg2

env_vars = {}
with open('.env.local', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            env_vars[k.strip()] = v.strip().strip('"').strip("'")

# Prefer DIRECT_URL for migrations / direct schema changes, or DATABASE_URL
url = env_vars.get('DIRECT_URL') or env_vars.get('DATABASE_URL')
# Ensure sslmode=require
if 'sslmode=' not in url:
    url += '?sslmode=require' if '?' not in url else '&sslmode=require'

print("Attempting to connect to Neon database...")
try:
    conn = psycopg2.connect(url)
    cur = conn.cursor()
    cur.execute("SELECT version();")
    ver = cur.fetchone()[0]
    print("SUCCESS: Connected to Neon PostgreSQL!")
    print(f"Server version: {ver}")
    
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public';")
    tables = cur.fetchall()
    print(f"Current tables: {[t[0] for t in tables]}")
    
    cur.close()
    conn.close()
except Exception as e:
    print(f"CONNECTION FAILED: {type(e).__name__}: {e}")
