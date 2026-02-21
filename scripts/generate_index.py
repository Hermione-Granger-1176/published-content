#!/usr/bin/env python3
"""
Generate Content Index

Scans the content/linkedin/ and content/youtube/ folders and generates a JavaScript data file
(js/data.js) containing all content information. This file is used by the
index.html website to display filterable, searchable content.

The script also updates auto-managed sections in README.md (platform totals,
overall total, and topic badges) so profile stats stay in sync.

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
CONTENT_ROOT = Path("content")
LINKEDIN_DIR = CONTENT_ROOT / "linkedin"
YOUTUBE_DIR = CONTENT_ROOT / "youtube"
JS_OUTPUT_FILE = Path("js/data.js")
README_FILE = Path("README.md")

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


class TagBadge(TypedDict):
    label: str
    color: str
    alt: str
    logo: str | None
    logo_color: str | None


TAG_DISPLAY_ORDER = [
    "excel",
    "power-query",
    "m-code",
    "formulas",
    "dynamic-arrays",
    "charts",
    "data-analysis",
    "data-cleaning",
]

TAG_BADGE_CONFIG: dict[str, TagBadge] = {
    "excel": {
        "label": "Excel",
        "color": "217346",
        "alt": "Excel",
        "logo": "microsoftexcel",
        "logo_color": "white",
    },
    "power-query": {
        "label": "Power_Query",
        "color": "F2C811",
        "alt": "Power Query",
        "logo": None,
        "logo_color": "black",
    },
    "m-code": {
        "label": "M_Code",
        "color": "8E44AD",
        "alt": "M Code",
        "logo": None,
        "logo_color": "white",
    },
    "formulas": {
        "label": "Formulas",
        "color": "27AE60",
        "alt": "Formulas",
        "logo": None,
        "logo_color": "white",
    },
    "dynamic-arrays": {
        "label": "Dynamic_Arrays",
        "color": "4472C4",
        "alt": "Dynamic Arrays",
        "logo": None,
        "logo_color": "white",
    },
    "charts": {
        "label": "Charts",
        "color": "E67E22",
        "alt": "Charts",
        "logo": None,
        "logo_color": "white",
    },
    "data-analysis": {
        "label": "Data_Analysis",
        "color": "2E86C1",
        "alt": "Data Analysis",
        "logo": None,
        "logo_color": "white",
    },
    "data-cleaning": {
        "label": "Data_Cleaning",
        "color": "1ABC9C",
        "alt": "Data Cleaning",
        "logo": None,
        "logo_color": "white",
    },
}


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


def _replace_inline_marker(content: str, marker: str, value: str) -> str:
    """Replace a single inline README auto marker with a value."""
    pattern = re.compile(
        rf"(<!-- AUTO:{re.escape(marker)} -->)(.*?)(<!-- /AUTO:{re.escape(marker)} -->)",
        flags=re.DOTALL,
    )
    matches = pattern.findall(content)
    if len(matches) != 1:
        raise ValueError(
            f"Expected exactly one marker pair for {marker}, found {len(matches)}"
        )

    return pattern.sub(
        lambda match: f"{match.group(1)}{value}{match.group(3)}",
        content,
        count=1,
    )


def _replace_block_marker(content: str, marker: str, value: str) -> str:
    """Replace content between AUTO marker start/end comments."""
    pattern = re.compile(
        rf"(<!-- AUTO:{re.escape(marker)}_START -->)(.*?)(<!-- AUTO:{re.escape(marker)}_END -->)",
        flags=re.DOTALL,
    )
    matches = pattern.findall(content)
    if len(matches) != 1:
        raise ValueError(
            f"Expected exactly one block marker pair for {marker}, found {len(matches)}"
        )

    return pattern.sub(
        lambda match: f"{match.group(1)}\n{value}\n{match.group(3)}",
        content,
        count=1,
    )


def _default_tag_badge(tag: str) -> TagBadge:
    """Build a fallback badge config for unknown tags."""
    words = tag.split("-")
    return {
        "label": "_".join(word.capitalize() for word in words),
        "color": "6C757D",
        "alt": " ".join(word.capitalize() for word in words),
        "logo": None,
        "logo_color": None,
    }


def _sort_tags_for_readme(tags: set[str]) -> list[str]:
    """Sort tags with known tags first, then unknown tags alphabetically."""
    known = [tag for tag in TAG_DISPLAY_ORDER if tag in tags]
    unknown = sorted(tag for tag in tags if tag not in TAG_DISPLAY_ORDER)
    return known + unknown


def _build_tag_badge(tag: str) -> str:
    """Build one README badge image tag for a content tag."""
    badge = TAG_BADGE_CONFIG.get(tag, _default_tag_badge(tag))

    src = (
        f"https://img.shields.io/badge/{badge['label']}-{badge['color']}"
        "?style=flat-square"
    )
    if badge["logo"]:
        src += f"&logo={badge['logo']}"
    if badge["logo_color"]:
        src += f"&logoColor={badge['logo_color']}"

    return f'<img src="{src}" alt="{badge["alt"]}">'


def _build_topic_badges(tags: set[str]) -> str:
    """Build the README topic badges block from discovered tags."""
    sorted_tags = _sort_tags_for_readme(tags)
    if not sorted_tags:
        return ""

    badges: list[str] = []
    for index, tag in enumerate(sorted_tags):
        suffix = "&nbsp;" if index < len(sorted_tags) - 1 else ""
        badges.append(f"{_build_tag_badge(tag)}{suffix}")

    return "\n".join(badges)


def _update_readme(items: list[ContentItem]) -> None:
    """Update README auto-managed markers (counts and topic badges)."""
    if not README_FILE.exists():
        raise FileNotFoundError(f"README file not found: {README_FILE}")

    linkedin_count = sum(1 for item in items if item["platform"] == "linkedin")
    youtube_count = sum(1 for item in items if item["platform"] == "youtube")
    total_count = len(items)
    all_tags = {tag for item in items for tag in item["tags"]}

    readme = README_FILE.read_text(encoding="utf-8")
    total_badge = (
        f'<img src="https://img.shields.io/badge/Total-{total_count}'
        f'-FFD100?style=for-the-badge" alt="Total">'
    )

    readme = _replace_inline_marker(readme, "LINKEDIN_COUNT", str(linkedin_count))
    readme = _replace_inline_marker(readme, "YOUTUBE_COUNT", str(youtube_count))
    readme = _replace_inline_marker(readme, "TOTAL_BADGE", total_badge)
    readme = _replace_inline_marker(readme, "TOTAL_COUNT", str(total_count))
    readme = _replace_block_marker(
        readme, "TOPIC_BADGES", _build_topic_badges(all_tags)
    )

    README_FILE.write_text(readme, encoding="utf-8")
    logger.info("Successfully updated %s", README_FILE)


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
    _update_readme(items)

    logger.info("Successfully generated %s with %d items", JS_OUTPUT_FILE, len(items))


if __name__ == "__main__":
    try:
        generate()
    except (FileNotFoundError, ValueError) as e:
        logger.error("Failed to generate data: %s", e)
        sys.exit(1)
