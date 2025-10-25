# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a WireGuard configuration manager web application built with Astro 5.14.1, React 19, and Tailwind CSS 4. The project uses the Node adapter in standalone mode for server-side rendering capabilities.

## Commands

All commands are run from the root of the project:

- `npm install` or `pnpm install` - Install dependencies
- `npm run dev` or `pnpm dev` - Start local dev server at `localhost:4321`
- `npm run build` or `pnpm build` - Build production site to `./dist/`
- `npm run preview` or `pnpm preview` - Preview production build locally
- `npm run astro ...` - Run Astro CLI commands

## Project Structure

```text
/
├── public/           # Static assets (favicon, etc)
├── src/
│   ├── assets/      # Images and other bundled assets
│   ├── components/  # Astro and React components
│   ├── layouts/     # Layout components
│   └── pages/       # File-based routing pages
├── astro.config.mjs # Astro configuration
└── tsconfig.json    # TypeScript configuration (extends astro/tsconfigs/strict)
```

## Architecture

- **Framework**: Astro with Node adapter (standalone mode) for SSR capabilities
- **UI Framework**: React 19 integrated via `@astrojs/react`
- **Styling**: Tailwind CSS 4 via `@tailwindcss/vite` plugin
- **TypeScript**: Configured with strict mode via Astro's strict tsconfig
  - Path alias: `@/*` maps to `./src/*`
  - JSX configured for React with `react-jsx` transform
- **Routing**: File-based routing in `src/pages/`
- **Component Structure**:
  - Astro components (.astro files) for layouts and static content
  - React components (.tsx files) for interactive UI
  - Both can be mixed in the same page
- **Layout Pattern**: Base layout in `src/layouts/Layout.astro` wraps page content using the `<slot />` pattern
