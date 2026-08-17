import { useWorkspaceContext } from "../../Context/WorkspaceContext"
import type { WorkspaceTab } from "../../library/types";
import { Box, IconButton, ButtonBase, } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useState } from "react";
import SearchTypeChip from "../SearchTypeChip";

type Props = {
  tab: WorkspaceTab,
}

export default function DrawerTab({ tab, }: Props) {
  const tabId = tab.id;

  const { paneAssignment, setPaneAssigment, setMobileDrawerIsClosing, setMobileDrawerIsOpen, mobileDrawerIsOpen } = useWorkspaceContext();
  const selected = paneAssignment.includes(tabId);

  const handleTabClick = () => {
    setPaneAssigment([tab.id]);
    if (mobileDrawerIsOpen) {
      setMobileDrawerIsClosing(true);
      setMobileDrawerIsOpen(false);
    }
  }

  const buttonId = `${tabId}-button`;
  const menuId = `${tabId}-menu`;
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (<>
    <ButtonBase
      component="div"
      onClick={handleTabClick}
      sx={{
        cursor: "pointer",
        pl: 1,
        gap: 1,
        justifyContent: "flex-start",
        color: "text.primary",
        backgroundColor: selected ? "action.selected" : "transparent",
        "@media (hover: hover)": {
          "&:hover": {
            backgroundColor: selected ? "action.selected" : "action.hover",
          },
          "&:hover .tab-menu-icon": {
            opacity: 1,
          },
        },
      }}
    >
      <SearchTypeChip tabType={tab.type} />
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          width: "100%",
        }}
      >
        <Box
          sx={{
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
            textAlign: "left",
            flexGrow: 1
          }}
        >
          {tab.title}
        </Box>
        <IconButton
          className="tab-menu-icon"
          sx={{
            opacity: mobileDrawerIsOpen ? 1 : 0,
            transition: "opacity 0.15s",
            borderRadius: 1,
          }}
          onClick={(e) => {
            e.stopPropagation();
            handleClick(e);
          }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Box>
    </ButtonBase>

    <Menu
      id={menuId}
      anchorEl={anchorEl}
      open={open}
      onClose={handleClose}
      slotProps={{
        list: {
          'aria-labelledby': buttonId,
        },
      }}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "right"
      }}
      transformOrigin={{
        horizontal: "right",
        vertical: "top"
      }}
    >
      <MenuItem onClick={handleClose}>Profile</MenuItem>
      <MenuItem onClick={handleClose}>My account</MenuItem>
      <MenuItem onClick={handleClose}>Logout</MenuItem>
    </Menu>
  </>)
}
