import pandas as pd
from library.models import FdaProduct
from tqdm import tqdm
from typing import NamedTuple


class ParseWithCount(NamedTuple):
    fda_products: list[FdaProduct]
    input_length: int
    output_length: int


def main():
    pass


def parse_fda_products(products: pd.DataFrame):
    input_length = len(products)

    print(f"Parsing {input_length} new FDA Product records...")

    fda_products = [
        FdaProduct.from_fda_row(row)
        for _, row in tqdm(products.iterrows(), total=input_length, desc="Parsing")
    ]

    return ParseWithCount(
        fda_products=fda_products,
        input_length=input_length,
        output_length=len(fda_products),
    )


if __name__ == "__main__":
    main()
