import sys
import traceback
from typing import Literal

from config import init_env
from fda.update_fda import update_fda
from nadac.update_nadac import update_nadac_for_dates


def main():
    args = sys.argv

    mode = get_mode(args)

    if not mode:
        print("Mode not provided, now exiting...")
        sys.exit()

    env = init_env(mode)

    print(f"Now running in '{env.mode}' mode.")

    updating_fda = get_update_decision("fda")

    updating_nadac = get_update_decision("nadac")

    if updating_fda:
        update_fda()

    if updating_nadac:
        update_nadac_for_dates(env.nadac_file_dates)


def get_mode(args: list[str]):
    try:
        mode = args[1]
    except IndexError:
        print("Mode not provided as argument.")
        return False
    except Exception as e:
        print(f"An error occured : {e}")
        traceback.print_exc()
        return False
    return mode


def get_update_decision(data_source: Literal["fda", "nadac"]):
    updating: bool | None = None

    while updating is None:
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
            sys.exit()

    return updating


if __name__ == "__main__":
    main()
