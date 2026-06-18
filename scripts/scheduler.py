#!/usr/bin/env python3
"""Sync Wistia data every 6 hours."""

import logging
import sys
import time
from pathlib import Path

import schedule

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.pipeline.sync import run_sync

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def job():
    result = run_sync()
    logger.info("Wistia sync %s: %d records", result.status, result.records_synced)


def main():
    schedule.every(6).hours.do(job)
    logger.info("Scheduler started — syncing every 6 hours")
    job()
    while True:
        schedule.run_pending()
        time.sleep(60)


if __name__ == "__main__":
    main()
