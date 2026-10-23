import sys
from datetime import datetime
from io import StringIO

import pandas as pd
import requests

from config import get_env
from library.exit_codes import ExitCode


def main():
    pass


def fetch_nadac(report_mm_dd_yyyy: str) -> tuple[pd.DataFrame, int]:

    # In October 2026, CMS uploaded a verison of the file with the wrong date format in the name.
    # I contacted them to confirm if this was an error or a permanent change.
    # They reported it was an error but for the week of 10/14 I created this to handle it.
    #
    env = get_env()

    if env.nadac_file_alternative_date_format:
        url = (
            "https://download.medicaid.gov/data/nadac-national-average-drug-acquisition-cost-"
            + datetime.strptime(report_mm_dd_yyyy, "%m-%d-%Y").strftime("%Y%m%d")  # noqa: DTZ007
            + ".csv"
        )

    else:
        url = (
            "https://download.medicaid.gov/data/nadac-national-average-drug-acquisition-cost-"
            + report_mm_dd_yyyy
            + ".csv"
        )

    print("\nFetching NADAC data...\n")
    print(f"{url}\n")
    response = requests.get(url)
    if response.status_code != 200:
        print(f"Request returned status code {response.status_code}. Now exiting.")
        sys.exit(ExitCode.NADAC_NOT_200)
    if not response.text.strip():
        print("Response was empty. Now exiting.")
        sys.exit(ExitCode.NADAC_NOT_200)
    df = pd.read_csv(StringIO(response.text))
    record_count = len(df)
    print(f"Fetched {record_count} records.")
    return df, record_count


if __name__ == "__main__":
    main()
