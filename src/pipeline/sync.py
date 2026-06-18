import logging
from datetime import date, datetime, timedelta

from src.config import settings
from src.connectors.base import SyncResult
from src.connectors.wistia import WistiaConnector
from src.db.supabase_client import SupabaseClient

logger = logging.getLogger(__name__)


def run_sync(lookback_days: int | None = None) -> SyncResult:
    if not settings.wistia_configured:
        return SyncResult(
            platform="wistia",
            status="skipped",
            error_message="Wistia not configured. Set WISTIA_API_TOKEN in .env",
        )

    if not settings.supabase_configured:
        return SyncResult(
            platform="wistia",
            status="skipped",
            error_message="Supabase not configured. Set SUPABASE_URL and SUPABASE_KEY in .env",
        )

    end_date = date.today()
    if lookback_days is not None:
        start_date = max(settings.sync_start_date, end_date - timedelta(days=lookback_days))
    else:
        start_date = settings.sync_start_date

    supabase = SupabaseClient()
    run_id = supabase.create_sync_run()

    try:
        result = WistiaConnector().sync(start_date, end_date)

        if result.status == "success":
            supabase.persist(result, start_date, end_date)

        supabase.complete_sync_run(
            run_id,
            result.status,
            result.records_synced,
            result.error_message,
        )
        logger.info("Wistia → Supabase sync %s: %d records", result.status, result.records_synced)
        return result
    except Exception as exc:
        supabase.complete_sync_run(run_id, "error", 0, str(exc))
        logger.exception("Sync failed")
        return SyncResult(platform="wistia", status="error", error_message=str(exc))
