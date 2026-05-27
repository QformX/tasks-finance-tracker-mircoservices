# 🎨 Frontend Architecture Documentation

## Overview
The frontend is a modern React-based desktop application built with TypeScript, Vite, and Tauri. It serves as the user interface for the Tasks & Finance Tracker microservices ecosystem, providing a unified platform for task management, financial tracking, and analytics.

---

## Tech Stack

### Core Framework
- **React** `19.2.0` - Latest React with Hooks and Suspense support
- **TypeScript** `~5.9.3` - Static type checking for improved code quality
- **Vite** `7.2.4` - Lightning-fast build tool and dev server
- **React Router DOM** `7.10.1` - Client-side routing

### Desktop Application
- **Tauri** `2.1.x` - Desktop app framework (Rust backend, web UI frontend)
  - `@tauri-apps/api` - Bridge between frontend and Tauri desktop APIs
  - `@tauri-apps/cli` - CLI for building and development

### Styling & UI
- **Tailwind CSS** `4.0.0-beta.1` - Utility-first CSS framework
  - `@tailwindcss/vite` - Vite plugin for optimized builds
  - `tailwind-merge` `2.5.5` - Utility for intelligently merging Tailwind classes

### Content & Formatting
- **React Markdown** `10.1.0` - Markdown rendering in React components
  - `remark-gfm` `4.0.1` - GitHub Flavored Markdown support
  - `rehype-highlight` `7.0.2` - Code syntax highlighting
  - `highlight.js` `11.11.1` - Syntax highlighting engine

### Utilities
- **clsx** `2.1.1` - Conditional CSS class utility
- **path** (Node.js) - Path resolution for module aliases

### Developer Tools
- **ESLint** `9.39.1` - Code linting
  - `eslint-plugin-react-hooks` - React hooks best practices
  - `eslint-plugin-react-refresh` - React Refresh support
  - `typescript-eslint` `8.46.4` - TypeScript linting

---

## Architectural Patterns

### 1. **State Management - Context API**
No Redux or Zustand. Instead, uses React Context for lightweight state management:

```
src/context/
├── AuthContext.tsx       # Authentication state & user session
├── LanguageContext.tsx   # i18n / language preferences
└── ThemeContext.tsx      # Dark/Light mode theme
```

**Why Context API?**
- Simpler architecture for current needs
- No external dependencies increase
- Perfect for global UI state (auth, theme, language)
- Easier to debug and maintain

### 2. **Routing - React Router**
File-based structure with centralized route definitions in `App.tsx`:

```typescript
- /              → ApiTester (Development tool)
- /chat          → AiChat (AI Assistant integration)
- /tasks         → MyTasks (Task management)
- /purchases     → Purchases (Shopping/finance)
- /categories    → Categories (Custom categories)
- /analytics     → Analytics (Data visualization)
- /settings      → Settings (App configuration)
- /profile       → Profile (User information)
- /*             → Redirect to home
```

### 3. **Component Organization**
Organized by feature with a clear separation of concerns:

```
src/components/
├── Layout.tsx                      # Main app layout wrapper
├── Sidebar.tsx                     # Left navigation menu
├── TitleBar.tsx                    # Top header bar
├── Modal.tsx                       # Base modal component
│
├── Common Components (Reusable)
├── CreateButton.tsx
├── Dropdown.tsx
├── DateHeader.tsx
├── StatCard.tsx
├── DistributionBar.tsx
├── ErrorBoundary.tsx               # Error handling boundary
│
├── Feature-Specific (Modals & Dialogs)
├── CreateTaskModal.tsx
├── CreatePurchaseModal.tsx
├── CreateCategoryModal.tsx
├── EditTaskModal.tsx
├── EditPurchaseModal.tsx
├── EditCategoryModal.tsx
├── DeleteCategoryModal.tsx
├── TaskDetailsModal.tsx
├── CriticalOverdueModal.tsx
│
├── Feature Subfolder Components
├── tasks/                          # Task-specific components
├── purchases/                      # Purchase-specific components
├── categories/                     # Category-specific components
└── analytics/                      # Analytics-specific components
```

### 4. **API Communication Layer**
Centralized API client in `src/lib/api.ts`:

```typescript
// API Endpoints
const API_BASE_URL = "http://127.0.0.1:80/api"       // Core service
const AUTH_BASE_URL = "http://127.0.0.1:80/auth"     // Users service
const ANALYTICS_BASE_URL = "http://127.0.0.1:80/stats" // Analytics service

// Authentication
- JWT tokens stored in localStorage
- Bearer token scheme in Authorization header
- Automatic token refresh on expiration
- Logout clears local state
```

**API Modules:**
- Auth APIs (login, register, refresh, getMe)
- Task APIs (CRUD operations)
- Purchase APIs (CRUD operations)
- Category APIs (CRUD operations)
- Analytics APIs (dashboard stats, events, heatmaps)

### 5. **Custom Hooks**
Encapsulates domain logic and API interactions:

```
src/hooks/
├── useTasks.ts         # Task operations (list, create, update, delete)
├── usePurchases.ts     # Purchase operations
└── useCategories.ts    # Category operations
```

Each hook provides:
- Data fetching and caching (if applicable)
- State management for operations
- Error handling
- Loading states

### 6. **Utilities & Helpers**
```
src/lib/
├── api.ts   # Central API client with authentication flow
├── utils.ts # Helper functions (date formatting, validation, etc.)
```

---

## Key Features & Solutions

### Authentication Flow
1. User logs in via Auth page
2. Backend returns `access_token` and `refresh_token`
3. Tokens stored in `localStorage`
4. `AuthContext` maintains user session
5. Protected routes check `useAuth()` hook
6. Automatic token refresh before expiration
7. Logout clears tokens and redirects to Auth page

### Type Safety
- **TypeScript** with strict mode enabled
- Central `types.ts` file defines all API models:
  - `Task`, `Purchase`, `Category`, `User`
  - `AuthResponse`, `DashboardStats`, `AnalyticsEvent`
  - Ensures consistency across components

### Styling Strategy
- **Utility-based CSS** with Tailwind
- Custom color scheme (likely in `tailwind.config.js`)
- Responsive design with mobile-first approach
- Dark/Light mode support via ThemeContext

### Error Handling
- `ErrorBoundary` component catches React errors
- API errors logged to console
- User-friendly error modals for critical issues (e.g., `CriticalOverdueModal`)

### Code Quality
- ESLint configured with React and TypeScript rules
- Build command includes TypeScript compilation check
- Import path alias `@` for cleaner imports

---

## File Structure

```
desktop/
├── package.json                 # Dependencies & scripts
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript configuration
├── tsconfig.app.json           # App TypeScript options
├── tsconfig.node.json          # Node/Vite TypeScript options
├── eslint.config.js            # ESLint rules
├── index.html                  # Entry HTML
├── public/                     # Static assets
├── src/
│   ├── main.tsx                # React app entry point
│   ├── App.tsx                 # Root component & routes
│   ├── App.css                 # Root styles
│   ├── index.css               # Global styles
│   ├── types.ts                # TypeScript interfaces & types
│   ├── context/                # Context providers
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utilities & API client
│   ├── components/             # React components
│   ├── pages/                  # Page components (one per route)
│   ├── assets/                 # Images, fonts, etc.
├── src-tauri/                  # Tauri desktop integration
│   ├── src/
│   │   ├── main.rs             # Rust entry point
│   │   ├── lib.rs
│   ├── Cargo.toml              # Rust dependencies
│   ├── tauri.conf.json         # Tauri configuration
└── target/                     # Build output directory
```

---

## Development Workflow

### Setup & Installation
```bash
cd desktop
npm install
```

### Development Server
```bash
npm run dev
# Starts Vite dev server with hot module replacement
# Runs on http://localhost:5173 (typical Vite default)
```

### Building
```bash
npm run build
# Runs TypeScript type checking + Vite build
# Outputs to dist/ folder
```

### Linting
```bash
npm run lint
# Runs ESLint on all files
```

### Preview Built App
```bash
npm run preview
# Runs production build preview locally
```

### Desktop Build (Tauri)
```bash
npm run tauri build
# Builds desktop executable using Tauri
```

---

## Integration with Backend

### API Gateway (Nginx)
All requests route through Nginx at `http://127.0.0.1:80`:
- `/auth/*` → Users service (authentication)
- `/api/*` → Core service (tasks, purchases, categories)
- `/stats/*` → Analytics service (dashboard, events)

### Real-Time Features
- Potential for WebSocket integration via RabbitMQ (event-driven)
- Currently: polling-based data updates
- Future: implement real-time listeners

### Data Flow
```
User Interaction
    ↓
Component Event Handler
    ↓
Custom Hook (useTasks, usePurchases, etc.)
    ↓
API Client (lib/api.ts)
    ↓
HTTP Request → Nginx Gateway
    ↓
Backend Microservice (Auth/Core/Analytics)
    ↓
Response → Context Update
    ↓
Component Re-render
```

---

## Performance Considerations

### Code Splitting
- Vite automatically chunks code for faster loading
- React Router enables lazy loading of page components

### Caching
- `localStorage` for tokens and user preferences
- API responses could be cached with React Query/SWR (future enhancement)

### Build Optimization
- Tailwind CSS purges unused styles
- TypeScript compilation ensures no runtime errors
- ESLint prevents common bugs

### Asset Optimization
- Images optimized via Tauri/Vite
- Markdown rendering lazy-loaded (for AiChat page)

---

## Security

### Authentication
- JWT tokens with Bearer scheme
- Tokens stored in `localStorage` (consider httpOnly cookies for production)
- Automatic re-authentication on token expiration
- Clear token cleanup on logout

### CORS
- Requests to `http://127.0.0.1:80` (local dev)
- Production: update base URLs for deployed backend

### Type Safety
- TypeScript prevents many common security issues
- Type checking at build time

---

## Future Enhancements

### Recommended Improvements
1. **State Management**: Consider Redux Toolkit or Zustand for complex flows
2. **Real-Time Updates**: Implement WebSocket for live task/purchase updates
3. **Caching**: Add React Query for efficient API data management
4. **Testing**: Add Jest + React Testing Library for unit & component tests
5. **Offline Support**: Implement service workers for offline-first capability
6. **Analytics**: Integrate Posthog or Mixpanel for user behavior tracking
7. **PWA**: Make it installable as a web app
8. **Dark Mode**: Expand theme options and persistence
9. **Accessibility**: Audit WCAG compliance and add ARIA labels
10. **Internationalization**: Leverage LanguageContext for full i18n support

---

## Key Files to Know

| File | Purpose |
|------|---------|
| [App.tsx](../desktop/src/App.tsx) | Root component with routing setup |
| [AuthContext.tsx](../desktop/src/context/AuthContext.tsx) | Authentication state & user session |
| [api.ts](../desktop/src/lib/api.ts) | Centralized API client & requests |
| [types.ts](../desktop/src/types.ts) | TypeScript type definitions |
| [Layout.tsx](../desktop/src/components/Layout.tsx) | Main app layout wrapper |
| [vite.config.ts](../desktop/vite.config.ts) | Build tool configuration |
| [package.json](../desktop/package.json) | Project dependencies |

---

## Summary

The frontend is built as a **modular, type-safe React application** with:
- ✅ Modern tooling (Vite, TypeScript, ESLint)
- ✅ Clean architecture (Context API, custom hooks, feature-based organization)
- ✅ Desktop integration (Tauri for native app experience)
- ✅ Responsive UI (Tailwind CSS with dark mode)
- ✅ Secure authentication (JWT with refresh tokens)
- ✅ Extensible design (easy to add new features)

It communicates seamlessly with the backend microservices through a centralized API client and maintains type safety throughout the application lifecycle.
