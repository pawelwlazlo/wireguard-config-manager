# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a WireGuard configuration manager web application built with Astro 5.14.1. The project is currently in early stages, initialized from the Astro basics template.

## Commands

All commands are run from the root of the project:

- `npm install` - Install dependencies
- `npm run dev` - Start local dev server at `localhost:4321`
- `npm run build` - Build production site to `./dist/`
- `npm run preview` - Preview production build locally
- `npm run astro ...` - Run Astro CLI commands

## Project Structure

```
/
├── public/           # Static assets (favicon, etc)
├── src/
│   ├── assets/      # Images and other bundled assets
│   ├── components/  # Astro components
│   ├── layouts/     # Layout components
│   └── pages/       # File-based routing pages
├── astro.config.mjs # Astro configuration
└── tsconfig.json    # TypeScript configuration (extends astro/tsconfigs/strict)
```

## Architecture

- **Framework**: Astro with static site generation
- **TypeScript**: Configured with strict mode via Astro's strict tsconfig
- **Routing**: File-based routing in `src/pages/`
- **Component Structure**: Astro components (.astro files) that can include frontmatter, template markup, and scoped styles
- **Layout Pattern**: Base layout in `src/layouts/Layout.astro` wraps page content using the `<slot />` pattern
