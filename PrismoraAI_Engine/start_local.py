"""
PrismoraAI Engine — Local Server with ngrok Tunnel

Run this script to:
  1. Start the FastAPI server on localhost:8000
  2. Open an ngrok tunnel to expose it publicly
  3. Print the public URL — use this in your mobile app / Render backend

Usage:
  python start_local.py

Requirements:
  - ngrok installed (winget install ngrok.ngrok)
  - ngrok account (free at https://ngrok.com) 
  - Run: ngrok config add-authtoken <YOUR_TOKEN>  (one-time setup)
"""

import subprocess
import sys
import time
import json
import signal
import os

FASTAPI_PORT = 8000

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
    print("  PrismoraAI Engine — Local Server + ngrok Tunnel")
    print("=" * 60)
    
    # 1. Start FastAPI server
    print(f"\n[1/2] Starting FastAPI server on port {FASTAPI_PORT}...")
    fastapi_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app",
         "--host", "0.0.0.0", "--port", str(FASTAPI_PORT), "--reload"],
        cwd=os.path.dirname(os.path.abspath(__file__)),
    )
    time.sleep(3)  # Wait for server to start
    
    # 2. Start ngrok tunnel
    print(f"[2/2] Starting ngrok tunnel...")
    ngrok_proc = subprocess.Popen(
        ["ngrok", "http", str(FASTAPI_PORT), "--log", "stderr"],
    )
    
    # 3. Get and display the public URL
    public_url = get_ngrok_url()
    
    print("\n" + "=" * 60)
    if public_url:
        print(f"  PUBLIC URL : {public_url}")
        print(f"  API Docs   : {public_url}/docs")
        print(f"\n  → Update AI_API_URL on Render to:")
        print(f"    {public_url}")
    else:
        print("  WARNING: Could not get ngrok URL automatically.")
        print("  Open http://127.0.0.1:4040 to see the tunnel URL")
        print("  Then update AI_API_URL in Render dashboard")
    print("=" * 60)
    print("\nUse this URL in:")
    print("  - Render dashboard → prismoraai-server → Environment → AI_API_URL")
    print("  - Mobile App (APK) for direct AI calls if needed")
    print("\nTIP: Get a FREE static domain so URL never changes:")
    print("  ngrok dashboard → Domains → New Domain")
    print("  Then edit start_local.py to add: --domain=your-name.ngrok-free.app")
    print("\nPress Ctrl+C to stop both servers.")
    print("=" * 60)
    
    # Wait for Ctrl+C
    try:
        fastapi_proc.wait()
    except KeyboardInterrupt:
        print("\n\nShutting down...")
        ngrok_proc.terminate()
        fastapi_proc.terminate()
        print("Done!")

if __name__ == "__main__":
    main()
