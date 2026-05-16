"""
PrismoraAI Full Local Deployment Script

Run this script to:
  1. Start the FastAPI AI Engine on localhost:8000
  2. Start the NestJS Backend Server on localhost:3000
  3. Open an ngrok tunnel to expose the NestJS Backend publicly

Usage:
  python start_all.py

Requirements:
  - Both projects configured locally
  - ngrok installed and authtoken configured
"""

import subprocess
import sys
import time
import json
import os
import signal

FASTAPI_PORT = 8000
NESTJS_PORT = 3000

def get_ngrok_url():
    """Poll ngrok's local API to get the public URL."""
    import urllib.request
    for _ in range(15):
        try:
            resp = urllib.request.urlopen("http://127.0.0.1:4040/api/tunnels", timeout=2)
            data = json.loads(resp.read())
            tunnels = data.get("tunnels", [])
            for t in tunnels:
                if t.get("proto") == "https":
                    return t["public_url"]
            if tunnels:
                return tunnels[0]["public_url"]
        except Exception:
            pass
        time.sleep(1)
    return None

def main():
    print("=" * 60)
    print("  PrismoraAI — Full Local Deployment (Engine + Server)")
    print("=" * 60)
    
    fyp_dir = os.path.dirname(os.path.abspath(__file__))
    engine_dir = os.path.join(fyp_dir, "PrismoraAI_Engine")
    server_dir = os.path.join(fyp_dir, "PrismaAI_Server")
    
    python_exe = os.path.join(engine_dir, ".venv", "Scripts", "python.exe")
    if not os.path.exists(python_exe):
        python_exe = sys.executable

    # 1. Start FastAPI AI Engine
    print(f"\n[1/3] Starting AI Engine (FastAPI) on port {FASTAPI_PORT}...")
    fastapi_proc = subprocess.Popen(
        [python_exe, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", str(FASTAPI_PORT)],
        cwd=engine_dir,
    )
    
    # 2. Start NestJS Server
    print(f"[2/3] Starting Backend Server (NestJS) on port {NESTJS_PORT}...")
    nestjs_proc = subprocess.Popen(
        ["npm", "run", "start:dev"],
        cwd=server_dir,
        shell=True
    )
    
    time.sleep(5)  # Wait for servers to spin up
    
    # 3. Start ngrok tunnel for the NestJS backend
    print(f"[3/3] Starting ngrok tunnel for backend on port {NESTJS_PORT}...")
    ngrok_proc = subprocess.Popen(
        ["ngrok", "http", str(NESTJS_PORT), "--log", "stderr"],
    )
    
    # 4. Get and display the public URL
    public_url = get_ngrok_url()
    
    print("\n" + "=" * 60)
    if public_url:
        print(f"  PUBLIC BACKEND URL : {public_url}")
        print(f"  → Use this URL in your Mobile App! (APK)")
    else:
        print("  WARNING: Could not get ngrok URL automatically.")
        print("  Check: http://127.0.0.1:4040 for the tunnel URL")
    print("=" * 60)
    print("\nPress Ctrl+C to stop everything.")
    print("=" * 60)
    
    # Wait for Ctrl+C
    try:
        fastapi_proc.wait()
    except KeyboardInterrupt:
        print("\n\nShutting down all servers...")
        try:
            ngrok_proc.terminate()
            fastapi_proc.terminate()
            # npm child processes on windows require special care, but terminate usually works
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(nestjs_proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            pass
        print("Done!")

if __name__ == "__main__":
    main()
