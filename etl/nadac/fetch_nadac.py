import sys
from datetime import datetime
from io import StringIO

import pandas as pd
import requests

from library.exit_codes import ExitCode


def main():
    pass


def fetch_nadac(report_mm_dd_yyyy: str) -> tuple[pd.DataFrame, int]:

    url = (
        "https://download.medicaid.gov/data/nadac-national-average-drug-acquisition-cost-"
        + datetime.strptime(report_mm_dd_yyyy, "%m-%d-%Y").strftime("%Y%m%d")  # noqa: DTZ007
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
