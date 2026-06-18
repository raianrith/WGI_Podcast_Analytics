import sys
from datetime import date, timedelta
from pathlib import Path

import pandas as pd
import plotly.express as px
import streamlit as st

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.config import settings
from src.dashboard.queries import (
    ensure_db,
    get_channels_breakdown,
    get_channels_table,
    get_daily_plays,
    get_daily_plays_by_video,
    get_date_range_kpis,
    get_projects_breakdown,
    get_projects_catalog,
    get_sync_status,
    get_video_count,
    get_videos_table,
)
from src.pipeline.sync import run_sync

st.set_page_config(page_title="Wistia Analytics", page_icon="📊", layout="wide")
WISTIA_BLUE = "#54BBFF"


def render_sidebar() -> tuple[date, date, int]:
    with st.sidebar:
        st.header("Controls")

        preset = st.selectbox(
            "Quick range",
            options=["Last 7 days", "Last 14 days", "Last 30 days", "Last 60 days", "Last 90 days", "Custom"],
            index=2,
        )
        end_date = date.today()
        preset_days = {"Last 7 days": 7, "Last 14 days": 14, "Last 30 days": 30, "Last 60 days": 60, "Last 90 days": 90}

        if preset == "Custom":
            col1, col2 = st.columns(2)
            start_date = col1.date_input("Start", value=end_date - timedelta(days=30))
            end_date = col2.date_input("End", value=end_date)
            lookback = (end_date - start_date).days
        else:
            lookback = preset_days[preset]
            start_date = end_date - timedelta(days=lookback)
            st.caption(f"**{start_date.strftime('%b %d, %Y')}** → **{end_date.strftime('%b %d, %Y')}**")

        st.divider()

        if st.button("🔄 Sync from Wistia", use_container_width=True):
            with st.spinner(f"Syncing last {lookback} days..."):
                result = run_sync(lookback_days=lookback)
                if result.status == "success":
                    st.success(f"Synced {result.records_synced} records")
                elif result.status == "error":
                    st.error(result.error_message or "Sync failed")
                else:
                    st.warning(result.error_message or "Sync skipped")
            st.rerun()

        st.divider()
        st.write(f"**Wistia:** {'🟢 Connected' if settings.wistia_configured else '🔴 Not configured'}")
        st.caption("Sync pulls daily stats for the selected range")

    return start_date, end_date, lookback


def render_kpis(start_date: date, end_date: date):
    kpis = get_date_range_kpis(start_date, end_date)
    active_videos = get_video_count(start_date, end_date)

    cols = st.columns(5)
    cols[0].metric("Active Videos", f"{active_videos:,}")
    cols[1].metric("Plays", f"{kpis.get('plays', 0):,.0f}")
    cols[2].metric("Page Loads", f"{kpis.get('page_loads', 0):,.0f}")
    cols[3].metric("Hours Watched", f"{kpis.get('hours_watched', 0):,.1f}")
    days = max((end_date - start_date).days, 1)
    cols[4].metric("Avg Plays / Day", f"{kpis.get('plays', 0) / days:,.1f}")


def render_overview_tab(start_date: date, end_date: date):
    col1, col2 = st.columns([2, 1])

    with col1:
        df = get_daily_plays(start_date, end_date)
        if df.empty:
            st.info("No data for this date range. Sync from Wistia first.")
        else:
            fig = px.area(
                df, x="date", y="plays", title="Daily Plays",
                labels={"date": "Date", "plays": "Plays"},
                color_discrete_sequence=[WISTIA_BLUE],
            )
            fig.update_layout(hovermode="x unified", height=360)
            st.plotly_chart(fig, use_container_width=True)

    with col2:
        projects_df = get_projects_breakdown(start_date, end_date)
        if projects_df.empty:
            st.info("No project data.")
        elif "plays" in projects_df.columns:
            fig = px.pie(
                projects_df.head(8), names="project", values="plays",
                title="Plays by Project", hole=0.4,
            )
            fig.update_layout(height=360)
            st.plotly_chart(fig, use_container_width=True)

    top_df = get_daily_plays_by_video(start_date, end_date, top_n=8)
    if not top_df.empty:
        fig = px.line(
            top_df, x="date", y="plays", color="title",
            title="Top Videos — Daily Plays",
            labels={"date": "Date", "plays": "Plays", "title": "Video"},
        )
        fig.update_layout(hovermode="x unified", height=380)
        st.plotly_chart(fig, use_container_width=True)


def render_videos_tab(start_date: date, end_date: date):
    df = get_videos_table(start_date, end_date, limit=200)
    if df.empty:
        st.info("No video data for this date range.")
        return

    display = df.copy()
    rename = {
        "title": "Video",
        "project_name": "Project",
        "channel_name": "Channel",
        "published_at": "Published",
        "duration_seconds": "Duration (s)",
        "plays": "Plays",
        "page_loads": "Page Loads",
        "hours_watched": "Hours Watched",
    }
    display = display.rename(columns={k: v for k, v in rename.items() if k in display.columns})
    if "Published" in display.columns:
        display["Published"] = pd.to_datetime(display["Published"], errors="coerce").dt.strftime("%Y-%m-%d")
    if "Duration (s)" in display.columns:
        display["Duration (s)"] = display["Duration (s)"].apply(
            lambda s: f"{int(s // 60)}:{int(s % 60):02d}" if pd.notna(s) and s else ""
        )

    st.dataframe(
        display[[c for c in display.columns if c != "url"]],
        use_container_width=True,
        hide_index=True,
    )


def render_projects_tab(start_date: date, end_date: date):
    col1, col2 = st.columns(2)

    with col1:
        st.subheader("Performance by Project")
        perf = get_projects_breakdown(start_date, end_date)
        if perf.empty:
            st.info("No project performance data for this range.")
        else:
            st.dataframe(perf, use_container_width=True, hide_index=True)

    with col2:
        st.subheader("All Projects")
        catalog = get_projects_catalog()
        if catalog.empty:
            st.info("No projects found.")
        else:
            st.dataframe(catalog, use_container_width=True, hide_index=True)


def render_channels_tab(start_date: date, end_date: date):
    col1, col2 = st.columns(2)

    with col1:
        st.subheader("Performance by Channel")
        perf = get_channels_breakdown(start_date, end_date)
        if perf.empty:
            st.info("No channel play data for this range.")
        else:
            st.dataframe(perf, use_container_width=True, hide_index=True)

    with col2:
        st.subheader("All Channels")
        catalog = get_channels_table()
        if catalog.empty:
            st.info("No channels found.")
        else:
            st.dataframe(catalog, use_container_width=True, hide_index=True)


def main():
    ensure_db()
    st.title("📊 Wistia Analytics")
    st.caption("Date-filtered analytics across projects, channels, and videos")

    start_date, end_date, _ = render_sidebar()
    render_kpis(start_date, end_date)

    overview, videos, projects, channels = st.tabs(
        ["Overview", "Videos", "Projects", "Channels"]
    )

    with overview:
        render_overview_tab(start_date, end_date)
    with videos:
        render_videos_tab(start_date, end_date)
    with projects:
        render_projects_tab(start_date, end_date)
    with channels:
        render_channels_tab(start_date, end_date)

    with st.expander("Recent Syncs"):
        sync_df = get_sync_status()
        if sync_df.empty:
            st.info("No syncs yet.")
        else:
            st.dataframe(sync_df, use_container_width=True, hide_index=True)


if __name__ == "__main__":
    main()
