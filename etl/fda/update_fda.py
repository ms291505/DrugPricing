from datetime import datetime, timezone

from fda.fetch_fda import fetch_fda
from fda.load_fda_packages import load_fda_packages
from fda.load_fda_products import load_fda_products
from fda.parse_fda_packages import parse_fda_packages
from fda.parse_fda_products import parse_fda_products
from fda.tombstone_fda import tombstone_absent
from library.db import get_connection, test_connection

URL = "https://www.accessdata.fda.gov/cder/ndctext.zip"


def update_fda():
    run_ts = datetime.now(timezone.utc)

    with get_connection() as conn:
        test_connection(conn)

        products_data, packages_data = fetch_fda(URL)

        fda_products, _, _ = parse_fda_products(products_data)
        fda_packages, _, _ = parse_fda_packages(packages_data)

        product_ndcs = {product.product_ndc for product in fda_products}
        matching_packages = [
            package for package in fda_packages if package.product_ndc in product_ndcs
        ]

        load_fda_products(conn, fda_products, run_ts)
        load_fda_packages(conn, matching_packages, run_ts)
        tombstone_absent(conn, run_ts)

        conn.commit()


if __name__ == "__main__":
    update_fda()
