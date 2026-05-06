import pandas as pd
from library.models import FdaPackage 
from tqdm import tqdm
from typing import NamedTuple


class ParseWithCount(NamedTuple):
    fda_packages: list[FdaPackage]
    input_length: int
    output_length: int


def main():
    pass


def parse_fda_packages(packages: pd.DataFrame):
    input_length = len(packages)
    
    print(f"Parsing {input_length} new FDA Package records...")
    
    fda_packages = [
        FdaPackage.from_fda_row(row) for _, row in tqdm(packages.iterrows(),
        total=input_length,
        desc="Parsing")]

    return ParseWithCount(fda_packages=fda_packages, input_length=input_length, output_length=len(fda_packages))


if __name__ =="__main__":
    main()
