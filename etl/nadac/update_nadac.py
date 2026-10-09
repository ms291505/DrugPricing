from config import get_env
from library.db import get_connection, test_connection
from nadac.fetch_nadac import fetch_nadac
from nadac.load_nadac import load_nadac
from nadac.parse_nadac import parse_nadac
from nadac.get_loaded_as_of_dates import get_loaded_as_of_dates
import pandas as pd
from nadac.update_drug_package import update_drug_package
from library.parsing import NADAC_DATE_FORMAT
from library.timing import timed
import sys


def update_nadac(report_mm_dd_yyyy: str, filter_before_insert: bool = True):
    env = get_env()

    if not report_mm_dd_yyyy:
        print("No report date provided.")
        return

    filter_before_insert = env.nadac_filter_before_insert

    URL = (
        "https://download.medicaid.gov/data/nadac-national-average-drug-acquisition-cost-"
        + report_mm_dd_yyyy
        + ".csv"
    )

    with timed("NADAC fetch"):
        (nadac_data, _) = fetch_nadac(url=URL)

    COLUMN_MAP = {
        "NADAC_Per_Unit": "NADAC Per Unit",
        "Effective_Date": "Effective Date",
        "Pricing_Unit": "Pricing Unit",
        "Pharmacy_Type_Indicator": "Pharmacy Type Indicator",
        "Explanation_Code": "Explanation Code",
        "Classification_for_Rate_Setting": "Classification for Rate Setting",
        "Corresponding_Generic_Drug_NADAC_Per_Unit": "Corresponding Generic Drug NADAC Per Unit",
        "Corresponding_Generic_Drug_Effective_Date": "Corresponding Generic Drug Effective Date",
    }

    nadac_data = nadac_data.rename(columns=COLUMN_MAP)

    with get_connection() as conn:
        test_connection(conn)

        if not filter_before_insert:
            with timed("NADAC parse"):
                nadac_prices = parse_nadac(nadac_data)

        else:
            with timed("NADAC filter loaded as-of dates"):
                loaded_dates = set(get_loaded_as_of_dates(conn))

                as_of_dates = pd.to_datetime(
                    nadac_data["As of Date"], format=NADAC_DATE_FORMAT
                ).dt.date

                fresh_nadac_data = pd.DataFrame(
                    nadac_data[as_of_dates.isin(loaded_dates) == False]
                )

            if fresh_nadac_data.empty:
                print("No new records to load.")
                update_drug_package(conn)
                conn.commit()
                return

            with timed("NADAC parse"):
                nadac_prices = parse_nadac(fresh_nadac_data)

        with timed("NADAC load"):
            load_nadac(conn, nadac_prices)
        with timed("NADAC update drug packages"):
            update_drug_package(conn)
        with timed("NADAC commit"):
            conn.commit()


def update_nadac_for_dates(file_dates):
    if not file_dates:
        print("No dates provided in .env file, now exiting...")
        sys.exit()

    for date in file_dates:
        print(date)
        with timed(f"NADAC total {date}"):
            update_nadac(report_mm_dd_yyyy=date)


if __name__ == "__main__":
    env = get_env()

    file_dates = env.nadac_file_dates

    if not file_dates:
        print("No dates provided in .env file, now exiting...")
        sys.exit()

    print("Updating NADAC data for the following dates:")
    print(file_dates)

    update_nadac_for_dates(file_dates)
