# GitHub Setup Guide

## 📋 Prerequisites

1. **Git installed** - Download from https://git-scm.com/downloads
2. **GitHub account** - Create at https://github.com
3. **Node.js installed** - Download from https://nodejs.org

## 🚀 Step-by-Step GitHub Setup

### Step 1: Install Git (if not already installed)

Download and install Git from: https://git-scm.com/downloads

Verify installation:

```powershell
git --version
```

### Step 2: Configure Git (First Time Only)

```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### Step 3: Initialize Git Repository

```powershell
cd c:\Users\DScha\OneDrive\Desktop\Sort_EMS

# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: EMS Supply Tracking System"
```

### Step 4: Create GitHub Repository

1. Go to https://github.com
2. Click the **"+"** icon in the top right
3. Select **"New repository"**
4. Fill in the details:
   - **Repository name**: `Sort_EMS` (or your preferred name)
   - **Description**: "EMS Supply Tracking System with RFID integration"
   - **Visibility**: Choose **Private** (recommended) or Public
   - **DO NOT** check "Initialize with README" (we already have one)
5. Click **"Create repository"**

### Step 5: Connect Local Repository to GitHub

GitHub will show you commands. Use these (replace `YOUR_USERNAME` with your GitHub username):

```powershell
# Add GitHub as remote
git remote add origin https://github.com/YOUR_USERNAME/Sort_EMS.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

**If you get authentication errors**, you need to set up authentication:

#### Option A: Personal Access Token (Recommended)

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a name: "Sort_EMS Development"
4. Select scopes: `repo` (all repo permissions)
5. Click "Generate token"
6. **COPY THE TOKEN** (you won't see it again!)
7. When git asks for password, use the token instead

#### Option B: SSH Key

```powershell
# Generate SSH key
ssh-keygen -t ed25519 -C "your.email@example.com"

# Copy the public key
cat ~/.ssh/id_ed25519.pub

# Add to GitHub: Settings → SSH and GPG keys → New SSH key
```

Then use SSH URL:

```powershell
git remote set-url origin git@github.com:YOUR_USERNAME/Sort_EMS.git
git push -u origin main
```

### Step 6: Verify Upload

1. Go to your GitHub repository in the browser
2. You should see all your files!
3. Check that README.md displays correctly

## 📝 Daily Git Workflow

### Making Changes

```powershell
# Check status
git status

# Add changed files
git add .

# Commit changes
git commit -m "feat: add authentication API endpoints"

# Push to GitHub
git push
```

### Viewing History

```powershell
# See commit history
git log --oneline

# See what changed
git diff
```

### Creating Branches

```powershell
# Create and switch to new branch
git checkout -b feature/scanner-implementation

# Work on your feature...
git add .
git commit -m "feat: implement RFID scanner"

# Push branch to GitHub
git push -u origin feature/scanner-implementation

# Switch back to main
git checkout main

# Merge branch (if ready)
git merge feature/scanner-implementation
```

## 🔧 Useful Git Commands

```powershell
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard local changes
git checkout -- filename.py

# Pull latest changes from GitHub
git pull

# See all branches
git branch -a

# Delete branch
git branch -d branch-name

# Stash changes temporarily
git stash
git stash pop
```

## 📦 .gitignore

The `.gitignore` file is already set up to exclude:

- Virtual environments (.venv)
- node_modules
- Environment files (.env)
- Database files
- IDE settings
- Build artifacts
- Sensitive data

## ⚠️ Important Notes

### DO NOT Commit:

- ❌ `.env` files (contains passwords!)
- ❌ `node_modules/` folder
- ❌ Virtual environment folders
- ❌ Database files
- ❌ Personal access tokens
- ❌ API keys or secrets

### DO Commit:

- ✅ `.env.example` files (templates)
- ✅ Source code
- ✅ Documentation
- ✅ Configuration files
- ✅ requirements.txt / package.json

## 🔐 Security Best Practices

1. **Use Private Repository** for sensitive projects
2. **Never commit .env files** - they contain passwords!
3. **Review changes before committing**:
   ```powershell
   git diff
   git status
   ```
4. **Use .gitignore properly** - already configured!
5. **Rotate secrets** if accidentally committed

### If You Accidentally Commit Secrets:

```powershell
# Remove from git history (last commit)
git reset --soft HEAD~1
git reset HEAD .env
git commit -m "Remove sensitive file"
git push --force

# Change all passwords/tokens immediately!
```

## 🌿 Branching Strategy

For team development:

```
main (production-ready)
  ↓
develop (integration branch)
  ↓
feature/authentication
feature/scanner
feature/reports
```

## 📞 Getting Help

```powershell
# Git help
git help
git help <command>

# Example
git help commit
```

## 🎯 Quick Setup Script

Copy and run this (replace YOUR_USERNAME and YOUR_EMAIL):

```powershell
# Configure git
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Navigate to project
cd c:\Users\DScha\OneDrive\Desktop\Sort_EMS

# Initialize and commit
git init
git add .
git commit -m "Initial commit: EMS Supply Tracking System"

# Connect to GitHub (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/Sort_EMS.git
git branch -M main
git push -u origin main
```

## ✅ Verification Checklist

- [ ] Git installed and configured
- [ ] GitHub repository created
- [ ] Local repository initialized
- [ ] All files committed
- [ ] Remote repository connected
- [ ] Code pushed to GitHub
- [ ] README displays correctly on GitHub
- [ ] .gitignore working (no .env files uploaded!)

## 🎉 Success!

Your project is now on GitHub! You can:

- Share the repository URL with team members
- Track changes over time
- Collaborate with others
- Back up your code automatically

**Next Steps:**

1. Install Node.js from https://nodejs.org
2. Run `npm install` in the frontend folder
3. Start building features!
