import { useId, useMemo, useState, type ReactNode } from "react";
import {
  Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, Typography,
} from "@mui/material";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { barDataRows, csvFileName, downloadCsv, lineDataRows } from "../../library/chartCsv";
import { visuallyHidden } from "@mui/utils";
import { pricingUnitLabel } from "../../library/chartSeries";
import { distinctRange, formatPrice } from "../../library/chartScale";
import useMobile from "../../hooks/useMobile";
import { formatDate, type DateBounds, type DateWindow } from "../../library/dates";
import type { BarValue } from "../../library/seriesSummary";
import type { ChartPrice } from "../../library/types";

type Props = {
  title: string,
  /** First and last date shown, for the file name. */
  bounds: DateBounds,
  toCsv: () => string,
  /** The table, mounted only while open. */
  children: ReactNode,
}

/** "View data" and "Download CSV" under a chart. The table opens inline as a disclosure. */
export default function ChartData({ title, bounds, toCsv, children }: Props) {
  const [open, setOpen] = useState(false);
  const tableId = useId();
  return (
    <Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        <Button
          size="small"
          aria-expanded={open}
          aria-controls={tableId}
          startIcon={<TableChartOutlinedIcon />}
          endIcon={<ExpandMoreIcon sx={{ transform: open ? "rotate(180deg)" : undefined }} />}
          onClick={() => setOpen(isOpen => !isOpen)}
        >
          View data
        </Button>
        <Button
          size="small"
          startIcon={<FileDownloadOutlinedIcon />}
          onClick={() => downloadCsv(csvFileName(title, bounds.first, bounds.last), toCsv())}
        >
          Download CSV
        </Button>
      </Box>
      <Box id={tableId} hidden={!open}>{open ? children : null}</Box>
    </Box>
  );
}

const ROWS_PER_PAGE = 25;
const numeric = { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" } as const;

/** Scrolls sideways on its own, so a phone never scrolls the page. */
type Column = { label: string, numeric?: boolean };

function DataTable({ caption, columns, children }: { caption: string, columns: Column[], children: ReactNode }) {
  return (
    <>
      {/* Outside the scroll box so it wraps; the <caption> is for screen readers. */}
      <Typography variant="body2" color="text.secondary" aria-hidden>{caption}</Typography>
      <TableContainer sx={{ overflowX: "auto" }}>
        <Table size="small" sx={{ "& th, & td": { px: { xs: 1, sm: 2 } } }}>
          <Box component="caption" sx={visuallyHidden}>{caption}</Box>
          <TableHead>
            <TableRow>
              {columns.map(({ label, numeric }) => (
                <TableCell key={label} scope="col" align={numeric ? "right" : "left"} sx={{ whiteSpace: "nowrap" }}>{label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>{children}</TableBody>
        </Table>
      </TableContainer>
    </>
  );
}

const unitText = (units: Set<string>) =>
  units.size === 1 ? `USD per ${pricingUnitLabel([...units][0])}.` : "USD per the unit in each row.";

/** A line chart's prices, one row per series and date, every series whatever the legend hides. */
export function LineDataTable({ prices, dateWindow, bounds }: { prices: ChartPrice[], dateWindow: DateWindow, bounds: DateBounds }) {
  const rows = useMemo(() => lineDataRows(prices, dateWindow), [prices, dateWindow]);
  const [page, setPage] = useState(0);
  const units = new Set(rows.map(row => row.unit));
  const isMobile = useMobile();
  // Ranges whose ends print the same say nothing; a column of them is left out.
  const hasRange = rows.some(row => distinctRange(row.range));
  const series = [...new Map(rows.map(row => [row.ndc, row.description]))].sort(([a], [b]) => a.localeCompare(b));
  const lastPage = Math.max(0, Math.ceil(rows.length / ROWS_PER_PAGE) - 1);
  const shownPage = Math.min(page, lastPage);

  const columns: Column[] = [
    { label: "Date" }, { label: "NDC" }, ...(units.size > 1 ? [{ label: "Unit" }] : []), { label: "Price", numeric: true },
    // One column on a phone, so the table needs less sideways scrolling.
    ...(!hasRange ? [] : isMobile
      ? [{ label: "Package range", numeric: true }]
      : [{ label: "Lowest package", numeric: true }, { label: "Highest package", numeric: true }]),
  ];
  const caption = `All ${series.length} series, ${formatDate(bounds.first)} – ${formatDate(bounds.last)}, newest first. ${unitText(units)}`;

  return (
    <Box sx={{ mt: 1 }}>
      <Box component="ul" sx={{ m: 0, mb: 1, pl: 0, listStyle: "none" }}>
        {series.map(([ndc, description]) => (
          <Typography component="li" variant="caption" color="text.secondary" key={ndc} sx={{ display: "block" }}>
            <Box component="span" sx={{ color: "text.primary" }}>{ndc}</Box> {description}
          </Typography>
        ))}
      </Box>
      <DataTable caption={caption} columns={columns}>
        {rows.slice(shownPage * ROWS_PER_PAGE, (shownPage + 1) * ROWS_PER_PAGE).map(row => {
          const range = distinctRange(row.range);
          return (<TableRow key={`${row.date}|${row.ndc}|${row.unit}`}>
            <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDate(row.date)}</TableCell>
            <TableCell sx={{ whiteSpace: "nowrap" }}>{row.ndc}</TableCell>
            {units.size > 1 ? <TableCell>{pricingUnitLabel(row.unit)}</TableCell> : null}
            <TableCell align="right" sx={numeric}>{formatPrice(row.price)}</TableCell>
            {!hasRange ? null : isMobile
              ? <TableCell align="right" sx={numeric}>{range ? `${formatPrice(range[0])}–${formatPrice(range[1])}` : ""}</TableCell>
              : <>
                <TableCell align="right" sx={numeric}>{range ? formatPrice(range[0]) : ""}</TableCell>
                <TableCell align="right" sx={numeric}>{range ? formatPrice(range[1]) : ""}</TableCell>
              </>}
          </TableRow>);
        })}
      </DataTable>
      {rows.length > ROWS_PER_PAGE
        ? <TablePagination
          component="div"
          count={rows.length}
          page={shownPage}
          rowsPerPage={ROWS_PER_PAGE}
          rowsPerPageOptions={[]}
          onPageChange={(_, next) => setPage(next)}
        />
        : null}
    </Box>
  );
}

/** A bar chart's rows, sorted like the chart. */
export function BarDataTable({ prices, dateWindow, barValue, bounds }: {
  prices: ChartPrice[], dateWindow: DateWindow, barValue: BarValue, bounds: DateBounds,
}) {
  const rows = barDataRows(prices, dateWindow, barValue);
  const units = new Set(rows.map(row => row.unit));
  const columns: Column[] = [
    { label: "NDC" }, ...(units.size > 1 ? [{ label: "Unit" }] : []), { label: "Latest", numeric: true },
    { label: "Latest date", numeric: true }, { label: "Average", numeric: true }, { label: "Lowest", numeric: true },
    { label: "Highest", numeric: true },
  ];
  const caption = `${rows.length} series, ${formatDate(bounds.first)} – ${formatDate(bounds.last)}, sorted by ${barValue === "latest" ? "latest" : "average"} price. `
    + `Lowest and highest are over these dates. ${unitText(units)}`;
  return (
    <Box sx={{ mt: 1 }}>
      <DataTable caption={caption} columns={columns}>
        {rows.map(row => (
          <TableRow key={`${row.ndc}|${row.unit}`}>
            <TableCell sx={{ whiteSpace: "nowrap" }}>{row.ndc}</TableCell>
            {units.size > 1 ? <TableCell>{pricingUnitLabel(row.unit)}</TableCell> : null}
            <TableCell align="right" sx={numeric}>{formatPrice(row.latest)}</TableCell>
            <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{formatDate(row.latestDate)}</TableCell>
            <TableCell align="right" sx={numeric}>{formatPrice(row.average)}</TableCell>
            <TableCell align="right" sx={numeric}>{formatPrice(row.min)}</TableCell>
            <TableCell align="right" sx={numeric}>{formatPrice(row.max)}</TableCell>
          </TableRow>
        ))}
      </DataTable>
    </Box>
  );
}
