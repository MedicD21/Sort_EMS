/**
 * Orders Page
 */
import { Box, Typography, Paper } from "@mui/material";

export default function OrdersPage() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Purchase Orders
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        gutterBottom
        sx={{ mb: 3 }}
      >
        Manage purchase orders and automated ordering.
      </Typography>

      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="body1">
          Order management interface will include:
        </Typography>
        <Box component="ul" sx={{ mt: 2 }}>
          <li>Active purchase orders list</li>
          <li>Order history</li>
          <li>Create new order</li>
          <li>Receive shipments</li>
          <li>Auto-order rules configuration</li>
          <li>Vendor management</li>
        </Box>
      </Paper>
    </Box>
  );
}
