#!/usr/bin/env python3
"""Launch the Streamlit dashboard using the project virtualenv."""

import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
VENV_PYTHON = PROJECT_ROOT / ".venv" / "bin" / "python"


def main():
    python = str(VENV_PYTHON if VENV_PYTHON.exists() else sys.executable)
    app_path = PROJECT_ROOT / "dashboard" / "app.py"
    subprocess.run(
        [python, "-m", "streamlit", "run", str(app_path)],
        cwd=str(PROJECT_ROOT),
        check=True,
    )


if __name__ == "__main__":
    main()
