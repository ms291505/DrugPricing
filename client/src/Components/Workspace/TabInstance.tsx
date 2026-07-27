import { tabTypeRegistry, type WorkspaceTab } from "../../library/types.ts";
import { Box, Fab, Menu, MenuItem, MenuList, Divider } from "@mui/material";
import React from "react";
import { CONSTANT } from "../../library/constants.ts";
import { useWorkspaceContext } from "../../Context/WorkspaceContext.tsx";
import { theme } from "../../theme.ts";

type Props = {
  workspaceTab: WorkspaceTab,
  visible: boolean,
}

export default function TabInstance({ workspaceTab, visible }: Props) {
  const { Provider, Content } = tabTypeRegistry[workspaceTab.type];
  const { opacity } = CONSTANT;
  const { tabs, setPaneAssigment } = useWorkspaceContext();

  const paneTitle = tabs.find(t => t.id === workspaceTab.id)?.title ?? "Workspace";

  const id = React.useId();
  const fabId = `${id}-button`;
  const tabMenuId = `${id}-menu`;
  const [tabMenuAnchorEl, setTabMenuAnchorEl] = React.useState<null | HTMLElement>(null);
  const tabMenuOpen = Boolean(tabMenuAnchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setTabMenuAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setTabMenuAnchorEl(null);
  };

  const onClickClose = () => {
    handleClose();
    setPaneAssigment(prev => {
      const newAssignment = prev.map(
        p => p !== workspaceTab.id
          ? p
          : null
      );

      return newAssignment;
    })
  }

  return (
    <>
      <Box
        sx={{
          display: visible ? "flex" : "none",
          minWidth: 0,
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
          width: 180
        }}
        onClick={tabMenuOpen ? handleClose : handleClick}
      >
        {paneTitle}
      </Fab>

      <Menu
        id={tabMenuId}
        anchorEl={tabMenuAnchorEl}
        open={tabMenuOpen}
        onClose={handleClose}
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
        <MenuList dense>
          <MenuItem onClick={handleClose}>Rename</MenuItem>
          <MenuItem onClick={onClickClose}>Close</MenuItem>
          <Divider />
          <MenuItem onClick={handleClose}>About</MenuItem>
        </MenuList>
      </Menu>
    </>
  )
}
