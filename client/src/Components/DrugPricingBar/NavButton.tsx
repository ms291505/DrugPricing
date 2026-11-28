import Button, { type ButtonProps } from "@mui/material/Button"
import { NavLink } from "react-router"

type Props = ButtonProps & {
  to: string;
}
export default function NavButton({ to, children, ...props }: Props) {

  return (
    <Button
      component={NavLink}
      to={to}
      sx={{
        color: "text.primary",
        // Tighter on a phone, where links share the row with Home, Help and Settings. From `sm`
        // up, 64px is MUI's own button min width, restored.
        minWidth: { xs: 0, sm: 64 },
        px: { xs: 0.75, sm: 1 },
        minHeight: { xs: 44, sm: 0 },
      }}
      {...props}
    >
      {children}
    </Button>
  );
}
