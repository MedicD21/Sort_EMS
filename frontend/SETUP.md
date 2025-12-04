# Frontend Setup Guide

## 🚀 Getting the Frontend Running

### Step 1: Install Node.js

The frontend requires Node.js to run. Download and install from:
**https://nodejs.org/** (Download the LTS version - currently 20.x)

After installation, verify by running:

```powershell
node --version
npm --version
```

### Step 2: Install Dependencies

```powershell
cd c:\Users\DScha\OneDrive\Desktop\Sort_EMS\frontend
npm install
```

This will install all required packages including:

- React 18
- TypeScript
- Material-UI
- React Router
- Axios
- And more...

### Step 3: Start the Development Server

```powershell
npm run dev
```

The frontend will be available at **http://localhost:3000**

### Step 4: Access the Application

1. Open your browser to http://localhost:3000
2. You'll see the login page
3. Use the demo credentials:
   - Username: `admin`
   - Password: `ChangeMe123!`

**Note:** The backend API must be running on http://localhost:8000 for login to work.

## 📱 What You'll See

### Login Page

- Clean, professional login interface
- Demo credentials shown for easy access
- Mobile-responsive design

### Dashboard

- Overview stats (Total Items, Low Stock, Expiring Soon, etc.)
- Activity feed placeholder
- Quick actions
- Low stock alerts

### Navigation

- **Dashboard** - Main overview
- **Inventory** - Item management
- **Scanner** - RFID/QR scanning
- **Orders** - Purchase orders
- **Reports** - Analytics
- **Settings** - Configuration

All navigation is mobile-responsive with a collapsible sidebar.

## 🔧 Development Features

### Hot Reload

Changes to code are automatically reflected in the browser.

### TypeScript

Full type safety throughout the application.

### Material-UI

Professional, accessible components out of the box.

### PWA Support

Can be installed on mobile devices as an app.

## 📦 Build for Production

```powershell
npm run build
```

This creates an optimized production build in the `dist/` folder.

## 🎨 Customization

### Theme

Edit `src/App.tsx` to customize colors, fonts, and styling.

### Logo

Replace icons in `public/` folder.

### API URL

Edit `.env` file to change backend URL.

## 📝 Next Steps

The frontend is ready! Now we need to:

1. **Build the Backend APIs** - Currently, the login will fail because the backend endpoints don't exist yet.
2. **Connect Real Data** - Replace placeholder data with API calls.
3. **Add More Features** - Implement scanner, reports, etc.

## 🐛 Troubleshooting

**Port 3000 already in use?**

```powershell
# Edit vite.config.ts and change the port number
```

**npm install fails?**

```powershell
# Clear cache and try again
npm cache clean --force
npm install
```

**"Cannot find module" errors?**

```powershell
# Reinstall dependencies
rm -rf node_modules
rm package-lock.json
npm install
```

## 📚 Learn More

- [React Documentation](https://react.dev)
- [Material-UI](https://mui.com)
- [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vitejs.dev)
