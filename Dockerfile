# Build stage
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Accept build arguments for Supabase configuration
ARG SUPABASE_URL
ARG SUPABASE_ANON_KEY

# Create .env file for build with required variables
RUN echo "SUPABASE_URL=${SUPABASE_URL}" > .env && \
    echo "SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}" >> .env

# Build the application
RUN pnpm run build

# Production stage
FROM node:22-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Expose the application port
EXPOSE 4321

# Set NODE_ENV to production
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

# Run the application
CMD ["node", "./dist/server/entry.mjs"]

