DECLARE @name = ?

SELECT * FROM public."NadacPrices" as t1
WHERE UPPER(t1."NdcDescription") LIKE '%ZEPB%'
ORDER BY "Id" ASC
