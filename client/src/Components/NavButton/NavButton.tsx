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
