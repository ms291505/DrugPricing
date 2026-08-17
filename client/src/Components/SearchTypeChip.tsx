import { type TabType } from "../library/types.ts";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import MedicationIcon from '@mui/icons-material/Medication';
import ArticleIcon from '@mui/icons-material/Article';

type Props = {
  tabType: TabType;
}

export default function SearchTypeChip({ tabType }: Props) {
  const tabTypeIconMap = {
    "nadac": <AttachMoneyIcon />,
    "fda": <MedicationIcon />,
    "new": <ArticleIcon />,
  }
  return (
    <>
      {tabTypeIconMap[tabType]}
    </>
  )
}
