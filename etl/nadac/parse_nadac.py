import pandas as pd
from library.models import NadacPrice
from tqdm import tqdm


def main():
    pass


def parse_nadac(df: pd.DataFrame) -> list[NadacPrice]:
    print(f"Parsing {len(df)} new records...")

    records = [
        NadacPrice.from_cms_row(row)
        for row in tqdm(df.to_dict("records"), total=len(df), desc="Parsing")
    ]
    print(f"Parsed {len(records)} records.")
    return records


if __name__ == "__main__":
    main()
