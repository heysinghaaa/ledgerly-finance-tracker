import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export function LedgerlyMark({ small = false }: { small?: boolean }) {
  return (
    <Box
      aria-hidden="true"
      className={`ledgerly-mark${small ? " small" : ""}`}
      component="span"
    >
      <Box className="ledgerly-mark-stem" component="span" />
      <Box className="ledgerly-mark-joint" component="span" />
      <Box className="ledgerly-mark-foot" component="span" />
    </Box>
  );
}

export function LedgerlyBrand({ subtitle }: { subtitle?: string }) {
  return (
    <Box className="ledgerly-brand" component="span">
      <LedgerlyMark />
      <Box className="brand-copy" component="span">
        <Typography className="ledgerly-wordmark" component="strong">
          Ledgerly
        </Typography>
        {subtitle && (
          <Typography component="small">
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
