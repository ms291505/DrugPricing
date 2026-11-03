import { useEffect, useState } from "react";
import { Button, type ButtonProps } from "@mui/material";

/** How long the button waits for the confirming click before it backs off. */
const CONFIRM_TIMEOUT_MS = 4000;

type Props = Omit<ButtonProps, "onClick" | "variant" | "children"> & {
  label: string,
  /** Shown while waiting for the second click. */
  confirmLabel: string,
  onConfirm: () => void,
}

/**
 * A button for a destructive action that takes two clicks: outlined at first, then filled and
 * asking to be clicked again. It backs off if the second click doesn't come within a few seconds
 * or focus leaves it.
 */
export default function ConfirmButton({ label, confirmLabel, onConfirm, onBlur, ...props }: Props) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), CONFIRM_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <Button
      {...props}
      variant={armed ? "contained" : "outlined"}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          return;
        }
        setArmed(false);
        onConfirm();
      }}
      onBlur={(event) => {
        setArmed(false);
        onBlur?.(event);
      }}
    >
      {armed ? confirmLabel : label}
    </Button>
  );
}
