# Server Read Me

The development environment requires `appsettings.Development.json` which must be set up, see the example to create one.

## Notes

- As of the 2026-04-22 update, the shortest ndcDescription is 5 characters, so that is the minimum needed for the description search.
- When starting with a fresh DB, use the `psql` tool to enable the pg_trgm extension:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```
