# WireGuard Configuration Manager

A web application that streamlines the distribution of pre-generated WireGuard VPN configuration files within a company. The system enables employees to self-service download their configurations while providing administrators with control over user device limits, comprehensive audit trails, and an intuitive management panel.

## Table of Contents

- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Getting Started Locally](#getting-started-locally)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

## Project Description

WireGuard Configuration Manager solves the problem of manual VPN configuration distribution by automating the process and providing a centralized management system. Instead of administrators manually handing out `.conf` files and maintaining ad-hoc spreadsheets, the application provides:

- **Self-service configuration distribution**: Employees can claim and download their WireGuard configurations independently
- **Administrative control**: Admins can manage user limits, assign configurations manually, and monitor all activities
- **Complete audit trail**: All operations (login, claim, download, revoke, etc.) are logged for compliance and security
- **Secure access control**: Role-based access ensures users can only access their own configurations
- **Domain-restricted registration**: Only users with approved corporate email domains can register

The system reduces the time to distribute configurations from over 15 minutes per request to under 2 minutes, while ensuring a complete and auditable record of all issued configurations.

## Tech Stack

### Frontend

- **[Astro 5](https://astro.build/)** - Fast, efficient web framework with minimal JavaScript
- **[React 19](https://react.dev/)** - Interactive UI components
- **[TypeScript 5](https://www.typescriptlang.org/)** - Static type checking and enhanced IDE support
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Utility-first CSS framework
- **[shadcn/ui](https://ui.shadcn.com/)** - Accessible React component library

### Backend

- **[Supabase](https://supabase.com/)** - All-in-one backend solution providing:
  - PostgreSQL database
  - Built-in authentication
  - Backend-as-a-Service SDKs
  - Open-source solution (can be self-hosted)

### Development & Deployment

- **Node.js 22.14.0** - Runtime environment (see `.nvmrc`)
- **GitHub Actions** - CI/CD pipelines
- **Docker** - Containerization for VPS hosting

## Getting Started Locally

### Prerequisites

- **Node.js**: Version 22.14.0 (recommended: use [nvm](https://github.com/nvm-sh/nvm) to manage Node versions)
- **Package Manager**: `npm` or `pnpm` (project includes both `package-lock.json` and `pnpm-lock.yaml`)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd wireguard-config-manager
   ```

2. **Install Node.js version** (if using nvm)
   ```bash
   nvm install
   nvm use
   ```

3. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

4. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   - Edit `.env` and configure the following:
     - Supabase connection details (URL, anon key, service role key)
     - `IMPORT_DIR`: Path to directory containing WireGuard `.conf` files
     - `ENCRYPTION_KEY`: Generate using `openssl rand -hex 32`
   - See `env.example` for detailed descriptions of all variables

5. **Start the development server**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

6. **Open your browser**
   - Navigate to `http://localhost:4321`

### Additional Setup

- Ensure you have access to a Supabase instance (local or cloud)
- Configure the required directories for WireGuard configuration files (as specified in the application configuration)
- Set up database migrations if applicable

## Available Scripts

All commands should be run from the root of the project:

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the local development server at `localhost:4321` |
| `npm run build` | Build the production site to `./dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run astro` | Run Astro CLI commands (e.g., `npm run astro add`, `npm run astro check`) |
| `npm run lint` | Run ESLint to check code quality |
| `npm run lint:fix` | Run ESLint and automatically fix issues |
| `npm test` | Run unit tests with Vitest |
| `npm run test:ui` | Run unit tests in interactive UI mode |
| `npm run test:coverage` | Run unit tests with coverage report |
| `npm run test:e2e` | Run all E2E tests with Playwright |
| `npm run test:e2e:ui` | Run E2E tests in interactive UI mode |
| `npm run test:e2e:debug` | Run E2E tests in debug mode |
| `npm run test:e2e:report` | Show the last test report |

## Application Routes

### Public Routes

| Route | Description |
|-------|-------------|
| `/` | Home page (dashboard for authenticated users) |
| `/login` | User login page with email and password authentication |
| `/register` | User registration page (domain-restricted) |

### Protected Routes (Admin Only)

| Route | Description |
|-------|-------------|
| `/admin/users` | User management interface |
| `/admin/peers` | Peer configuration management |
| `/admin/audit` | Audit log viewer with filtering |
| `/admin/config` | System configuration viewer (read-only) |

### API Endpoints

#### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/register` - User registration

#### User Endpoints
- `GET /api/v1/users/me` - Get current user profile

#### Peer Endpoints (User)
- `GET /api/v1/peers` - List user's peers
- `GET /api/v1/peers/:id` - Get specific peer details
- `POST /api/v1/peers/claim` - Claim next available peer (FIFO)
- `GET /api/v1/peers/:id/download` - Download peer configuration file
- `DELETE /api/v1/peers/:id` - Revoke a peer

#### Admin Endpoints
- `GET /api/v1/admin/users` - List all users (paginated)
- `GET /api/v1/admin/users/:id` - Get user details
- `PATCH /api/v1/admin/users/:id` - Update user (status, peer_limit)
- `POST /api/v1/admin/users/:id/reset-password` - Reset user password
- `GET /api/v1/admin/peers` - List all peers (paginated, filterable)
- `GET /api/v1/admin/peers/:id` - Get peer details
- `POST /api/v1/admin/peers/:id/assign` - Manually assign peer to user
- `POST /api/v1/admin/import` - Import WireGuard configs from directory
- `GET /api/v1/admin/config` - Get system configuration
- `GET /api/v1/admin/audit` - Get audit log (paginated, filterable)

## Admin Features

### System Configuration Viewer (`/admin/config`)

The Admin Config view provides administrators with a read-only dashboard of the current system configuration, enabling quick visibility into platform settings and health.

**Key Features:**
- **System Status Indicator**: Visual status bar showing overall system health
  - 🟢 **OK**: System operational (default if not explicitly set)
  - 🟡 **Degraded**: System experiencing issues
  - 🔴 **Down**: System unavailable
- **Configuration Grid**: Displays all system configuration key-value pairs in an organized, responsive grid
- **Smart Display**: Long configuration values are automatically truncated with hover tooltips showing full content
- **Real-time Refresh**: Manual refresh button to fetch latest configuration
- **Error Handling**: Comprehensive error states with retry mechanisms for network issues
- **Responsive Design**: Fully responsive layout adapting from mobile to desktop

**Use Cases:**
- Quick verification of deployment settings (environment, version)
- Database connection verification
- WireGuard network settings review
- System health monitoring

**Implementation Details:**
- **Frontend**: React component (`AdminConfigPage`) with custom hook (`useAdminConfig`)
- **Backend**: Read-only endpoint (`GET /api/v1/admin/config`) protected by admin role
- **State Management**: Local component state with loading, error, and success states
- **Accessibility**: ARIA labels, semantic HTML, keyboard navigation support

### Other Admin Features

- **User Management** (`/admin/users`): View, edit, and deactivate users; reset passwords; manage peer limits
- **Peer Management** (`/admin/peers`): View all peer configurations; manually assign peers to users; filter by status and owner
- **Audit Log** (`/admin/audit`): Comprehensive event tracking with filtering by event type, date range, and full-text search

## Project Scope

### In Scope (MVP)

- Distribution of existing WireGuard configurations
- Basic limit management and auditing
- User registration with domain restrictions
- User authentication and session management
- Configuration import from directory
- Automatic (FIFO) and manual peer assignment
- Configuration file download
- Peer revocation (user and admin-initiated)
- User deactivation with cascading peer revocation
- Comprehensive audit logging
- Administrator management views (users, peers, audit log, configuration)

### Out of Scope (MVP)

- Automatic generation of new WireGuard configurations
- Hostname management for peers
- Full CRUD operations for user and peer records
- User-initiated password reset without admin intervention
- Integrations with external HR/SSO systems

## Project Status

🚧 **Early Development / MVP Phase**

This project is currently in active development. The MVP is being built according to the Product Requirements Document (PRD) with a focus on core functionality for distributing and managing WireGuard configurations.

**Current Version**: 0.0.1

For detailed requirements and user stories, see [`docs/prd.md`](./docs/prd.md).

## License

[License information to be determined]

---

For more information about the project architecture and technical details, refer to:
- [`docs/prd.md`](./docs/prd.md) - Product Requirements Document
- [`docs/techstack.md`](./docs/techstack.md) - Detailed tech stack information
