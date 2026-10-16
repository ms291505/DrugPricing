import { useWorkspaceActions, } from "../../Context/WorkspaceContext"
import type { WorkspaceTab } from "../../library/types";
import { Box, IconButton, ButtonBase, TextField, } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { memo, useState } from "react";
import SearchTypeChip from "../SearchTypeChip";
import useTabRename from "../../hooks/useTabRename.ts";

type Props = {
  tab: WorkspaceTab,
  selected: boolean,
  canClose: boolean,
}

// Memoized: a tab switch re-renders only the two tabs whose `selected` changed.
export default memo(function DrawerTab({ tab, selected, canClose }: Props) {
  const tabId = tab.id;

  // Destructured: passing `tabRename.returnFocusRef` as a `ref` makes the React Compiler lint
  // treat the whole object as a ref and flag every other read of it during render.
  const { returnFocusRef, ...tabRename } = useTabRename(tab.id, tab.title);

  const { setPaneAssigment, setMobileDrawerIsOpen, removeTab } = useWorkspaceActions();

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
    tabRename.start();
  }

  const handleCloseTab = () => {
    removeTab(tab.id);
    handleCloseMenu();
  }

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
        // Keyboard focus shows the menu button too, e.g. when a rename returns focus to it.
        "& .tab-menu-icon.Mui-focusVisible": {
          opacity: 1,
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
          {!tabRename.active
            ? tab.title
            : <TextField
              slotProps={{
                htmlInput: {
                  "aria-label": "Tab name"
                }
              }}
              value={tabRename.draft}
              onChange={(e) => {
                tabRename.setDraft(e.target.value);
              }}
              onBlur={tabRename.commit}
              onKeyDown={tabRename.onKeyDown}
              variant="standard"
              inputRef={tabRename.inputRef}
              onClick={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
            />
          }
        </Box>
        <IconButton
          ref={returnFocusRef}
          className="tab-menu-icon"
          id={buttonId}
          aria-label="Tab options"
          aria-haspopup="true"
          aria-controls={open ? menuId : undefined}
          aria-expanded={open}
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
      <MenuItem disabled={!canClose} onClick={handleCloseTab} >Close Tab</MenuItem>
    </Menu>
  </>)
});
