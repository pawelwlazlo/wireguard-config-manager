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

## Deployment

The application can be deployed to a VPS using Docker and GitHub Actions for automated CI/CD.

### Prerequisites

#### On VPS
- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **SSH Access**: SSH key-based authentication configured
- **Operating System**: Linux (Ubuntu 20.04+ recommended)

#### On GitHub
- Repository with admin access to configure secrets
- SSH private key for VPS access

### VPS Setup

1. **Install Docker and Docker Compose** (if not already installed)
   ```bash
   # Update package index
   sudo apt-get update
   
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   
   # Install Docker Compose
   sudo apt-get install docker-compose-plugin
   
   # Add your user to docker group (optional, to run without sudo)
   sudo usermod -aG docker $USER
   ```

2. **Create application directory structure**
   ```bash
   mkdir -p /home/ubuntu/docker/wireguard-config-manager/env
   cd /home/ubuntu/docker/wireguard-config-manager
   ```

3. **Create environment file**
   ```bash
   nano env/.env
   ```
   
   Add your environment variables (use `env.example` as reference):
   ```env
   # Supabase Configuration (required for both build and runtime)
   # If using local Supabase (supabase start), use internal Docker network name:
   PUBLIC_SUPABASE_URL=http://supabase_kong_wireguard-config-manager:8000
   # If using Supabase Cloud, use public URL:
   # PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   
   PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # Application Configuration
   IMPORT_DIR=/path/to/wireguard/configs
   ENCRYPTION_KEY=your_encryption_key_here
   
   # Add other required variables from env.example
   ```
   
   **Important Notes**:
   - The `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` variables are required during Docker build process for pre-rendering static pages.
   - If using **local Supabase** (`supabase start`), use the internal Docker container name (e.g., `http://supabase_kong_wireguard-config-manager:8000`). Check your Kong container name with `docker ps | grep kong`.
   - If using **Supabase Cloud**, use the public HTTPS URL provided by Supabase.
   - The application connects to Supabase through the `supabase_network_wireguard-config-manager` Docker network (configured in `docker-compose.yml`).
   - During deployment, the workflow automatically copies `env/.env` to `.env` in the root directory so Docker Compose can load the variables for build arguments.

### GitHub Configuration

Configure the following secrets in your GitHub repository (Settings → Secrets and variables → Actions → New repository secret):

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `VPS_HOST` | IP address or domain of your VPS | `192.168.1.100` or `vps.example.com` |
| `VPS_USER` | SSH username on VPS | `ubuntu` |
| `VPS_SSH_KEY` | Private SSH key for authentication | Full content of your private key file |
| `VPS_PATH` | Deployment path on VPS | `/home/ubuntu/docker/wireguard-config-manager` |

#### How to add VPS_SSH_KEY

1. On your local machine, generate an SSH key pair (if not already done):
   ```bash
   ssh-keygen -t ed25519 -C "github-actions-deploy"
   ```

2. Copy the public key to your VPS:
   ```bash
   ssh-copy-id -i ~/.ssh/id_ed25519.pub ubuntu@your-vps-ip
   ```

3. Copy the **private key** content and add it as `VPS_SSH_KEY` secret in GitHub:
   ```bash
   cat ~/.ssh/id_ed25519
   ```

### Running a Deployment

The deployment is triggered manually from GitHub Actions:

1. Navigate to your repository on GitHub
2. Click on **Actions** tab
3. Select **Deploy to VPS** workflow
4. Click **Run workflow** button
5. Select the branch to deploy (default: `main`)
6. Click **Run workflow**

The workflow will:
- ✅ Checkout the code
- ✅ Create a deployment archive
- ✅ Copy files to VPS via SCP
- ✅ SSH into VPS and execute deployment commands
- ✅ Build Docker image
- ✅ Stop old containers
- ✅ Start new containers
- ✅ Clean up old Docker images

### Accessing the Application

After successful deployment, the application will be available at:
```
http://YOUR_VPS_IP:4321
```

### Verifying Deployment

SSH into your VPS and check container status:

```bash
cd /home/ubuntu/docker/wireguard-config-manager
docker compose ps
```

Expected output:
```
NAME                          COMMAND                  SERVICE             STATUS              PORTS
wireguard-config-manager      "node ./dist/server/…"   wireguard-manager   Up 2 minutes        0.0.0.0:4321->4321/tcp
```

View container logs:
```bash
docker compose logs -f wireguard-manager
```

### Troubleshooting

#### Container won't start

Check logs for errors:
```bash
docker compose logs wireguard-manager
```

Common issues:
- **Missing environment variables**: Verify `env/.env` file exists and contains all required variables
- **Port conflict**: Ensure port 4321 is not already in use (`sudo lsof -i :4321`)
- **Permission issues**: Ensure Docker has permission to read files

#### Deployment fails

Check GitHub Actions logs for specific error messages.

Common issues:
- **SSH connection failed**: Verify `VPS_HOST`, `VPS_USER`, and `VPS_SSH_KEY` secrets are correctly configured
- **Permission denied**: Ensure the SSH key has proper permissions on VPS
- **Path not found**: Verify `VPS_PATH` secret matches the actual directory on VPS

#### Application returns errors

1. Check environment variables in `env/.env`
2. Verify Supabase connection details
3. Ensure database migrations have been run
4. Check application logs: `docker compose logs -f`

### Manual Deployment (Alternative)

If you prefer to deploy manually without GitHub Actions:

1. **On your local machine:**
   ```bash
   # Build the project
   npm run build
   
   # Create archive (excluding unnecessary files)
   tar --exclude='.git' --exclude='node_modules' --exclude='tests' -czf deploy.tar.gz .
   
   # Copy to VPS
   scp deploy.tar.gz ubuntu@your-vps:/home/ubuntu/docker/wireguard-config-manager/
   ```

2. **On the VPS:**
   ```bash
   cd /home/ubuntu/docker/wireguard-config-manager
   tar -xzf deploy.tar.gz
   rm deploy.tar.gz
   
   # Build and start containers
   docker compose down
   docker compose up --build -d
   
   # View logs
   docker compose logs -f
   ```

### Updating the Application

To update a running deployment:

1. Run the deployment workflow from GitHub Actions (as described above)
2. The workflow automatically:
   - Creates a backup of current deployment
   - Deploys new version
   - Restarts containers

### Rolling Back

If a deployment fails, you can rollback to the previous version:

```bash
# SSH into VPS
cd /home/ubuntu/docker/wireguard-config-manager

# Stop current containers
docker compose down

# Restore from backup
rsync -a --delete backup/ ./

# Start containers with previous version
docker compose up -d
```

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
