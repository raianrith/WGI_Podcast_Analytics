#!/usr/bin/env python3
"""Run Wistia sync."""

import argparse
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.pipeline.sync import run_sync

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)


def main():
    parser = argparse.ArgumentParser(description="Sync Wistia analytics")
    parser.add_argument("--lookback-days", type=int, default=None)
    args = parser.parse_args()

    result = run_sync(lookback_days=args.lookback_days)
    icon = {"success": "✓", "skipped": "○", "error": "✗"}.get(result.status, "?")
    print(f"{icon} wistia: {result.status} ({result.records_synced} records)")
    if result.error_message:
        print(f"  → {result.error_message}")
    sys.exit(1 if result.status == "error" else 0)


if __name__ == "__main__":
    main()
