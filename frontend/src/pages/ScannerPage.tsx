/**
 * Scanner Page
 */
import { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  Alert,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material";
import { QrCodeScanner, CheckCircle, Error } from "@mui/icons-material";
import { rfidApi, RFIDScanResult } from "../services/apiService";

export default function ScannerPage() {
  const [rfidTag, setRfidTag] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<RFIDScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<RFIDScanResult[]>([]);

  const handleScan = async () => {
    if (!rfidTag.trim()) {
      setError("Please enter an RFID tag");
      return;
    }

    try {
      setScanning(true);
      setError(null);

      const response = await rfidApi.scan(rfidTag.trim());
      setScanResult(response.data);
      setScanHistory((prev) => [response.data, ...prev.slice(0, 9)]);
      setRfidTag("");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to scan RFID tag");
      setScanResult(null);
      console.error("Error scanning RFID:", err);
    } finally {
      setScanning(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleScan();
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        RFID Scanner
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        gutterBottom
        sx={{ mb: 3 }}
      >
        Scan RFID tags to track and update inventory items.
      </Typography>

      <Grid container spacing={3}>
        {/* Scanner Input */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Box sx={{ textAlign: "center", mb: 3 }}>
              <QrCodeScanner
                sx={{ fontSize: 80, color: "primary.main", mb: 2 }}
              />
              <Typography variant="h6" gutterBottom>
                Zebra TC22/TC27 Scanner
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Enter or scan RFID tag
              </Typography>
            </Box>

            <TextField
              fullWidth
              label="RFID Tag"
              value={rfidTag}
              onChange={(e) => setRfidTag(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Scan or enter RFID tag..."
              disabled={scanning}
              autoFocus
              sx={{ mb: 2 }}
            />

            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={
                scanning ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <QrCodeScanner />
                )
              }
              onClick={handleScan}
              disabled={scanning || !rfidTag.trim()}
            >
              {scanning ? "Scanning..." : "Scan Item"}
            </Button>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Paper>
        </Grid>

        {/* Scan Result */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, minHeight: 400 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Scan Result
            </Typography>

            {scanResult ? (
              <Box sx={{ mt: 2 }}>
                <Card
                  variant="outlined"
                  sx={{
                    bgcolor: scanResult.item ? "success.light" : "error.light",
                    borderColor: scanResult.item
                      ? "success.main"
                      : "error.main",
                    mb: 2,
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        mb: 2,
                      }}
                    >
                      {scanResult.item ? (
                        <CheckCircle
                          sx={{ color: "success.dark", mr: 1, fontSize: 32 }}
                        />
                      ) : (
                        <Error
                          sx={{ color: "error.dark", mr: 1, fontSize: 32 }}
                        />
                      )}
                      <Typography variant="h6">
                        {scanResult.item ? "Item Found" : "Not Found"}
                      </Typography>
                    </Box>

                    {scanResult.item ? (
                      <Box>
                        <Typography
                          variant="body1"
                          fontWeight="bold"
                          gutterBottom
                        >
                          {scanResult.item.name}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Category: {scanResult.item.category}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          SKU: {scanResult.item.sku || "N/A"}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Location: {scanResult.item.location || "Unknown"}
                        </Typography>
                        <Divider sx={{ my: 2 }} />
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Quantity
                            </Typography>
                            <Typography variant="h6">
                              {scanResult.item.quantity}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Unit Price
                            </Typography>
                            <Typography variant="h6">
                              $
                              {scanResult.item.unit_price?.toFixed(2) || "0.00"}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        RFID tag "{scanResult.rfid_tag}" not found in inventory.
                      </Typography>
                    )}
                  </CardContent>
                </Card>

                <Typography variant="caption" color="text.secondary">
                  Scanned at: {new Date(scanResult.scanned_at).toLocaleString()}
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 300,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Scan an RFID tag to view details
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Scan History */}
        {scanHistory.length > 0 && (
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Recent Scans
              </Typography>
              <List>
                {scanHistory.map((scan, index) => (
                  <Box key={index}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Typography variant="body1">
                              {scan.item?.name || scan.rfid_tag}
                            </Typography>
                            <Chip
                              label={scan.item ? "Found" : "Not Found"}
                              color={scan.item ? "success" : "error"}
                              size="small"
                            />
                          </Box>
                        }
                        secondary={new Date(scan.scanned_at).toLocaleString()}
                      />
                    </ListItem>
                    {index < scanHistory.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
