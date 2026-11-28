import type { SvgIconComponent } from "@mui/icons-material";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import PushPinOutlined from "@mui/icons-material/PushPinOutlined";
import ScaleOutlined from "@mui/icons-material/ScaleOutlined";
import TimelineIcon from "@mui/icons-material/Timeline";
import type { HelpTopicId } from "../../library/help";

// The first card says where NADAC comes from, so a visitor who knows the benchmark can skip it. The rest start with
// what a visitor came to do, then explain the data they'll need to read it.
export const IDEAS: { title: string, text: string, link: string, topic: HelpTopicId, Icon: SvgIconComponent }[] = [
  {
    title: "Where NADAC comes from",
    text: "Retail pharmacies voluntarily submit purchase invoices to a monthly survey for the Centers for Medicare & Medicaid Services (CMS). CMS publishes the National Average Drug Acquisition Cost (NADAC) each week, and new price files are automatically added to this app.",
    link: "What is NADAC?",
    topic: "nadac",
    Icon: AttachMoneyIcon
  },
  {
    title: "Compare two drugs",
    text: "Your plan’s PBM report shows different ingredient costs for Mounjaro and Zepbound. Does NADAC show a similar gap? In FDA search, enter tirzepatide as the Generic name, select a 5 mg pen of each, and choose Line.",
    link: "Things to try",
    topic: "things-to-try",
    Icon: CompareArrowsIcon
  },
  {
    title: "See when the price changed",
    text: "Choose 'All' under NADAC price dates to see the history back to 2022. Notable price changes are listed when a package’s price moved 10% or more. Scan your search results to list other price changes.",
    link: "Price changes",
    topic: "price-changes",
    Icon: TimelineIcon
  },
  {
    title: "Prices are per unit",
    text: "Each price estimates what a pharmacy pays per unit, such as a tablet, milliliter, or gram. Convert your own figure to the same unit before you compare. A patient’s bill depends on the pharmacy’s retail price, insurance coverage, and any discounts.",
    link: "What the prices mean",
    topic: "what-the-prices-mean",
    Icon: ScaleOutlined
  },
  {
    title: "Products and packages",
    text: "A product is one drug at one strength and in one form from one labeler, and its packages are the sizes and containers it comes in. Compare packages to check whether a tablet costs the same per tablet in every bottle size.",
    link: "More about products and packages",
    topic: "ndcs-products-and-packages",
    Icon: Inventory2Outlined
  },
  {
    title: "Pin a chart to keep it",
    text: "Pin a chart to keep its data and dates when you search again. The FDA and NADAC pages under Search share their pins, and each workspace tab keeps its own.",
    link: "Pinning and comparing",
    topic: "pinning-and-comparing",
    Icon: PushPinOutlined
  },
];
