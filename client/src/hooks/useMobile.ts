import { useMediaQuery } from "@mui/material";

export default function useMobile() {

  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('md'));

  return isMobile;
}
