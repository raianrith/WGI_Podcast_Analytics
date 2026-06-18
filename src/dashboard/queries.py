from datetime import date

import pandas as pd
from sqlalchemy import func, select

from src.db.models import Channel, DailyMetric, Episode, Project, SessionLocal, SyncRun, init_db

DAILY_METRICS = {"plays", "page_loads", "hours_watched"}


def ensure_db():
    init_db()


def get_sync_status() -> pd.DataFrame:
    session = SessionLocal()
    try:
        runs = session.execute(
            select(SyncRun).order_by(SyncRun.started_at.desc()).limit(10)
        ).scalars().all()
        if not runs:
            return pd.DataFrame()
        return pd.DataFrame([
            {
                "Status": r.status,
                "Records": r.records_synced,
                "Started": r.started_at,
                "Completed": r.completed_at,
                "Error": r.error_message or "",
            }
            for r in runs
        ])
    finally:
        session.close()


def get_date_range_kpis(start_date: date, end_date: date) -> dict[str, float]:
    session = SessionLocal()
    try:
        rows = session.execute(
            select(DailyMetric.metric_name, func.sum(DailyMetric.metric_value))
            .where(
                DailyMetric.metric_date >= start_date,
                DailyMetric.metric_date <= end_date,
                DailyMetric.metric_name.in_(DAILY_METRICS),
                DailyMetric.episode_id.isnot(None),
            )
            .group_by(DailyMetric.metric_name)
        ).all()
        return {name: value for name, value in rows}
    finally:
        session.close()


def get_video_count(start_date: date, end_date: date) -> int:
    session = SessionLocal()
    try:
        return session.execute(
            select(func.count(func.distinct(DailyMetric.episode_id)))
            .where(
                DailyMetric.metric_date >= start_date,
                DailyMetric.metric_date <= end_date,
                DailyMetric.metric_name == "plays",
                DailyMetric.metric_value > 0,
                DailyMetric.episode_id.isnot(None),
            )
        ).scalar_one() or 0
    finally:
        session.close()


def get_daily_plays(start_date: date, end_date: date) -> pd.DataFrame:
    session = SessionLocal()
    try:
        rows = session.execute(
            select(
                DailyMetric.metric_date,
                func.sum(DailyMetric.metric_value).label("plays"),
            )
            .where(
                DailyMetric.metric_date >= start_date,
                DailyMetric.metric_date <= end_date,
                DailyMetric.metric_name == "plays",
                DailyMetric.episode_id.isnot(None),
            )
            .group_by(DailyMetric.metric_date)
            .order_by(DailyMetric.metric_date)
        ).all()
        if not rows:
            return pd.DataFrame()
        df = pd.DataFrame(rows, columns=["date", "plays"])
        df["date"] = pd.to_datetime(df["date"])
        return df
    finally:
        session.close()


def get_daily_plays_by_video(start_date: date, end_date: date, top_n: int = 10) -> pd.DataFrame:
    session = SessionLocal()
    try:
        rows = session.execute(
            select(
                Episode.title,
                DailyMetric.metric_date,
                func.sum(DailyMetric.metric_value).label("plays"),
            )
            .join(Episode, DailyMetric.episode_id == Episode.id)
            .where(
                DailyMetric.metric_date >= start_date,
                DailyMetric.metric_date <= end_date,
                DailyMetric.metric_name == "plays",
            )
            .group_by(Episode.title, DailyMetric.metric_date)
        ).all()
        if not rows:
            return pd.DataFrame()

        df = pd.DataFrame(rows, columns=["title", "date", "plays"])
        top_titles = (
            df.groupby("title")["plays"].sum().sort_values(ascending=False).head(top_n).index
        )
        df = df[df["title"].isin(top_titles)]
        df["date"] = pd.to_datetime(df["date"])
        return df
    finally:
        session.close()


def get_videos_table(start_date: date, end_date: date, limit: int = 100) -> pd.DataFrame:
    session = SessionLocal()
    try:
        rows = session.execute(
            select(
                Episode.id,
                Episode.title,
                Episode.project_name,
                Episode.channel_name,
                Episode.published_at,
                Episode.duration_seconds,
                Episode.url,
                DailyMetric.metric_name,
                func.sum(DailyMetric.metric_value).label("value"),
            )
            .join(Episode, DailyMetric.episode_id == Episode.id)
            .where(
                DailyMetric.metric_date >= start_date,
                DailyMetric.metric_date <= end_date,
                DailyMetric.metric_name.in_(DAILY_METRICS),
            )
            .group_by(
                Episode.id,
                Episode.title,
                Episode.project_name,
                Episode.channel_name,
                Episode.published_at,
                Episode.duration_seconds,
                Episode.url,
                DailyMetric.metric_name,
            )
        ).all()
        if not rows:
            return pd.DataFrame()

        df = pd.DataFrame(
            rows,
            columns=[
                "id", "title", "project_name", "channel_name", "published_at",
                "duration_seconds", "url", "metric", "value",
            ],
        )
        pivot = df.pivot_table(
            index="id",
            columns="metric",
            values="value",
            aggfunc="sum",
        ).reset_index()

        meta = df.drop_duplicates("id")[
            ["id", "title", "project_name", "channel_name", "published_at", "duration_seconds", "url"]
        ]
        result = pivot.merge(meta, on="id", how="left")

        if "plays" in result.columns:
            result = result.sort_values("plays", ascending=False, na_position="last")
        return result.head(limit)
    finally:
        session.close()


def get_projects_breakdown(start_date: date, end_date: date) -> pd.DataFrame:
    session = SessionLocal()
    try:
        rows = session.execute(
            select(
                func.coalesce(Episode.project_name, "Unassigned").label("project"),
                DailyMetric.metric_name,
                func.sum(DailyMetric.metric_value).label("value"),
            )
            .join(Episode, DailyMetric.episode_id == Episode.id)
            .where(
                DailyMetric.metric_date >= start_date,
                DailyMetric.metric_date <= end_date,
                DailyMetric.metric_name.in_(DAILY_METRICS),
            )
            .group_by("project", DailyMetric.metric_name)
        ).all()
        if not rows:
            return pd.DataFrame()

        df = pd.DataFrame(rows, columns=["project", "metric", "value"])
        pivot = df.pivot_table(index="project", columns="metric", values="value", aggfunc="sum").reset_index()
        if "plays" in pivot.columns:
            pivot = pivot.sort_values("plays", ascending=False)
        return pivot
    finally:
        session.close()


def get_channels_table() -> pd.DataFrame:
    session = SessionLocal()
    try:
        rows = session.execute(
            select(Channel.name, Channel.episode_count, Channel.external_id)
            .order_by(Channel.name)
        ).all()
        if not rows:
            return pd.DataFrame()
        return pd.DataFrame(rows, columns=["Channel", "Episodes", "ID"])
    finally:
        session.close()


def get_projects_catalog() -> pd.DataFrame:
    session = SessionLocal()
    try:
        rows = session.execute(
            select(Project.name, Project.media_count, Project.external_id)
            .order_by(Project.name)
        ).all()
        if not rows:
            return pd.DataFrame()
        return pd.DataFrame(rows, columns=["Project", "Videos", "ID"])
    finally:
        session.close()


def get_channels_breakdown(start_date: date, end_date: date) -> pd.DataFrame:
    session = SessionLocal()
    try:
        rows = session.execute(
            select(
                func.coalesce(Episode.channel_name, "Not in a channel").label("channel"),
                DailyMetric.metric_name,
                func.sum(DailyMetric.metric_value).label("value"),
            )
            .join(Episode, DailyMetric.episode_id == Episode.id)
            .where(
                DailyMetric.metric_date >= start_date,
                DailyMetric.metric_date <= end_date,
                DailyMetric.metric_name.in_(DAILY_METRICS),
            )
            .group_by("channel", DailyMetric.metric_name)
        ).all()
        if not rows:
            return pd.DataFrame()

        df = pd.DataFrame(rows, columns=["channel", "metric", "value"])
        pivot = df.pivot_table(index="channel", columns="metric", values="value", aggfunc="sum").reset_index()
        if "plays" in pivot.columns:
            pivot = pivot.sort_values("plays", ascending=False)
        return pivot
    finally:
        session.close()
