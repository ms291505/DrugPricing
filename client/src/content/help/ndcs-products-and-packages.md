Every drug package sold in the US has a National Drug Code (NDC) in three parts:

| Part | Says | Example: `0003-0894-21` |
| --- | --- | --- |
| Labeler | the company | `0003` |
| Product | the drug, strength and form | `0894`: Eliquis 5 mg tablet |
| Package | the container | `21`: bottle of 60 |

The first two parts together are the **product NDC** (`0003-0894`). One product can have several
packages, and one brand usually has several products: Eliquis 2.5 mg and 5 mg are different
products.

A generic from another company has its own labeler code and its own product code. The numbers
carry no meaning beyond being unique, so two NDCs that look alike are not necessarily related.

FDA search can show its results at either level: **Product** (one row per product, prices
averaged across its packages) or **Package** (one row per package).

**NDC formats.** The FDA writes NDCs with dashes in three layouts (4-4-2, 5-3-2, 5-4-1). NADAC
uses 11 digits with no dashes. This app stores NADAC NDCs without leading zeros, so
`00003-0894-21` appears as `3089421` on the NADAC page. You can type an NDC either way.
