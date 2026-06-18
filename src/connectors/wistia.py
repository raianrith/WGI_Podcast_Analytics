import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime

import requests

from src.config import settings
from src.connectors.base import (
    ChannelRecord,
    EpisodeRecord,
    MetricRecord,
    ProjectRecord,
    SyncResult,
)

logger = logging.getLogger(__name__)

V1_URL = "https://api.wistia.com/v1"
MODERN_URL = "https://api.wistia.com/modern"


class WistiaConnector:
    platform = "wistia"

    def __init__(self) -> None:
        self.api_token = settings.wistia_api_token
        self.project_id = settings.wistia_project_id

    @property
    def is_configured(self) -> bool:
        return settings.wistia_configured

    def _v1_get(self, path: str, params: dict | None = None) -> dict | list:
        response = requests.get(
            f"{V1_URL}{path}",
            headers={"Authorization": f"Bearer {self.api_token}"},
            params=params or {},
            timeout=30,
        )
        response.raise_for_status()
        return response.json()

    def _modern_get(self, path: str, params: dict | None = None) -> dict | list:
        response = requests.get(
            f"{MODERN_URL}{path}",
            headers={
                "Authorization": f"Bearer {self.api_token}",
                "X-Wistia-API-Version": "2026-03",
            },
            params=params or {},
            timeout=30,
        )
        response.raise_for_status()
        return response.json()

    def sync(self, start_date: date, end_date: date) -> SyncResult:
        if not self.is_configured:
            return SyncResult(
                platform=self.platform,
                status="skipped",
                error_message="Wistia not configured. Set WISTIA_API_TOKEN in .env",
            )

        try:
            projects = self._fetch_projects()
            channels = self._fetch_channels()
            channel_map = self._build_channel_map(channels)

            episodes: list[EpisodeRecord] = []
            metrics: list[MetricRecord] = []

            medias = self._fetch_all_medias()
            logger.info("Fetched %d videos, syncing daily stats...", len(medias))

            with ThreadPoolExecutor(max_workers=8) as pool:
                futures = {
                    pool.submit(self._process_media, media, start_date, end_date, channel_map): media
                    for media in medias
                }
                done = 0
                for future in as_completed(futures):
                    done += 1
                    if done % 50 == 0:
                        logger.info("Processed %d/%d videos", done, len(medias))
                    episode, media_metrics = future.result()
                    episodes.append(episode)
                    metrics.extend(media_metrics)

            return SyncResult(
                platform=self.platform,
                status="success",
                records_synced=len(episodes) + len(metrics) + len(projects) + len(channels),
                episodes=episodes,
                projects=projects,
                channels=channels,
                metrics=metrics,
            )
        except Exception as exc:
            logger.exception("Wistia sync failed")
            return SyncResult(
                platform=self.platform,
                status="error",
                error_message=str(exc),
            )

    def _fetch_all_medias(self) -> list[dict]:
        medias: list[dict] = []
        page = 1
        while True:
            params: dict = {"per_page": 100, "page": page}
            if self.project_id:
                params["project_id"] = self.project_id
            batch = self._v1_get("/medias.json", params=params)
            if not batch:
                break
            medias.extend(batch)
            if len(batch) < 100:
                break
            page += 1
        return medias

    def _fetch_projects(self) -> list[ProjectRecord]:
        projects: list[ProjectRecord] = []
        page = 1
        while True:
            batch = self._v1_get("/projects.json", params={"per_page": 100, "page": page})
            if not batch:
                break
            for project in batch:
                projects.append(
                    ProjectRecord(
                        external_id=project.get("hashedId") or str(project.get("id", "")),
                        name=project.get("name", "Untitled Project"),
                        media_count=project.get("mediaCount", 0),
                    )
                )
            if len(batch) < 100:
                break
            page += 1
        return projects

    def _fetch_channels(self) -> list[ChannelRecord]:
        channels: list[ChannelRecord] = []
        page = 1
        while True:
            batch = self._v1_get("/channels.json", params={"per_page": 100, "page": page})
            if not batch:
                break
            for channel in batch:
                channels.append(
                    ChannelRecord(
                        external_id=channel.get("hashedId") or str(channel.get("id", "")),
                        name=channel.get("name", "Untitled Channel"),
                        episode_count=channel.get("episodeCount", channel.get("mediaCount", 0)),
                    )
                )
            if len(batch) < 100:
                break
            page += 1
        return channels

    def _build_channel_map(self, channels: list[ChannelRecord]) -> dict[str, tuple[str, str]]:
        mapping: dict[str, tuple[str, str]] = {}
        for channel in channels:
            page = 1
            while True:
                try:
                    episodes = self._v1_get(
                        f"/channels/{channel.external_id}/channel_episodes.json",
                        params={"per_page": 100, "page": page},
                    )
                except requests.HTTPError:
                    break
                if not episodes:
                    break
                for ep in episodes:
                    media = ep.get("media") or {}
                    hashed_id = (
                        ep.get("mediaHashedId")
                        or ep.get("media_hashed_id")
                        or media.get("hashed_id")
                        or media.get("hashedId")
                    )
                    if hashed_id:
                        mapping[hashed_id] = (channel.external_id, channel.name)
                if len(episodes) < 100:
                    break
                page += 1
        return mapping

    def _process_media(
        self,
        media: dict,
        start_date: date,
        end_date: date,
        channel_map: dict[str, tuple[str, str]],
    ) -> tuple[EpisodeRecord, list[MetricRecord]]:
        hashed_id = media.get("hashed_id", "")
        project = media.get("project") or {}
        channel_id, channel_name = channel_map.get(hashed_id, (None, None))

        created = media.get("created")
        published_at = None
        if created:
            published_at = datetime.fromisoformat(created.replace("Z", "+00:00"))

        period_analytics = {}

        episode = EpisodeRecord(
            external_id=hashed_id,
            title=media.get("name", "Untitled"),
            published_at=published_at,
            duration_seconds=int(media.get("duration") or 0) or None,
            url=media.get("permalink"),
            project_id=project.get("hashed_id") or (str(project.get("id")) if project.get("id") else None),
            project_name=project.get("name"),
            channel_id=channel_id,
            channel_name=channel_name,
            raw_metadata=period_analytics,
        )

        metrics: list[MetricRecord] = []
        metrics.extend(self._fetch_daily_stats(hashed_id, start_date, end_date, episode))
        return episode, metrics

    def _fetch_daily_stats(
        self,
        hashed_id: str,
        start_date: date,
        end_date: date,
        episode: EpisodeRecord,
    ) -> list[MetricRecord]:
        metrics: list[MetricRecord] = []
        try:
            rows = self._modern_get(
                f"/stats/medias/{hashed_id}/by_date",
                params={
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                },
            )
        except requests.HTTPError:
            return metrics

        for row in rows if isinstance(rows, list) else []:
            entry_date_str = row.get("date")
            if not entry_date_str:
                continue
            entry_date = date.fromisoformat(entry_date_str[:10])

            for api_key, metric_name in [
                ("play_count", "plays"),
                ("load_count", "page_loads"),
                ("hours_watched", "hours_watched"),
            ]:
                value = row.get(api_key)
                if value is not None and value > 0:
                    metrics.append(
                        MetricRecord(
                            metric_date=entry_date,
                            metric_name=metric_name,
                            metric_value=float(value),
                            episode_external_id=hashed_id,
                            project_id=episode.project_id,
                            channel_id=episode.channel_id,
                        )
                    )
        return metrics
