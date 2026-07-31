"""Convenience entrypoint. Prefer the module commands directly:

    uv run python -m echo.download     # 1. fetch the Kaggle dataset
    uv run python -m echo.preprocess   # 2. clean it into data/processed
    uv run jupyter lab notebooks/eda.ipynb  # 3. explore it
"""


def main() -> None:
    print(__doc__)


if __name__ == "__main__":
    main()
