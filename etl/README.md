# ETL

## Notes

- I was able to update the NADAC data as early as 6:17 AM on a Wednesday. For scheduling, the first attempt could be pretty early in the morning with a retry every 30 minutes?
- Ran into an issue: I need to normalize the NDCs at part of the ETL steps so that I can use the normalized NDC from the FDA Package data as a foreign key. I can't use computed columns as foreign keys.
