import psycopg
import os
import sys
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()
is_prod = os.environ.get("IS_PROD", "0")

if is_prod == "1":
    connection_string = os.environ.get("PROD_DATABASE_URL", "")
else:
    connection_string = os.environ.get("DATABASE_URL", "")


def main():
    connection = get_connection()
    test_connection(connection)


def get_connection():
    if connection_string == "":
        print("\nConnection string not present in environment. Exiting program...\n")
        sys.exit()

    try:
        return psycopg.connect(connection_string)
    except psycopg.OperationalError as e:
        print(f"\nFailed to connect to database: {e}\n")
        sys.exit()


def test_connection(connection: psycopg.Connection):
    with connection as conn:
        with conn.cursor() as cur:
            cur.execute("""
                    SELECT pg_postmaster_start_time();
                """)
            result = cur.fetchone()
            if result:
                start_time: datetime = result[0]
                print(f"DB started: {start_time.strftime('%B %d, %Y %I:%M %p UTC')}")
            else:
                print("The DB is not up. Now exiting.")
                sys.exit()


if __name__ == "__main__":
    main()
