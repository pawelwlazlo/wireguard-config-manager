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
   - Create a `.env` file in the root directory
   - Configure Supabase connection details and other required environment variables
   - (Refer to project documentation for specific environment variable requirements)

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
