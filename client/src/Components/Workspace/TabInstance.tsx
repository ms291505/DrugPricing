import { tabTypeRegistry, type WorkspaceTab } from "../../library/types.ts";
import { Box, Fab, Menu, MenuItem, MenuList, TextField, } from "@mui/material";
import { useEffect, useId, useRef, useState } from "react";
import { CONSTANT } from "../../library/constants.ts";
import { useWorkspaceContext } from "../../Context/WorkspaceContext.tsx";
import { theme } from "../../theme.ts";
import { useTabInstanceContext } from "../../Context/TabInstanceContext.tsx";

type Props = {
  workspaceTab: WorkspaceTab,
  visible: boolean,
}

export default function TabInstance({ workspaceTab, visible }: Props) {
  const { setId } = useTabInstanceContext();
  useEffect(() =>
    setId(workspaceTab.id)
    , [setId, workspaceTab.id]);

  const { Provider, Content } = tabTypeRegistry[workspaceTab.type];
  const { opacity } = CONSTANT;
  const { tabs, setPaneAssigment, renameTab } = useWorkspaceContext();


  const paneTitle = tabs.find(t => t.id === workspaceTab.id)?.title ?? "Workspace";

  const id = useId();
  const fabId = `${id}-button`;
  const tabMenuId = `${id}-menu`;
  const [tabMenuAnchorEl, setTabMenuAnchorEl] = useState<null | HTMLElement>(null);
  const tabMenuOpen = Boolean(tabMenuAnchorEl);

  const [renameActive, setRenameActive] = useState(false);
  const [newName, setNewName] = useState(workspaceTab.title);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renameActive && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renameActive])

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setTabMenuAnchorEl(event.currentTarget);
  };
  const handleCloseTabConextMenu = () => {
    setTabMenuAnchorEl(null);
  };

  const handleCloseTab = () => {
    handleCloseTabConextMenu();
    setPaneAssigment(prev => {
      const newAssignment = prev.map(
        p => p !== workspaceTab.id
          ? p
          : null
      );

      return newAssignment;
    })
  }

  const handleRename = () => {
    handleCloseTabConextMenu();
    setRenameActive(true);
  }

  return (
    <>
      <Box
        sx={{
          display: visible ? "flex" : "none",
          minWidth: 0,
          width: "100%"
        }}>
        <Provider>
          <Content />
        </Provider>
      </Box>

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
            {paneTitle}
          </Box>

          : null
        }
      </Fab>

      {!renameActive
        ? null
        : <TextField value={newName}
          onChange={(e) => {
            setNewName(e.target.value);
          }}
          onBlur={() => {
            renameTab(workspaceTab.id, newName);
            setRenameActive(false);
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
          <MenuItem onClick={handleRename} sx={{ justifyContent: "center" }}>Rename</MenuItem>
          <MenuItem onClick={handleCloseTab} sx={{ justifyContent: "center" }}>Close Tab</MenuItem>
          <MenuItem onClick={handleCloseTabConextMenu} sx={{ justifyContent: "center" }}>About</MenuItem>
        </MenuList>
      </Menu>
    </>
  )
}
