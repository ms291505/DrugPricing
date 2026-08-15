# DrugPricing

DrugPricing is a full stack web app I created to learn new skills. The project includes the following:

1. Postgres data base to store drug and drug pricing data.
1. Simple ETL process to download, transform, and load to the DB.
1. Server created with dotnet that mostly functions as an API for the client to access data.
1. React client for an easy-to-use UI.

## ETL

### Instructions

#### NADAC

1. Update the `.env` file.

#### ETL Notes

- I was able to update the NADAC data as early as 6:17 AM on a Wednesday. For scheduling, the first attempt could be pretty early in the morning with a retry every 30 minutes?

## Server

The development environment requires `appsettings.Development.json` which must be set up, see the example to create one.

### Server Notes

- As of the 2026-04-22 update, the shortest `ndcDescription` is 5 characters, so that is the minimum needed for the description search.
- When starting with a fresh DB, use the `psql` tool to enable the `pg_trgm` extension:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

## Client

React + Vite
