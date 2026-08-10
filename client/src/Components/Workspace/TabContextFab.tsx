
import { theme } from "../../theme.ts";
import { Box, Fab, Menu, MenuItem, MenuList, TextField, } from "@mui/material";
import { useWorkspaceContext } from "../../Context/WorkspaceContext.tsx";
import { useEffect, useId, useRef, useState } from "react";
import { useTabInstanceContext } from "../../Context/TabInstanceContext.tsx";
import { CONSTANT } from "../../library/constants.ts";

export default function TabContextFab() {

  const { opacity } = CONSTANT;

  const { tabs, setPaneAssigment, renameTab, removeTab } = useWorkspaceContext();
  const { id } = useTabInstanceContext();

  const uuid = useId();
  const fabId = `${uuid}-button`;
  const tabMenuId = `${uuid}-menu`;

  const tabTitle = tabs.find(t => t.id === id)?.title ?? "Workspace";

  const [renameActive, setRenameActive] = useState(false);
  const [newName, setNewName] = useState(tabTitle);

  const handleRenameTab = () => {
    renameTab(id, newName);
    setRenameActive(false);
  }

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renameActive && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renameActive])

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
    setRenameActive(true);
  }

  return (<>
    <Fab
      variant="extended"
      id={fabId}
      sx={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        height: 40,
        background: `rgba(255, 255, 255,${tabMenuOpen ? 1 : opacity})`,
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        width: 180,
      }}
      onClick={tabMenuOpen ? handleCloseTabConextMenu : handleClick}
      disabled={renameActive}
    >
      {!renameActive
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

    {!renameActive
      ? null
      : <TextField
        value={newName}
        onChange={(e) => {
          setNewName(e.target.value);
        }}
        onBlur={handleRenameTab}
        onKeyDown={e => {
          if (e.key === "Enter") {
            handleRenameTab()
          }
        }}
        variant="standard"
        sx={{
          position: "fixed",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          height: 40,
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          width: 180 * .8,
          borderRadius: "16px 16px 16px 16px",
          zIndex: theme.zIndex.fab + 1,
        }}
        inputRef={inputRef}
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
      transformOrigin={{
        vertical: "top",
        horizontal: "center"
      }}
      sx={{
        '& .MuiPaper-root': {

          width: 180,
          bgcolor: theme.palette.primary.dark,
          pt: 2,
          borderRadius: "4px 4px 16px 16px",

        },
        zIndex: theme.zIndex.fab - 1,
      }}
    >
      <MenuList >
        <MenuItem onClick={handleClickRename} sx={{ justifyContent: "center" }}>Rename</MenuItem>
        <MenuItem onClick={handleMinimizeTab} sx={{ justifyContent: "center" }}>Minimize Tab</MenuItem>
        <MenuItem onClick={handleCloseTab} sx={{ justifyContent: "center" }}>Close Tab</MenuItem>
        <MenuItem onClick={handleCloseTabConextMenu} sx={{ justifyContent: "center" }}>About</MenuItem>
      </MenuList>
    </Menu>

  </>)
}
