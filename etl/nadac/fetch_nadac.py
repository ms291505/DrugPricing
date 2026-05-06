import requests
import sys
import pandas as pd
from io import StringIO

def main():
    pass

def fetch_nadac(url: str) -> tuple[pd.DataFrame, int]:
    print("\nFetching NADAC data...\n")
    response = requests.get(url)
    if response.status_code != 200:
        print(f"Request returned status code {response.status_code}. Now exiting.")
        sys.exit()
    if not response.text.strip():
        print("Response was empty. Now exiting.")
        sys.exit()
    df = pd.read_csv(StringIO(response.text))
    record_count = len(df)
    print(f"Fetched {record_count} records.")
    return df, record_count


if __name__ == "__main__":
    main()
