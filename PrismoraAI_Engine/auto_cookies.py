#!/usr/bin/env python3
"""
auto_cookies.py - Extracts YouTube cookies automatically.
Copies Chrome profile to temp dir (avoids the "already running" lock error).
Run once: python auto_cookies.py
Then it auto-refreshes silently on every download.
"""

import json
import time
import shutil
import sys
import tempfile
from pathlib import Path

COOKIES_FILE     = Path(__file__).parent / "cookies.txt"
MAX_AGE_DAYS     = 5
CHROME_PROFILE   = Path.home() / "AppData" / "Local" / "Google" / "Chrome" / "User Data" / "Default"
CHROME_PROFILE_PARENT = CHROME_PROFILE.parent


def _cookies_need_refresh() -> bool:
    if not COOKIES_FILE.exists() or COOKIES_FILE.stat().st_size < 500:
        return True
    age = (time.time() - COOKIES_FILE.stat().st_mtime) / 86400
    if age > MAX_AGE_DAYS:
        print(f"[AutoCookies] Cookies are {age:.1f}d old — refreshing...")
        return True
    return False


def _to_netscape(cookies: list) -> str:
    lines = ["# Netscape HTTP Cookie File", "# Prismora AI — auto-generated", ""]
    for c in cookies:
        domain  = c.get("domain", "")
        flag    = "TRUE" if domain.startswith(".") else "FALSE"
        path    = c.get("path", "/")
        secure  = "TRUE" if c.get("secure", False) else "FALSE"
        expires = int(c.get("expires", 0))
        if expires <= 0:
            expires = int(time.time()) + 86400 * 365
        name    = c.get("name", "")
        value   = c.get("value", "")
        if name and domain:
            lines.append(f"{domain}\t{flag}\t{path}\t{secure}\t{expires}\t{name}\t{value}")
    return "\n".join(lines)


def extract_cookies() -> bool:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("[AutoCookies] Playwright not installed: pip install playwright && playwright install chromium")
        return False

    if not CHROME_PROFILE.exists():
        print(f"[AutoCookies] Chrome profile not found: {CHROME_PROFILE}")
        return False

    # Copy profile to temp dir — avoids the "profile already in use" crash
    print("[AutoCookies] Copying Chrome profile to temp dir...")
    tmp_dir = Path(tempfile.mkdtemp()) / "chrome_profile"
    tmp_default = tmp_dir / "Default"

    try:
        # Only copy the files yt-dlp needs (Cookies, Local State) — fast copy
        tmp_default.mkdir(parents=True, exist_ok=True)

        # Copy Cookies database
        src_cookies = CHROME_PROFILE / "Cookies"
        if src_cookies.exists():
            shutil.copy2(src_cookies, tmp_default / "Cookies")

        # Copy Local State (needed for Chrome to start properly)
        src_state = CHROME_PROFILE_PARENT / "Local State"
        if src_state.exists():
            shutil.copy2(src_state, tmp_dir / "Local State")

        # Copy Preferences
        src_prefs = CHROME_PROFILE / "Preferences"
        if src_prefs.exists():
            shutil.copy2(src_prefs, tmp_default / "Preferences")

        print(f"[AutoCookies] Profile copied to temp dir")

        with sync_playwright() as p:
            context = p.chromium.launch_persistent_context(
                user_data_dir=str(tmp_dir),
                headless=True,
                channel="chrome",
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--no-first-run",
                    "--no-default-browser-check",
                    "--disable-sync",
                ],
            )

            page = context.new_page()
            print("[AutoCookies] Visiting YouTube...")
            try:
                page.goto("https://www.youtube.com", wait_until="domcontentloaded", timeout=20000)
                time.sleep(2)
            except Exception:
                pass   # even if navigation fails, cookies may be in context

            all_cookies = context.cookies([
                "https://www.youtube.com",
                "https://youtube.com",
                "https://www.google.com",
            ])
            context.close()

    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)

    yt_cookies = [
        c for c in all_cookies
        if any(d in c.get("domain", "") for d in ["youtube.com", "google.com", "googlevideo.com"])
    ]

    if not yt_cookies:
        print("[AutoCookies] No YouTube cookies found — are you signed into YouTube in Chrome?")
        return False

    print(f"[AutoCookies] Extracted {len(yt_cookies)} cookies")
    COOKIES_FILE.write_text(_to_netscape(yt_cookies), encoding="utf-8")
    print(f"[AutoCookies] ✅ Saved: {COOKIES_FILE.absolute()}")
    return True


def ensure_fresh_cookies() -> str | None:
    """Called automatically by file_utils.py before every download."""
    if _cookies_need_refresh():
        try:
            extract_cookies()
        except Exception as e:
            print(f"[AutoCookies] Refresh failed: {e}")

    if COOKIES_FILE.exists() and COOKIES_FILE.stat().st_size > 500:
        return str(COOKIES_FILE)
    return None


if __name__ == "__main__":
    print("=" * 55)
    print("  Prismora AI — Auto Cookie Extractor")
    print("=" * 55)
    print()

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("❌ Run first:  pip install playwright && playwright install chromium")
        sys.exit(1)

    print("Make sure you're signed into YouTube in Chrome, then press Enter...")
    input()

    ok = extract_cookies()

    if ok:
        print()
        print("=" * 55)
        print("🎉 Done! Cookies auto-refresh every 5 days silently.")
        print("   You never need to run this again.")
        print("=" * 55)
    else:
        print()
        print("❌ Failed. Make sure you're signed into YouTube in Chrome.")