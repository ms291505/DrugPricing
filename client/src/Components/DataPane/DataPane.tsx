import { Paper } from "@mui/material"
import type { ReactNode } from "react"

type Props = {
  content: ReactNode,
  header?: ReactNode | string
}

export default function DataPane({ content, header }: Props) {

  return (
    <Paper
      sx={{
        p: 1,
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
      component="section"
    >

      {
        header
          ?
          <Paper sx={{ p: 1, display: "flex", flexDirection: "column", alignItems: "center" }} elevation={3} component="div">
            header
          </Paper>
          : null
      }
      {content}
    </Paper>
  )
}
