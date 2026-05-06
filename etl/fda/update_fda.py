from fda.parse_fda_products import parse_fda_products
from fda.parse_fda_packages import parse_fda_packages
from fda.load_fda_packages import load_fda_packages
from fda.load_fda_products import load_fda_products
from fda.fetch_fda import fetch_fda
from library.db import get_connection, test_connection


def main():
    URL = "https://www.accessdata.fda.gov/cder/ndctext.zip"

    test_connection(get_connection())

    products_data, packages_data = fetch_fda(URL)

    fda_products, _, _ = parse_fda_products(products_data)
    load_fda_products(fda_products)

    product_ids = {product.product_id for product in fda_products}

    fda_packages, _, _ = parse_fda_packages(packages_data)

    matching_packages = [
        package for package in fda_packages if package.product_id in product_ids
    ]

    load_fda_packages(matching_packages)


if __name__ == "__main__":
    main()
