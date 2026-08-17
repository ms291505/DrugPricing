import { Box, Button, } from "@mui/material";

type Props = {
  onClick: () => void;
}
export default function TabButton({ onClick }: Props) {

  return (
    <>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <Button
          onClick={onClick}
          variant="outlined"
        >
          Add Tab
        </Button>
      </Box>
    </>
  )
}
