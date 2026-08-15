DECLARE @name = ?

SELECT * FROM public."NadacPrices" as t1
WHERE UPPER(t1."NdcDescription") LIKE '%?%'
ORDER BY "Id" ASC
