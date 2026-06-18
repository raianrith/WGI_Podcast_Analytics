from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any


@dataclass
class EpisodeRecord:
    external_id: str
    title: str
    published_at: datetime | None = None
    duration_seconds: int | None = None
    url: str | None = None
    project_id: str | None = None
    project_name: str | None = None
    channel_id: str | None = None
    channel_name: str | None = None
    raw_metadata: dict[str, Any] | None = None


@dataclass
class ProjectRecord:
    external_id: str
    name: str
    media_count: int = 0


@dataclass
class ChannelRecord:
    external_id: str
    name: str
    episode_count: int = 0


@dataclass
class MetricRecord:
    metric_date: date
    metric_name: str
    metric_value: float
    episode_external_id: str | None = None
    project_id: str | None = None
    channel_id: str | None = None
    dimensions: dict[str, Any] | None = None


@dataclass
class SyncResult:
    platform: str
    status: str
    records_synced: int = 0
    error_message: str | None = None
    episodes: list[EpisodeRecord] = field(default_factory=list)
    projects: list[ProjectRecord] = field(default_factory=list)
    channels: list[ChannelRecord] = field(default_factory=list)
    metrics: list[MetricRecord] = field(default_factory=list)
