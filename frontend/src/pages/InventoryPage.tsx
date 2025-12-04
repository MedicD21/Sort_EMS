/**
 * Inventory Page
 */
import { Box, Typography, Paper } from "@mui/material";

export default function InventoryPage() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Inventory Management
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        gutterBottom
        sx={{ mb: 3 }}
      >
        View and manage your inventory across all locations.
      </Typography>

      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="body1">
          Inventory management interface will be built here with:
        </Typography>
        <Box component="ul" sx={{ mt: 2 }}>
          <li>Item list with search and filters</li>
          <li>Location-based inventory view</li>
          <li>Par level indicators</li>
          <li>Quick actions (scan, transfer, adjust)</li>
          <li>Inventory details and history</li>
        </Box>
      </Paper>
    </Box>
  );
}
