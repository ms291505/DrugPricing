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
        // Tighter on a phone, where four links share the row with the Settings gear.
        minWidth: { xs: 0, sm: 64 },
        px: { xs: 0.75, sm: 1 },
        "&.active": {
          color: "primary.main",
          fontWeight: "bold",
          borderBottom: 2,
          borderColor: "primary.main",
        },
      }}
      {...props}
    >
      {children}
    </Button>
  );
}
