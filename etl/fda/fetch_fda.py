from typing import NamedTuple
import requests
import zipfile
import sys
import pandas as pd
from io import BytesIO


class FetchResult(NamedTuple):
    products: pd.DataFrame
    packages: pd.DataFrame


def main():
    URL = "https://www.accessdata.fda.gov/cder/ndctext.zip"
    fetch_fda(URL)


def fetch_fda(url: str, print_head: bool = False) ->  FetchResult:
    if url == "":
        print("\n No url provided for fetching FDA files. Now exiting.\n")
        sys.exit()

    print("\nFetching FDA files...\n")

    response = requests.get(url)
    if response.status_code != 200:
        print(f"Request returned status code {response.status_code}. Now exiting.")
        sys.exit()

    with zipfile.ZipFile(BytesIO(response.content)) as zipped_data:
        with zipped_data.open("product.txt") as file:
            products = pd.read_csv(file, sep="\t", encoding="latin-1", dtype=str)
            dupes = products[products.duplicated(subset=["PRODUCTNDC"], keep=False)]
            print(f"Duplicate count: {len(dupes)}")
            #dupes.to_csv("duplicate_product_ndc.csv", index=False)
            for col in dupes.columns:
                varies = dupes.groupby('PRODUCTNDC')[col].nunique()
                if (varies > 1).any():
                    print(col)
            dupes = products[products.duplicated(subset=["PRODUCTID"], keep=False)]
            print(f"Duplicate count: {len(dupes)}")
            #dupes.to_csv("duplicate_product_id.csv", index=False)
        with zipped_data.open("package.txt") as file:
            packages = pd.read_csv(file, sep="\t", encoding="latin-1", dtype=str)

    if (print_head): 
       run_test_print(products, packages)
    
    print(f"\nFetched {len(products)} products and {len(packages)} packages.\n")
    
    return FetchResult(products=products, packages=packages)


def run_test_print(products, packages):
    print("Testing products:\n")
    print(products.head(5))
    print((products.iloc[0]))
    
    print("Testing packages:\n")
    print(packages.head(5))
    print((packages.iloc[0]))


if __name__ == "__main__":
    main()
