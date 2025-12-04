/**
 * Scanner Page
 */
import { Box, Typography, Paper, Button } from "@mui/material";
import { QrCodeScanner } from "@mui/icons-material";

export default function ScannerPage() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        RFID/QR Scanner
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        gutterBottom
        sx={{ mb: 3 }}
      >
        Scan items to track, transfer, or update inventory.
      </Typography>

      <Paper elevation={2} sx={{ p: 3, textAlign: "center" }}>
        <QrCodeScanner sx={{ fontSize: 120, color: "primary.main", mb: 3 }} />
        <Typography variant="h6" gutterBottom>
          Scanner Interface
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Scanner functionality will be implemented here with:
        </Typography>
        <Box
          component="ul"
          sx={{ textAlign: "left", display: "inline-block", mb: 3 }}
        >
          <li>Camera-based QR code scanning</li>
          <li>RFID reader integration</li>
          <li>Batch scanning support</li>
          <li>Scan history</li>
          <li>Quick actions after scan</li>
        </Box>
        <Box>
          <Button
            variant="contained"
            size="large"
            startIcon={<QrCodeScanner />}
          >
            Start Scanning
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
