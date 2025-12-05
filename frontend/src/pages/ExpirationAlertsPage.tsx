/**
 * Expiration Alerts Page
 * Shows items expiring soon and already expired
 */
import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Chip,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from "@mui/material";
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
} from "@mui/icons-material";
import { inventoryApi, ExpiringItem } from "../services/apiService";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function ExpirationAlertsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [expiringItems, setExpiringItems] = useState<ExpiringItem[]>([]);
  const [expiredItems, setExpiredItems] = useState<ExpiringItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [daysAhead, setDaysAhead] = useState(30);

  useEffect(() => {
    fetchExpiringItems();
    fetchExpiredItems();
  }, [daysAhead]);

  const fetchExpiringItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await inventoryApi.expiringItems({
        days_ahead: daysAhead,
        limit: 1000,
      });
      setExpiringItems(response.data);
    } catch (err: any) {
      console.error("Error fetching expiring items:", err);
      setError(err.response?.data?.detail || "Failed to load expiring items");
    } finally {
      setLoading(false);
    }
  };

  const fetchExpiredItems = async () => {
    try {
      const response = await inventoryApi.expiredItems({ limit: 1000 });
      setExpiredItems(response.data);
    } catch (err: any) {
      console.error("Error fetching expired items:", err);
    }
  };

  const getExpirationChip = (daysUntil: number) => {
    if (daysUntil < 0) {
      return (
        <Chip
          icon={<ErrorIcon />}
          label={`Expired ${Math.abs(daysUntil)} days ago`}
          color="error"
          size="small"
        />
      );
    } else if (daysUntil <= 7) {
      return (
        <Chip
          icon={<WarningIcon />}
          label={`${daysUntil} days`}
          color="error"
          size="small"
        />
      );
    } else if (daysUntil <= 14) {
      return (
        <Chip
          icon={<WarningIcon />}
          label={`${daysUntil} days`}
          color="warning"
          size="small"
        />
      );
    } else {
      return <Chip label={`${daysUntil} days`} color="info" size="small" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold" }}>
        Expiration Alerts
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Track items expiring soon and manage expired inventory
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={tabValue}
            onChange={(_, newValue) => setTabValue(newValue)}
          >
            <Tab
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  Expiring Soon
                  <Chip
                    label={expiringItems.length}
                    size="small"
                    color="warning"
                  />
                </Box>
              }
            />
            <Tab
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  Expired
                  <Chip
                    label={expiredItems.length}
                    size="small"
                    color="error"
                  />
                </Box>
              }
            />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={2} sx={{ mb: 2, px: 2 }}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Look Ahead</InputLabel>
                <Select
                  value={daysAhead}
                  label="Look Ahead"
                  onChange={(e) => setDaysAhead(Number(e.target.value))}
                >
                  <MenuItem value={7}>7 Days</MenuItem>
                  <MenuItem value={14}>14 Days</MenuItem>
                  <MenuItem value={30}>30 Days</MenuItem>
                  <MenuItem value={60}>60 Days</MenuItem>
                  <MenuItem value={90}>90 Days</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress />
            </Box>
          ) : expiringItems.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Typography color="text.secondary">
                No items expiring in the next {daysAhead} days
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>RFID Tag</TableCell>
                    <TableCell>Lot Number</TableCell>
                    <TableCell>Expiration Date</TableCell>
                    <TableCell>Days Until Expiration</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {expiringItems.map((item) => (
                    <TableRow
                      key={item.id}
                      sx={{
                        backgroundColor:
                          item.days_until_expiration <= 7
                            ? "rgba(211, 47, 47, 0.08)"
                            : item.days_until_expiration <= 14
                            ? "rgba(237, 108, 2, 0.08)"
                            : "inherit",
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {item.item_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.item_code}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={item.category_name} size="small" />
                      </TableCell>
                      <TableCell>{item.location_name}</TableCell>
                      <TableCell>
                        <Typography
                          variant="caption"
                          sx={{ fontFamily: "monospace" }}
                        >
                          {item.rfid_tag}
                        </Typography>
                      </TableCell>
                      <TableCell>{item.lot_number || "-"}</TableCell>
                      <TableCell>{formatDate(item.expiration_date)}</TableCell>
                      <TableCell>
                        {getExpirationChip(item.days_until_expiration)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress />
            </Box>
          ) : expiredItems.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Typography color="text.secondary">
                No expired items found
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>RFID Tag</TableCell>
                    <TableCell>Lot Number</TableCell>
                    <TableCell>Expiration Date</TableCell>
                    <TableCell>Days Expired</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {expiredItems.map((item) => (
                    <TableRow
                      key={item.id}
                      sx={{
                        backgroundColor: "rgba(211, 47, 47, 0.08)",
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {item.item_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.item_code}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={item.category_name} size="small" />
                      </TableCell>
                      <TableCell>{item.location_name}</TableCell>
                      <TableCell>
                        <Typography
                          variant="caption"
                          sx={{ fontFamily: "monospace" }}
                        >
                          {item.rfid_tag}
                        </Typography>
                      </TableCell>
                      <TableCell>{item.lot_number || "-"}</TableCell>
                      <TableCell>{formatDate(item.expiration_date)}</TableCell>
                      <TableCell>
                        {getExpirationChip(item.days_until_expiration)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>
      </Paper>
    </Box>
  );
}
