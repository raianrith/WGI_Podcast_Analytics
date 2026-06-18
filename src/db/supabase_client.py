import logging
from datetime import date, datetime
from typing import Any

import requests

from src.config import settings
from src.connectors.base import ChannelRecord, EpisodeRecord, MetricRecord, ProjectRecord, SyncResult

logger = logging.getLogger(__name__)

BATCH_SIZE = 200


class SupabaseClient:
    def __init__(self) -> None:
        self.base_url = settings.supabase_url.rstrip("/")
        self.key = settings.supabase_write_key

    @property
    def is_configured(self) -> bool:
        return bool(self.base_url and self.key)

    def _headers(self, upsert: bool = False) -> dict[str, str]:
        headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
        }
        if upsert:
            headers["Prefer"] = "resolution=merge-duplicates,return=minimal"
        return headers

    def _post(self, table: str, rows: list[dict], upsert: bool = False) -> None:
        if not rows:
            return
        url = f"{self.base_url}/rest/v1/{table}"
        for i in range(0, len(rows), BATCH_SIZE):
            chunk = rows[i : i + BATCH_SIZE]
            response = requests.post(
                url,
                headers=self._headers(upsert=upsert),
                json=chunk,
                params={"on_conflict": self._conflict_column(table)} if upsert else None,
                timeout=60,
            )
            if not response.ok:
                raise RuntimeError(
                    f"Supabase insert failed ({table}): {response.status_code} {response.text[:500]}"
                )

    def _delete_metrics_range(self, start_date: date, end_date: date) -> None:
        url = f"{self.base_url}/rest/v1/wistia_daily_metrics"
        response = requests.delete(
            url,
            headers=self._headers(),
            params={
                "and": f"(metric_date.gte.{start_date.isoformat()},metric_date.lte.{end_date.isoformat()})",
            },
            timeout=120,
        )
        if response.status_code not in (200, 204):
            logger.warning("Metric delete returned %s: %s", response.status_code, response.text[:200])

    @staticmethod
    def _conflict_column(table: str) -> str:
        return {
            "wistia_projects": "external_id",
            "wistia_channels": "external_id",
            "wistia_videos": "external_id",
            "wistia_daily_metrics": "metric_date,metric_name,video_external_id",
        }.get(table, "id")

    def create_sync_run(self) -> str | None:
        response = requests.post(
            f"{self.base_url}/rest/v1/wistia_sync_runs",
            headers={**self._headers(), "Prefer": "return=representation"},
            json={"status": "running"},
            timeout=30,
        )
        if not response.ok:
            return None
        data = response.json()
        return data[0]["id"] if data else None

    def complete_sync_run(
        self, run_id: str | None, status: str, records: int, error: str | None
    ) -> None:
        if not run_id:
            return
        requests.patch(
            f"{self.base_url}/rest/v1/wistia_sync_runs",
            headers=self._headers(),
            params={"id": f"eq.{run_id}"},
            json={
                "status": status,
                "records_synced": records,
                "error_message": error,
                "completed_at": datetime.utcnow().isoformat(),
            },
            timeout=30,
        )

    def persist(self, result: SyncResult, start_date: date, end_date: date) -> None:
        self._delete_metrics_range(start_date, end_date)

        self._post(
            "wistia_projects",
            [
                {
                    "external_id": p.external_id,
                    "name": p.name,
                    "media_count": p.media_count,
                    "updated_at": datetime.utcnow().isoformat(),
                }
                for p in result.projects
            ],
            upsert=True,
        )

        self._post(
            "wistia_channels",
            [
                {
                    "external_id": c.external_id,
                    "name": c.name,
                    "episode_count": c.episode_count,
                    "updated_at": datetime.utcnow().isoformat(),
                }
                for c in result.channels
            ],
            upsert=True,
        )

        self._post(
            "wistia_videos",
            [
                {
                    "external_id": ep.external_id,
                    "title": ep.title,
                    "published_at": ep.published_at.isoformat() if ep.published_at else None,
                    "duration_seconds": ep.duration_seconds,
                    "url": ep.url,
                    "project_id": ep.project_id,
                    "project_name": ep.project_name,
                    "channel_id": ep.channel_id,
                    "channel_name": ep.channel_name,
                    "raw_metadata": ep.raw_metadata,
                    "updated_at": datetime.utcnow().isoformat(),
                }
                for ep in result.episodes
            ],
            upsert=True,
        )

        metric_rows = [
            {
                "metric_date": m.metric_date.isoformat(),
                "metric_name": m.metric_name,
                "metric_value": m.metric_value,
                "video_external_id": m.episode_external_id,
                "project_id": m.project_id,
                "channel_id": m.channel_id,
                "dimensions": m.dimensions,
            }
            for m in result.metrics
        ]
        self._post("wistia_daily_metrics", metric_rows, upsert=True)
