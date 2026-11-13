import { useWorkspaceActions } from "../../Context/workspaceContexts"
import type { WorkspaceTab } from "../../library/tabType.ts";
import { Box, IconButton, ButtonBase, ListItemIcon, ListItemText, Menu, MenuItem, TextField } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CloseIcon from "@mui/icons-material/Close";
import DriveFileRenameOutlineIcon from "@mui/icons-material/DriveFileRenameOutline";
import { memo, useId, useState } from "react";
import SearchTypeChip from "../ui/SearchTypeChip.tsx";
import useTabRename from "../../hooks/useTabRename.ts";

/** The room the menu needs beside its button to open there, in px: its width and the gaps. */
const MENU_SIDE_ROOM = 200;

type Props = {
  tab: WorkspaceTab,
  selected: boolean,
  /** Stable: `DrawerTabList` removes the tab and moves focus to the row that takes over. */
  onClose: (id: string) => void,
}

// Memoized: a tab switch re-renders only the two tabs whose `selected` changed.
export default memo(function DrawerTab({ tab, selected, onClose }: Props) {
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
  // Beside the button, over the page, where it covers no other tab. The phone drawer leaves no
  // room there, so its menu opens under the button.
  const [beside, setBeside] = useState(true);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    setBeside(window.innerWidth - button.getBoundingClientRect().right >= MENU_SIDE_ROOM);
    setAnchorEl(button);
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
        // While its menu is open the row looks hovered, so the menu reads as this tab's.
        backgroundColor: selected ? "action.selected" : open ? "action.hover" : "transparent",
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
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        sx={{
          // Shown on hover; the phone drawer (WorkspaceDrawer) always shows it.
          opacity: open ? 1 : 0,
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
      anchorOrigin={beside ? { vertical: "top", horizontal: "right" } : { vertical: "bottom", horizontal: "right" }}
      transformOrigin={beside ? { vertical: "top", horizontal: "left" } : { vertical: "top", horizontal: "right" }}
      slotProps={{
        list: { "aria-labelledby": buttonId },
        // A gap from the button, like the search dates' popover.
        paper: { sx: { minWidth: 160, ...(beside ? { ml: 0.5 } : { mt: 0.5 }) } },
      }}
    >
      <MenuItem onClick={onClickRename}>
        <ListItemIcon><DriveFileRenameOutlineIcon fontSize="small" /></ListItemIcon>
        <ListItemText>Rename</ListItemText>
      </MenuItem>
      <MenuItem onClick={handleCloseTab}>
        <ListItemIcon><CloseIcon fontSize="small" /></ListItemIcon>
        <ListItemText>Close tab</ListItemText>
      </MenuItem>
    </Menu>
  </>)
});
