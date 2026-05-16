# app/utils/cleanup_utils.py
"""
Cleanup utility for temporary download files.
Deletes files older than the specified age to prevent disk fill-up.
"""

import os
import time
from pathlib import Path


def cleanup_old_downloads(
    directory: str = "downloads",
    max_age_hours: float = 1.0,
    extensions: tuple = (".mp3", ".mp4", ".webm", ".mkv", ".wav", ".m4a"),
) -> int:
    """
    Delete files older than `max_age_hours` in the given directory.

    Args:
        directory:     Path to the downloads folder.
        max_age_hours: Maximum file age in hours before deletion.
        extensions:    Only delete files with these extensions.

    Returns:
        Number of files deleted.
    """
    dir_path = Path(directory)
    if not dir_path.exists():
        return 0

    cutoff = time.time() - (max_age_hours * 3600)
    deleted = 0

    for f in dir_path.iterdir():
        if not f.is_file():
            continue
        if f.suffix.lower() not in extensions:
            continue
        try:
            if f.stat().st_mtime < cutoff:
                f.unlink()
                print(f"[Cleanup] 🗑️  Deleted old file: {f.name}")
                deleted += 1
        except Exception as e:
            print(f"[Cleanup] ⚠️  Could not delete {f.name}: {e}")

    if deleted:
        print(f"[Cleanup] ✅ Removed {deleted} old file(s) from {directory}/")

    return deleted
