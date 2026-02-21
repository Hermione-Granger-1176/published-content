#!/usr/bin/env python3
"""
Generate Content Index

Scans the linkedin/ and youtube/ folders and generates a JavaScript data file
(js/data.js) containing all content information. This file is used by the
index.html website to display filterable, searchable content.

Each content folder can contain:
    - name.txt: Required. Title of the post/session.
    - url.txt: Optional. URL to the original post/video.
    - tags.txt: Optional. One tag per line (e.g., power-query, excel).
    - Files.zip: Optional. Downloadable materials.

Usage:
    python scripts/generate_index.py
"""

from __future__ import annotations

import json
import logging
import re
import sys
from pathlib import Path
from typing import TypedDict

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Configuration
LINKEDIN_DIR = Path("linkedin")
YOUTUBE_DIR = Path("youtube")
JS_OUTPUT_FILE = Path("js/data.js")

# File names
NAME_FILE = "name.txt"
URL_FILE = "url.txt"
TAGS_FILE = "tags.txt"
ZIP_FILE = "Files.zip"


class ContentItem(TypedDict):
    id: str
    platform: str
    title: str
    url: str
    tags: list[str]
    download_url: str | None


def _read_file(file_path: Path) -> str:
    """Read and strip a text file, returning empty string if missing."""
    if not file_path.exists():
        return ""
    return file_path.read_text(encoding="utf-8").strip()


def _parse_tags(file_path: Path) -> list[str]:
    """Parse tags from a tags.txt file (one tag per line)."""
    content = _read_file(file_path)
    if not content:
        return []
    return [tag.strip() for tag in content.splitlines() if tag.strip()]


def _is_valid_content_folder(folder: Path) -> bool:
    """A folder is valid if it contains a name.txt file."""
    return folder.is_dir() and (folder / NAME_FILE).exists()


def _extract_content(folder: Path, platform: str) -> ContentItem | None:
    """Extract structured data from a content folder."""
    title = _read_file(folder / NAME_FILE)
    if not title:
        logger.warning("Empty name.txt in %s, skipping", folder)
        return None

    url = _read_file(folder / URL_FILE)
    if url.startswith("TODO"):
        url = ""

    tags = _parse_tags(folder / TAGS_FILE)

    download_url = None
    if (folder / ZIP_FILE).exists():
        download_url = (folder / ZIP_FILE).as_posix()

    return {
        "id": folder.name,
        "platform": platform,
        "title": title,
        "url": url,
        "tags": tags,
        "download_url": download_url,
    }


def _scan_platform(base_dir: Path, platform: str) -> list[ContentItem]:
    """Scan a platform directory for content folders."""
    if not base_dir.exists():
        logger.info("Directory not found: %s (skipping)", base_dir)
        return []

    items: list[ContentItem] = []
    folders = sorted(
        (f for f in base_dir.iterdir() if _is_valid_content_folder(f)),
        key=lambda f: f.name,
    )

    for folder in folders:
        item = _extract_content(folder, platform)
        if item:
            items.append(item)

    logger.info("Found %d items in %s/", len(items), base_dir)
    return items


def _ensure_unique_ids(items: list[ContentItem]) -> None:
    """Verify there are no duplicate IDs within each platform."""
    seen: dict[str, set[str]] = {}
    for item in items:
        key = item["platform"]
        if key not in seen:
            seen[key] = set()
        if item["id"] in seen[key]:
            raise ValueError(f"Duplicate ID '{item['id']}' in platform '{key}'")
        seen[key].add(item["id"])


def generate() -> None:
    """Generate the js/data.js file from content folders."""
    logger.info("Starting content index generation")

    items: list[ContentItem] = []
    items.extend(_scan_platform(LINKEDIN_DIR, "linkedin"))
    items.extend(_scan_platform(YOUTUBE_DIR, "youtube"))

    if not items:
        logger.warning("No content items found")

    _ensure_unique_ids(items)

    # Ensure output directory exists
    JS_OUTPUT_FILE.parent.mkdir(exist_ok=True)

    # Generate JS content
    js_content = (
        f"window.CONTENT_DATA = {json.dumps(items, indent=2, ensure_ascii=False)};"
    )
    JS_OUTPUT_FILE.write_text(js_content, encoding="utf-8")

    logger.info("Successfully generated %s with %d items", JS_OUTPUT_FILE, len(items))


if __name__ == "__main__":
    try:
        generate()
    except (FileNotFoundError, ValueError) as e:
        logger.error("Failed to generate data: %s", e)
        sys.exit(1)
