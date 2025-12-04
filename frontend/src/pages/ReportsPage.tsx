/**
 * Reports Page
 */
import { Box, Typography, Paper, Grid } from "@mui/material";

export default function ReportsPage() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Reports & Analytics
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        gutterBottom
        sx={{ mb: 3 }}
      >
        View comprehensive reports and analytics.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Inventory Reports
            </Typography>
            <Box component="ul">
              <li>Inventory summary by location</li>
              <li>Usage reports by item</li>
              <li>Par level compliance</li>
              <li>Expiring items report</li>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Compliance Reports
            </Typography>
            <Box component="ul">
              <li>Controlled substances log</li>
              <li>Audit trail</li>
              <li>Order history</li>
              <li>User activity</li>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
