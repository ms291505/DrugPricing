import type { SvgIconComponent } from "@mui/icons-material";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import PushPinOutlined from "@mui/icons-material/PushPinOutlined";
import ScaleOutlined from "@mui/icons-material/ScaleOutlined";
import type { HelpTopicId } from "../../library/help";

export const IDEAS: { title: string, text: string, link: string, topic: HelpTopicId, Icon: SvgIconComponent }[] = [
  {
    title: "Drug acquisition prices",
    text: "Retail community pharmacies voluntarily share purchase invoices with the Centers for Medicare & Medicaid Services (CMS). Each week, CMS publishes the National Average Drug Acquisition Cost (NADAC).",
    link: "What is NADAC?",
    topic: "nadac",
    Icon: AttachMoneyIcon
  },
  {
    title: "Products and packages",
    text: "A product identifies a drug at one strength and in one form from one labeler. Packages identify the sizes and containers it comes in. FDA search shows either level. NADAC search lists package codes.",
    link: "More about products and packages",
    topic: "ndcs-products-and-packages",
    Icon: Inventory2Outlined
  },
  {
    title: "Prices are per unit",
    text: "Each price estimates what a pharmacy pays per unit, such as a tablet, milliliter or gram. A patient’s bill depends on the pharmacy’s retail price, insurance coverage and any discounts.",
    link: "What the prices mean",
    topic: "what-the-prices-mean",
    Icon: ScaleOutlined
  },
  {
    title: "Pin a chart to keep it",
    text: "Pin a chart to keep its data and dates when you search again. The FDA and NADAC pages under Search share pins. Each Workspace tab keeps its own.",
    link: "Pinning and comparing",
    topic: "pinning-and-comparing",
    Icon: PushPinOutlined
  },
];
