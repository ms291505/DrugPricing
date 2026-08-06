import os
import sys
from typing import Literal
from library.models import Environment

from dotenv import load_dotenv
from pydantic import SecretStr

_env: Environment | Literal[False] = False


def init_env(mode: str) -> Environment:
    global _env
    _env = get_env_variables(mode)
    if not _env:
        print("Environment variables not provided, now exiting...")
        sys.exit()
    return _env


def get_env() -> Environment:
    if not _env:
        raise RuntimeError("Environment not initialized = call init_env() first")
    return _env


def get_env_variables(mode: str):
    dotenv_path = f".env.{mode}"

    dotenv = load_dotenv(dotenv_path=dotenv_path)

    if not dotenv:
        print(f"dotenv not found at '{dotenv_path}'")

        return False

    nadac_filter_before_insert = os.getenv("NADAC_FILTER_BEFORE_INSERT", "1")

    raw_dates = os.getenv("NADAC_FILE_DATES", "")
    nadac_file_dates = raw_dates.split(".") if raw_dates else []

    database_url = os.getenv("DATABASE_URL", "")

    env = Environment(
        nadac_filter_before_insert=nadac_filter_before_insert == "1",
        mode=mode,
        nadac_file_dates=nadac_file_dates,
        database_url=SecretStr(database_url),
    )

    return env
