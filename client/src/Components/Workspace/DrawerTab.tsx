import { useWorkspaceActions } from "../../Context/WorkspaceContext"
import type { WorkspaceTab } from "../../library/types";
import { Box, IconButton, ButtonBase, TextField, } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { memo, useId, useState } from "react";
import SearchTypeChip from "../SearchTypeChip";
import useTabRename from "../../hooks/useTabRename.ts";

type Props = {
  tab: WorkspaceTab,
  selected: boolean,
  canClose: boolean,
  /** Stable: `DrawerTabList` removes the tab and moves focus to the row that takes over. */
  onClose: (id: string) => void,
}

// Memoized: a tab switch re-renders only the two tabs whose `selected` changed.
export default memo(function DrawerTab({ tab, selected, canClose, onClose }: Props) {
  // Destructured: passing `tabRename.returnFocusRef` as a `ref` makes the React Compiler lint
  // treat the whole object as a ref and flag every other read of it during render.
  const { returnFocusRef, ...tabRename } = useTabRename(tab.id, tab.title);

  const { setPaneAssigment, setMobileDrawerIsOpen } = useWorkspaceActions();

  const handleTabClick = () => {
    setPaneAssigment([tab.id]);
    setMobileDrawerIsOpen(false);
  }

  // Not the tab id: both drawers (phone and desktop) render every tab.
  const uuid = useId();
  const buttonId = `${uuid}-button`;
  const menuId = `${uuid}-menu`;
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
    handleCloseMenu();
    onClose(tab.id);
  }

  // The chip and title, shared by the tab button and the rename row.
  const labelSx = {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 1,
    pl: 1,
    flexGrow: 1,
    minWidth: 0,
    alignSelf: "stretch",
  };

  return (<>
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
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
      {/* While renaming, the row is no button: a text field inside a `role="button"` isn't
          announced as one, and a tap in it would start the row's ripple. */}
      {!tabRename.active
        ? <ButtonBase
          component="div"
          focusRipple
          onClick={handleTabClick}
          data-tab-id={tab.id}
          sx={labelSx}
        >
          <SearchTypeChip tabType={tab.type} />
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
        </ButtonBase>
        : <Box sx={labelSx}>
          <SearchTypeChip tabType={tab.type} />
          <TextField
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
            sx={{ flexGrow: 1 }}
          />
        </Box>
      }
      <IconButton
        ref={returnFocusRef}
        className="tab-menu-icon"
        id={buttonId}
        aria-label={`Options for ${tab.title}`}
        aria-haspopup="true"
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        sx={{
          // Shown on hover; the phone drawer (WorkspaceDrawer) always shows it.
          opacity: 0,
          transition: "opacity 0.15s",
          borderRadius: 1,
        }}
        onClick={handleClick}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
    </Box>

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
