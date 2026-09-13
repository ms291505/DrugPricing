import { styled, Tooltip, tooltipClasses, Typography, type TooltipProps, } from "@mui/material";

const StyledToolTip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip describeChild {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: '#f5f5f9',
    color: 'rgba(0, 0, 0, 0.87)',
    maxWidth: 220,
    fontSize: theme.typography.pxToRem(12),
    border: '1px solid #dadde9',
  },
}));

type ExplanationToolTipProps = Omit<TooltipProps, "title"> & {
  header?: string,
  content?: string,
}

export default function ExplanationToolTip({ header, content, children, ...props }: ExplanationToolTipProps) {

  return (
    <StyledToolTip
      {...props}
      title={
        <>
          {
            header
              ?
              <Typography
                sx={{
                  color: "inherit",
                }
                }
              >
                {header}
              </ Typography >
              : null
          }
          {
            content ?? null
          }
        </>
      }
    >
      {children}
    </StyledToolTip>
  )
}
