import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
} from '@mui/material';


export default function EliquisTable() {
  const rows = [
    {
      proprietaryName: 'ELIQUIS',
      ndc: '0003-0893-21',
      productNdc: '0003-0893',
      packageCode: '21',
      strength: '2.5 mg/1',
      packageDescription: '60 TABLET, FILM COATED in 1 BOTTLE, PLASTIC',
    },
    {
      proprietaryName: 'ELIQUIS',
      ndc: '0003-0893-91',
      productNdc: '0003-0893',
      packageCode: '91',
      strength: '5 mg/1',
      packageDescription:
        '1 BLISTER PACK in 1 CARTON (0003-0893-91) / 14 TABLET, FILM COATED in 1 BLISTER PACK',
    },
    {
      proprietaryName: 'ELIQUIS',
      ndc: '0003-0894-21',
      productNdc: '0003-0894',
      packageCode: '21',
      strength: '5 mg/1',
      packageDescription: '60 TABLET, FILM COATED in 1 BOTTLE, PLASTIC',
    },
    {
      proprietaryName: 'ELIQUIS',
      ndc: '0003-1028-28',
      productNdc: '0003-1028',
      packageCode: '28',
      strength: '.5 mg/1',
      packageDescription:
        '28 PACKET in 1 CARTON (0003-1028-28) / 1 TABLET, FOR SUSPENSION in 1 PACKET',
    },
  ];

  return (
    <TableContainer component={Paper}>
      <Table aria-label="Eliquis drug package examples" size="small">
        <TableHead>
          <TableRow>
            <TableCell>Proprietary Name</TableCell>
            <TableCell>NDC</TableCell>
            <TableCell>Product NDC</TableCell>
            <TableCell>Package Code</TableCell>
            <TableCell>Strength</TableCell>
            <TableCell>Package Description</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.ndc} hover>
              <TableCell>{row.proprietaryName}</TableCell>
              <TableCell component="th" scope="row">
                {row.ndc}
              </TableCell>
              <TableCell>{row.productNdc}</TableCell>
              <TableCell>{row.packageCode}</TableCell>
              <TableCell>{row.strength}</TableCell>
              <TableCell>{row.packageDescription}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
