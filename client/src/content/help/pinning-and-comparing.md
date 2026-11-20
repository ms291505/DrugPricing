**Pin** copies a chart or a price change list into the Pinned section at the bottom of the page.
A pinned item is a snapshot: new searches, filters and dates don't change it. That lets you search for one drug,
pin it, search for another, and compare.

The standalone **FDA search** and **NADAC search** share their Pinned collection, so you can
compare charts from both sources. Each **Workspace tab** has its own separate pins.

On a pinned chart you can:

- change its **dates** from the dates chip, without affecting anything else;
- turn on **Match scale** from its menu, so the matched charts in the same unit share one price
  axis. Leave it off for drugs at very different prices, or the cheap one becomes a flat line;
- see the **search source** badge under the title. Its tooltip explains that FDA search uses FDA
  reference data to find and group products, while all plotted prices come from NADAC. Older pins
  without saved source information say **Search source unknown**;
- see the **Products** or **Packages** provenance chip for the search terms and how many results
  the chart shows, plus "filtered" if filters were on. On eligible product charts, this chip also
  switches between product averages and stored package price lines;
- use the dates chip to see or change the pinned chart's date window. **Match scale** only shares
  axes between charts with the same pricing unit.

For a pinned **product** chart with saved package identities, select its **Products** chip to see
the stored package price lines. Select the **Packages** chip to return to product averages. This
switch changes only the chart view; it keeps the same dates and snapshot. Older product pins may
not have package identities and can't be switched.

A pinned **price change list** keeps the prices of the packages it lists over the dates it showed,
and works out its changes from them again, so it reads the same after new searches and reloads. Its
menu can move it, make it half or full width, or remove it; its dates are fixed. Its **Chart this
change** buttons open charts below the pinned items, covering only the list's dates. Those charts
aren't saved, stay open when you collapse or remove the list, and can be pinned themselves. A list
with too many packages to store can't be pinned: narrow the dates or filters, or scan at a higher
percent.
