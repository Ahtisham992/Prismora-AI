import os
import time
import random
import shutil
import requests
from pathlib import Path
from typing import Optional

from app.core.config import settings

CLOUDINARY_UPLOAD_PRESET = settings.CLOUDINARY_UPLOAD_PRESET
CLOUDINARY_CLOUD_NAME    = settings.CLOUDINARY_CLOUD_NAME

# 6 MB chunks for Cloudinary unsigned chunked upload (must be >= 5MB)
_CHUNK_SIZE_BYTES = 6 * 1024 * 1024


def _save_local_fallback(file_path: str) -> str:
    """
    Copy file to highlights/ directory for persistent local serving.
    Returns a URL path that can be served via FastAPI static mount.
    """
    os.makedirs("highlights", exist_ok=True)
    filename = os.path.basename(file_path)
    dest = os.path.join("highlights", filename)

    # Don't copy if already in highlights/
    if os.path.abspath(file_path) != os.path.abspath(dest):
        shutil.copy2(file_path, dest)

    print(f"[Cloudinary] 📁 Local fallback saved: highlights/{filename}")
    return f"/api/v1/static/highlights/{filename}"


def _upload_chunked_unsigned(file_path: str) -> str:
    """
    Manual chunked upload for unsigned Cloudinary presets.
    Splits the file into 6MB chunks and sends them sequentially.
    Highly resilient to slow upstream connections.
    """
    url = f"https://api.cloudinary.com/v1_1/{CLOUDINARY_CLOUD_NAME}/video/upload"
    file_size = os.path.getsize(file_path)
    
    upload_id = os.urandom(12).hex() # Unique ID for this upload session
    
    with open(file_path, "rb") as f:
        chunk_num = 0
        while True:
            start_byte = chunk_num * _CHUNK_SIZE_BYTES
            chunk = f.read(_CHUNK_SIZE_BYTES)
            
            if not chunk:
                break
                
            end_byte = start_byte + len(chunk) - 1
            is_last = (end_byte == file_size - 1)
            
            headers = {
                "X-Unique-Upload-Id": upload_id,
                "Content-Range": f"bytes {start_byte}-{end_byte}/{file_size}"
            }
            
            print(f"[Cloudinary]   Uploading chunk {chunk_num + 1} ({len(chunk)/1024/1024:.1f} MB)...")
            
            # Allow 180s per 6MB chunk (very generous for slow networks)
            response = requests.post(
                url,
                files={"file": chunk},
                data={"upload_preset": CLOUDINARY_UPLOAD_PRESET},
                headers=headers,
                timeout=180,
                verify=True
            )
            
            if response.status_code not in (200, 201):
                raise RuntimeError(f"Chunk {chunk_num+1} failed ({response.status_code}): {response.text[:150]}")
                
            # If it's the last chunk, Cloudinary returns the final JSON with secure_url
            if is_last:
                return response.json().get("secure_url")
                
            chunk_num += 1

    raise RuntimeError("Upload finished but no secure_url returned")


def upload_to_cloudinary(
    video_path: str,
    max_retries: int = 4,
    timeout: int = None,
) -> Optional[str]:
    """
    Upload video to Cloudinary using unsigned chunked requests.
    """
    if not os.path.exists(video_path):
        print(f"[Cloudinary] ❌ File not found: {video_path}")
        return _save_local_fallback(video_path) if os.path.exists(video_path) else None

    size_mb = os.path.getsize(video_path) / 1024 / 1024
    print(f"[Cloudinary] 📤 Uploading {size_mb:.1f} MB (unsigned chunked, 6MB pieces)")

    for attempt in range(1, max_retries + 1):
        try:
            print(f"[Cloudinary] Attempt {attempt}/{max_retries}...")
            
            cloud_url = _upload_chunked_unsigned(video_path)
            if cloud_url:
                print(f"[Cloudinary] ✅ Upload successful: {cloud_url}")
                return cloud_url

        except Exception as e:
            err = str(e)[:150]
            print(f"[Cloudinary] ❌ Error on attempt {attempt}: {err}")

        if attempt < max_retries:
            base_wait = 2 ** attempt
            jitter = random.uniform(0, base_wait * 0.5)
            wait_time = base_wait + jitter
            print(f"[Cloudinary] Retrying in {wait_time:.1f}s...")
            time.sleep(wait_time)

    print(f"[Cloudinary] ⚠️ All {max_retries} upload attempts failed.")
    return _save_local_fallback(video_path)