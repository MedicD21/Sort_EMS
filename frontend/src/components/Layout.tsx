/**
 * Main layout component with sidebar navigation
 */
import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Badge,
  Avatar,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  Tooltip,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Dashboard,
  Inventory,
  QrCodeScanner,
  ShoppingCart,
  Assessment,
  Settings,
  Notifications,
  Logout,
  Person,
  Category,
  LocalOffer,
  Devices,
  Assignment,
  DateRange,
  LocalShipping,
  Business,
  Autorenew,
} from "@mui/icons-material";
import { useAuthStore } from "../stores/authStore";
import { inventoryApi, ExpiringItem } from "../services/apiService";

const drawerWidth = 240;

interface NavItem {
  text: string;
  icon: React.ReactNode;
  path: string;
}

const navItems: NavItem[] = [
  { text: "Dashboard", icon: <Dashboard />, path: "/dashboard" },
  { text: "Inventory", icon: <Inventory />, path: "/inventory" },
  { text: "Item Management", icon: <Category />, path: "/items" },
  { text: "Categories", icon: <LocalOffer />, path: "/categories" },
  { text: "Asset Management", icon: <Devices />, path: "/assets" },
  { text: "Forms", icon: <Assignment />, path: "/forms" },
  {
    text: "Expiration Alerts",
    icon: <DateRange />,
    path: "/expiration-alerts",
  },
  { text: "Scanner", icon: <QrCodeScanner />, path: "/scanner" },
  { text: "Orders", icon: <ShoppingCart />, path: "/orders" },
  { text: "Vendors", icon: <Business />, path: "/vendors" },
  {
    text: "Reorder Suggestions",
    icon: <Autorenew />,
    path: "/reorder-suggestions",
  },
  { text: "Restock Orders", icon: <LocalShipping />, path: "/restock-orders" },
  { text: "Reports", icon: <Assessment />, path: "/reports" },
  { text: "Settings", icon: <Settings />, path: "/settings" },
];

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [expiringCount, setExpiringCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { user, logout } = useAuthStore();

  // Fetch expiring items count on mount and every 5 minutes
  useEffect(() => {
    const fetchExpiringCount = async () => {
      try {
        const response = await inventoryApi.expiringItems({
          days_ahead: 30,
          limit: 1000,
        });
        setExpiringCount(response.data.length);
      } catch (error) {
        console.error("Error fetching expiring items:", error);
      }
    };

    fetchExpiringCount();
    const interval = setInterval(fetchExpiringCount, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    await logout();
    navigate("/login");
  };

  const drawer = (
    <div>
      <Toolbar>
        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{ fontWeight: "bold" }}
        >
          EMS Supply
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                if (isMobile) setMobileOpen(false);
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {navItems.find((item) => item.path === location.pathname)?.text ||
              "EMS Supply Tracking"}
          </Typography>
          <Tooltip title={`${expiringCount} items expiring in next 30 days`}>
            <IconButton
              color="inherit"
              sx={{ mr: 1 }}
              onClick={() => navigate("/expiration-alerts")}
            >
              <Badge badgeContent={expiringCount} color="error">
                <Notifications />
              </Badge>
            </IconButton>
          </Tooltip>
          <IconButton onClick={handleMenuOpen} color="inherit">
            <Avatar sx={{ width: 32, height: 32, bgcolor: "secondary.main" }}>
              {user?.first_name?.[0] || "U"}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "right",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
          >
            <MenuItem disabled>
              <Person sx={{ mr: 1 }} />
              {user?.username || "User"}
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <Logout sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: "100vh",
          bgcolor: "background.default",
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
