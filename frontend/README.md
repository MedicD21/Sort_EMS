# EMS Supply Tracking - Frontend

React + TypeScript frontend for the EMS Supply Tracking System.

## Quick Start

### Prerequisites

- Node.js 18+ and npm

### Installation

```powershell
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development

The development server will start at http://localhost:3000 with hot-reload enabled.

### Features

- Material-UI components
- TypeScript for type safety
- React Router for navigation
- Zustand for state management
- React Query for server state
- PWA support for offline use
- Mobile-responsive design

### Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/          # Page components
├── services/       # API services
├── stores/         # State management
├── types/          # TypeScript types
├── hooks/          # Custom React hooks
└── utils/          # Utility functions
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

- `VITE_API_URL` - Backend API URL (default: http://localhost:8000)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Material-UI** - Component library
- **React Router** - Routing
- **Zustand** - State management
- **React Query** - Server state
- **Axios** - HTTP client
