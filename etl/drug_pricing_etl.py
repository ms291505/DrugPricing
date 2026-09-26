import sys
import traceback
from datetime import datetime, timedelta
from typing import Literal
from zoneinfo import ZoneInfo

from config import init_env
from fda.update_fda import update_fda
from library.exit_codes import ExitCode
from nadac.update_nadac import update_nadac_for_dates

EASTERN = ZoneInfo("America/New_York")
FLAGS = ["--fda", "--nadac"]


def main():
    args = sys.argv

    mode = get_mode(args)

    if not mode:
        print("Mode not provided, now exiting...")
        sys.exit()

    env = init_env(mode)

    print(f"Now running in '{env.mode}' mode.")

    flags = get_flags(args)

    updating_fda = get_update_decision("fda", flags)

    updating_nadac = get_update_decision("nadac", flags)

    if updating_fda:
        update_fda()

    if updating_nadac:
        if len(flags) > 0:
            update_nadac_for_dates([most_recent_wednesday()])
        else:
            update_nadac_for_dates(env.nadac_file_dates)


def get_mode(args: list[str]):
    try:
        mode = args[1].lower()
    except IndexError:
        print("Mode not provided as argument.")
        return False
    except Exception as e:
        print(f"An error occured : {e}")
        traceback.print_exc()
        return False
    return mode


def get_flags(args: list[str]):
    flags: list[str] = []

    for arg in args:
        normalArg = arg.lower()
        if normalArg[:2] == "--":
            if normalArg in FLAGS:
                flags.append(normalArg)
            else:
                sys.exit(ExitCode.USAGE)

    return flags


def get_update_decision(data_source: Literal["fda", "nadac"], flags: list[str]):

    updating: bool | None = None

    if f"--{data_source}" in flags:
        updating = True

    while updating is None and len(flags) == 0:
        user_input = (
            input(f"Would you like to update the {data_source.upper()} data? (y/n/q) ")
            .lower()
            .strip()
        )
        if user_input == "y":
            updating = True
        if user_input == "n":
            updating = False
        if user_input == "q":
            print("Now exiting...")
            sys.exit(ExitCode.OK)

    return updating


def most_recent_wednesday(now=None) -> str:
    now = now or datetime.now(EASTERN)
    days_back = (now.weekday() - 2) % 7

    if days_back == 0 and now.hour < 12:
        days_back = 7

    return (now - timedelta(days=days_back)).strftime("%m-%d-%Y")


if __name__ == "__main__":
    main()
