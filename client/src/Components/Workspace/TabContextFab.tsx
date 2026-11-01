
import { theme } from "../../theme.ts";
import { Box, Fab, Menu, MenuItem, MenuList, TextField, } from "@mui/material";
import { useWorkspaceActions, useWorkspaceTabs } from "../../Context/workspaceContexts.ts";
import { useId, useState } from "react";
import { useTabInstanceContext } from "../../Context/TabInstanceContext.tsx";
import { CONSTANT } from "../../library/constants.ts";
import useScrolled from "../../hooks/useScrolled.ts";
import useTabRename from "../../hooks/useTabRename.ts";
import useMobile from "../../hooks/useMobile.ts";

export default function TabContextFab() {

  const { opacity, drawerWidth, tabContextFabHeight } = CONSTANT;

  const scrolled = useScrolled();

  const tabs = useWorkspaceTabs();
  const { setPaneAssigment, removeTab } = useWorkspaceActions();
  const { id } = useTabInstanceContext();

  const uuid = useId();
  const fabId = `${uuid}-button`;
  const tabMenuId = `${uuid}-menu`;
  // Phones keep the tab's controls at the bottom, in thumb reach; wider screens use the top.
  const isMobile = useMobile();
  const edge = isMobile ? { bottom: 16 } : { top: 82 };

  const tabTitle = tabs.find(t => t.id === id)?.title ?? "Workspace";

  const { returnFocusRef, ...tabRename } = useTabRename(id, tabTitle);

  const [tabMenuAnchorEl, setTabMenuAnchorEl] = useState<null | HTMLElement>(null);
  const tabMenuOpen = Boolean(tabMenuAnchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setTabMenuAnchorEl(event.currentTarget);
  };

  const handleCloseTabConextMenu = () => {
    setTabMenuAnchorEl(null);
  };

  const handleMinimizeTab = () => {
    handleCloseTabConextMenu();
    setPaneAssigment(prev => {
      const newAssignment = prev.map(
        p => p !== id
          ? p
          : null
      );
      return newAssignment;
    })
  }

  const handleCloseTab = () => {
    handleCloseTabConextMenu();
    removeTab(id);
  }

  const handleClickRename = () => {
    handleCloseTabConextMenu();
    tabRename.start();
  }

  return (<>
    <Fab
      ref={returnFocusRef}
      variant="extended"
      id={fabId}
      sx={{
        position: "fixed",
        ...edge,
        left: { xs: "50%", md: `calc(50% + ${drawerWidth / 2}px)` },
        transform: "translateX(-50%)",
        height: 40,
        background: `rgba(205, 205, 205,${tabMenuOpen ? 1 : scrolled ? opacity : 1})`,
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        width: tabContextFabHeight,
      }}
      onClick={tabMenuOpen ? handleCloseTabConextMenu : handleClick}
      disabled={tabRename.active}
    >
      {!tabRename.active
        ? <Box
          component="span"
          sx={{
            display: "block",
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
        >
          {tabTitle}
        </Box>

        : null
      }
    </Fab>

    {!tabRename.active
      ? null
      : <TextField
        value={tabRename.draft}
        onChange={(e) => {
          tabRename.setDraft(e.target.value);
        }}
        onBlur={tabRename.commit}
        onKeyDown={tabRename.onKeyDown}
        variant="standard"
        sx={{
          position: "fixed",
          ...edge,
          left: { xs: "50%", md: `calc(50% + ${drawerWidth / 2}px)` },
          transform: "translateX(-50%)",
          height: 40,
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          width: tabContextFabHeight * .8,
          borderRadius: "16px 16px 16px 16px",
          zIndex: theme.zIndex.fab + 1,
        }}
        inputRef={tabRename.inputRef}
      />
    }

    <Menu
      id={tabMenuId}
      anchorEl={tabMenuAnchorEl}
      open={tabMenuOpen}
      onClose={handleCloseTabConextMenu}
      slotProps={{
        list: {
          'aria-labelledby': fabId,
        },
      }}
      anchorOrigin={{
        vertical: "center",
        horizontal: "center"
      }}
      // The menu grows away from the screen edge the FAB sits on, tucked behind the FAB.
      transformOrigin={{
        vertical: isMobile ? "bottom" : "top",
        horizontal: "center"
      }}
      sx={{
        '& .MuiPaper-root': {

          width: tabContextFabHeight,
          bgcolor: theme.palette.primary.dark,
          ...(isMobile ? { pb: 2 } : { pt: 2 }),
          borderRadius: isMobile ? "16px 16px 4px 4px" : "4px 4px 16px 16px",

        },
        zIndex: theme.zIndex.fab - 1,
      }}
    >
      <MenuList >
        <MenuItem onClick={handleClickRename} sx={{ justifyContent: "center" }}>Rename</MenuItem>
        <MenuItem onClick={handleMinimizeTab} sx={{ justifyContent: "center" }}>Minimize Tab</MenuItem>
        <MenuItem onClick={handleCloseTab} sx={{ justifyContent: "center" }}>Close Tab</MenuItem>
        <MenuItem onClick={handleCloseTabConextMenu} sx={{ justifyContent: "center" }}>New Tab</MenuItem>
      </MenuList>
    </Menu>

  </>)
}
