import { useWorkspaceActions, useWorkspaceTabs } from "../../Context/WorkspaceContext"
import type { WorkspaceTab } from "../../library/types";
import { Box, IconButton, ButtonBase, TextField, } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { memo, useEffect, useRef, useState } from "react";
import SearchTypeChip from "../SearchTypeChip";

type Props = {
  tab: WorkspaceTab,
  selected: boolean,
}

// Memoized: a tab switch re-renders only the two tabs whose `selected` changed.
export default memo(function DrawerTab({ tab, selected }: Props) {
  const tabId = tab.id;

  const [renameActive, setRenameActive] = useState(false);
  const [newTitle, setNewTitle] = useState(tab.title);

  const { setPaneAssigment, setMobileDrawerIsOpen, removeTab, renameTab } = useWorkspaceActions();

  const tabs = useWorkspaceTabs();

  const closeTabDisabled = tabs.length === 1;

  const handleTabClick = () => {
    setPaneAssigment([tab.id]);
    setMobileDrawerIsOpen(false);
  }

  const buttonId = `${tabId}-button`;
  const menuId = `${tabId}-menu`;
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const onClickRename = () => {
    handleCloseMenu();
    setRenameActive(true);
  }

  const handleRenameTab = () => {
    renameTab(tab.id, newTitle);
    setRenameActive(false);
    handleCloseMenu();
  }

  const handleCloseTab = () => {
    removeTab(tab.id);
    handleCloseMenu();
  }

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (renameActive && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renameActive])


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
          {!renameActive
            ? tab.title
            : <TextField
              value={newTitle}
              onChange={(e) => {
                setNewTitle(e.target.value);
              }}
              onBlur={handleRenameTab}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  handleRenameTab();
                }
              }}
              variant="standard"
              inputRef={inputRef}
            />
          }
        </Box>
        <IconButton
          className="tab-menu-icon"
          sx={{
            // Shown on hover; the phone drawer (WorkspaceDrawer) always shows it.
            opacity: 0,
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
      onClose={handleCloseMenu}
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
      <MenuItem onClick={onClickRename} >Rename</MenuItem>
      <MenuItem disabled={closeTabDisabled} onClick={handleCloseTab} >Close Tab</MenuItem>
    </Menu>
  </>)
});
