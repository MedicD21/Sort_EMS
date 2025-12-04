# Node.js & npm Installation Guide

## 🎯 Quick Start

**Download Node.js**: https://nodejs.org

Choose the **LTS (Long Term Support)** version - currently v20.x or v22.x

## 📥 Step-by-Step Installation

### Step 1: Download Node.js

1. Go to https://nodejs.org
2. Click the **LTS** button (recommended for most users)
3. Download will start automatically (Windows Installer .msi)

### Step 2: Run Installer

1. Double-click the downloaded `.msi` file
2. Click **Next** through the setup wizard
3. **Accept** the license agreement
4. Use default installation path: `C:\Program Files\nodejs\`
5. **IMPORTANT**: Make sure these are checked:
   - ✅ Node.js runtime
   - ✅ npm package manager
   - ✅ Add to PATH
6. Click **Next** → **Install**
7. Click **Finish** when complete

### Step 3: Verify Installation

**IMPORTANT**: Close and reopen PowerShell after installation!

```powershell
# Restart PowerShell, then check versions
node --version
# Should show: v20.x.x or v22.x.x

npm --version
# Should show: 10.x.x or higher
```

If commands not found, restart your computer.

### Step 4: Install Frontend Dependencies

```powershell
# Navigate to frontend folder
cd c:\Users\DScha\OneDrive\Desktop\Sort_EMS\frontend

# Install all dependencies (will take 2-3 minutes)
npm install

# This installs:
# - React 18
# - TypeScript
# - Material-UI
# - Vite
# - And 200+ other packages
```

You'll see a `node_modules` folder created (about 200MB).

### Step 5: Verify Frontend Setup

```powershell
# Still in frontend folder
npm run dev
```

You should see:

```
  VITE v5.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Open http://localhost:5173/ in your browser!

Press `Ctrl+C` to stop the dev server.

## 🔧 Troubleshooting

### "node is not recognized"

**Solution**:

1. Close PowerShell completely
2. Reopen PowerShell
3. Try again
4. If still not working, restart your computer

### "npm install" fails with permission errors

**Solution**:

```powershell
# Run PowerShell as Administrator
# Right-click PowerShell → Run as Administrator

cd c:\Users\DScha\OneDrive\Desktop\Sort_EMS\frontend
npm install
```

### "ENOENT: no such file or directory"

**Solution**:

```powershell
# Make sure you're in the frontend folder
cd c:\Users\DScha\OneDrive\Desktop\Sort_EMS\frontend
pwd  # Should show: ...\Sort_EMS\frontend

npm install
```

### npm install is very slow

This is normal! Installing 200+ packages takes time:

- **First time**: 2-5 minutes
- **Fast internet**: ~2 minutes
- **Slow internet**: ~10 minutes

You'll see progress like:

```
⠙ reify:@mui/material: timing reifyNode:node_modules/@mui/system ...
```

### Antivirus blocking npm

Some antivirus software blocks npm. Temporarily disable or add exception for:

- `C:\Program Files\nodejs\`
- `C:\Users\DScha\OneDrive\Desktop\Sort_EMS\frontend\node_modules\`

## 📦 What npm install Does

When you run `npm install` in the frontend folder:

1. Reads `package.json` (lists required packages)
2. Downloads all packages from npm registry
3. Creates `node_modules` folder (~200MB, 40,000+ files)
4. Creates `package-lock.json` (locks exact versions)

**Files created**:

```
frontend/
├── node_modules/          ← 200MB folder (DO NOT COMMIT TO GIT!)
├── package-lock.json      ← Auto-generated (COMMIT THIS)
├── package.json           ← Already exists
└── ... (your code)
```

## 🚀 Running the Frontend

### Development Server (Hot Reload)

```powershell
cd frontend
npm run dev
```

- Opens at: http://localhost:5173/
- Auto-refreshes when you edit files
- Fastest for development

### Build for Production

```powershell
cd frontend
npm run build
```

- Creates optimized `dist/` folder
- Minified JavaScript/CSS
- Ready for deployment

### Preview Production Build

```powershell
cd frontend
npm run preview
```

- Tests the production build locally
- Opens at: http://localhost:4173/

## 📝 Common npm Commands

```powershell
# Install dependencies
npm install

# Add a new package
npm install package-name

# Add a dev dependency
npm install --save-dev package-name

# Remove a package
npm uninstall package-name

# Update all packages
npm update

# Check for outdated packages
npm outdated

# Clean install (deletes node_modules first)
rm -r node_modules
npm install

# Run scripts from package.json
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run linter (if configured)
```

## 🎯 Next Steps After Installation

### 1. Start Frontend Development Server

```powershell
cd c:\Users\DScha\OneDrive\Desktop\Sort_EMS\frontend
npm run dev
```

Open http://localhost:5173/ - you'll see the login page!

### 2. Start Backend (Separate Terminal)

```powershell
cd c:\Users\DScha\OneDrive\Desktop\Sort_EMS\backend

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Start FastAPI server (once we add routes)
uvicorn main:app --reload
```

Backend will run at: http://localhost:8000

### 3. Full Stack Running

When both are running:

- **Frontend**: http://localhost:5173/ (React app)
- **Backend**: http://localhost:8000 (FastAPI)
- **API Docs**: http://localhost:8000/docs (auto-generated)

Frontend proxies API requests to backend automatically!

## ⚠️ Important Notes

### DO NOT Commit node_modules!

The `.gitignore` file already excludes it:

```
node_modules/
```

**Why?**

- 200MB folder with 40,000+ files
- Makes git extremely slow
- Can be recreated with `npm install`

### DO Commit:

- ✅ `package.json` (dependency list)
- ✅ `package-lock.json` (exact versions)
- ✅ Your source code

### When Team Members Clone:

They just run:

```powershell
cd frontend
npm install
```

npm reads `package.json` and `package-lock.json` to install the exact same versions!

## 🔐 Security Notes

### Keep Node.js Updated

Check for updates monthly:

1. Go to https://nodejs.org
2. Compare your version: `node --version`
3. Download new LTS version if available

### Audit Dependencies

```powershell
# Check for security vulnerabilities
npm audit

# Fix vulnerabilities automatically
npm audit fix

# Fix with breaking changes (careful!)
npm audit fix --force
```

## 📊 System Requirements

**Minimum**:

- Windows 10 or later
- 4GB RAM
- 2GB free disk space

**Recommended**:

- Windows 10/11
- 8GB+ RAM
- SSD storage

## ✅ Installation Checklist

- [ ] Node.js downloaded from https://nodejs.org
- [ ] LTS version selected (v20.x or v22.x)
- [ ] Installer completed successfully
- [ ] PowerShell restarted
- [ ] `node --version` shows version
- [ ] `npm --version` shows version
- [ ] Navigated to frontend folder
- [ ] `npm install` completed successfully
- [ ] `node_modules` folder created
- [ ] `npm run dev` starts successfully
- [ ] http://localhost:5173/ shows login page

## 🎉 Success!

You now have:

- ✅ Node.js runtime installed
- ✅ npm package manager ready
- ✅ Frontend dependencies installed
- ✅ Development server running

**Your EMS Supply Tracking System frontend is live!**

## 🆘 Still Having Issues?

Common fixes:

1. **Restart computer** (fixes 80% of PATH issues)
2. **Run as Administrator** (fixes permission issues)
3. **Check antivirus** (might be blocking npm)
4. **Clear npm cache**: `npm cache clean --force`
5. **Reinstall Node.js** (uninstall first, then reinstall)

If nothing works, paste the exact error message and I'll help debug!

## 📚 Learning Resources

- **Node.js Docs**: https://nodejs.org/docs
- **npm Docs**: https://docs.npmjs.com
- **Vite Guide**: https://vitejs.dev/guide
- **React Docs**: https://react.dev

## 🔄 Updating Node.js Later

When a new LTS version comes out:

1. Download new version from https://nodejs.org
2. Run installer (it will upgrade automatically)
3. Restart PowerShell
4. Verify: `node --version`
5. Rebuild: `npm rebuild` in frontend folder

Your projects will continue working!
