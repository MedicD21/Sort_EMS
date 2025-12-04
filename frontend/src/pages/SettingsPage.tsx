/**
 * Settings Page
 */
import { Box, Typography, Paper, Tabs, Tab } from "@mui/material";
import { useState } from "react";

export default function SettingsPage() {
  const [tabValue, setTabValue] = useState(0);

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Settings
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        gutterBottom
        sx={{ mb: 3 }}
      >
        Configure system settings and preferences.
      </Typography>

      <Paper elevation={2}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="Profile" />
          <Tab label="Locations" />
          <Tab label="Par Levels" />
          <Tab label="Users" />
          <Tab label="System" />
        </Tabs>
        <Box sx={{ p: 3 }}>
          <Typography variant="body1">
            Settings interface will include:
          </Typography>
          <Box component="ul" sx={{ mt: 2 }}>
            <li>User profile management</li>
            <li>Location configuration</li>
            <li>Par level settings</li>
            <li>User management (admin only)</li>
            <li>System preferences</li>
            <li>Notification settings</li>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
