from typing import NamedTuple
import pandas as pd
from library.models import FdaPackage, FdaProduct
from tqdm import tqdm


class ParseResult(NamedTuple):
    fda_products: list[FdaProduct]
    fda_packages: list[FdaPackage]


def main():
    pass


# Deprecated
#
def parse_fda(products: pd.DataFrame, packages: pd.DataFrame) -> ParseResult:

    products_length = len(products)
    parsing_notification(products_length)

    fda_products = [
        FdaProduct.from_fda_row(row)
        for _, row in tqdm(products.iterrows(), total=products_length, desc="Parsing")
    ]

    packages_length = len(packages)
    parsing_notification(packages_length)

    fda_packages = [
        FdaPackage.from_fda_row(row)
        for _, row in tqdm(packages.iterrows(), total=packages_length, desc="Parsing")
    ]

    return ParseResult(fda_products=fda_products, fda_packages=fda_packages)


def parsing_notification(records: int):
    print(f"Parsing {records} new records...")


if __name__ == "__main__":
    main()
