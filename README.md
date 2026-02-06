# RETE - Renewable Energy Token Economy

An open-source platform for managing Renewable Energy Communities (RECs) through blockchain-based incentive distribution, a local marketplace, and transparent governance tools.

RETE turns energy data into community tokens (ERC-20) that citizens can spend with local merchants, creating a circular economy loop that rewards sustainable energy behaviour.

## Overview

RETE provides a complete operational stack for Energy Communities:

- **Coordinator Dashboard** -- Manage members, distribute tokens (individually or via CSV), configure blockchain settings, run burn cycles, and monitor community activity
- **Citizen Dashboard** -- View token balance, transaction history, wallet details, and browse the marketplace
- **Provider Dashboard** -- Create and manage products/services, track sales and token inflows
- **Marketplace** -- Citizens spend tokens on local goods and services using gasless permit-based transfers
- **Multi-Chain Support** -- Configurable chain profiles (Ethereum Sepolia, Alastria, or any EVM-compatible network)

## Architecture

```
┌─────────────────┐     ┌─────────────────────────┐     ┌──────────────┐
│   React Client  │────▶│   Node.js / Express     │────▶│  PostgreSQL   │
│   (Vite)        │◀────│   REST API + WebSocket   │◀────│  (Drizzle ORM)│
└─────────────────┘     └──────────┬──────────────┘     └──────────────┘
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │  EVM Blockchain     │
                        │  (ERC-20 Tokens)    │
                        └─────────────────────┘
```

**Frontend:** React 18, Vite, Tailwind CSS, Radix UI, TanStack Query, Wouter
**Backend:** Node.js, Express, Drizzle ORM, Passport.js, Socket.IO, ethers.js
**Database:** PostgreSQL
**Blockchain:** ERC-20 smart contracts on any EVM-compatible chain (factory-based deployment)

## Features

### Token Operations
- Factory-based ERC-20 token creation per community
- Minting via single entry or CSV batch upload
- Permit-based marketplace purchases (no manual approval needed)
- Periodic burn cycles with downloadable audit reports
- Token reset and chain switching

### Community Management
- Role-based access control (Coordinator, Provider, User)
- User invitation and onboarding
- CSV import/export for distribution and reporting
- Real-time WebSocket notifications for transactions and balance updates

### Marketplace
- Product creation with categories and pricing in community tokens
- Community-scoped product visibility
- Purchase confirmation with on-chain verification
- Provider revenue tracking and analytics

### Security
- Session-based authentication with secure cookies
- Encrypted keystore export for wallet portability
- Role-based API access control
- Privacy by design principles

## Prerequisites

- **Node.js** 20+
- **PostgreSQL** 16+
- An EVM-compatible blockchain endpoint (e.g., Ethereum Sepolia RPC URL)

## Getting Started

### 1. Clone and install

```bash
git clone <repository-url>
cd RETE
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/rete
SESSION_SECRET=your-session-secret
```

### 3. Set up the database

```bash
npm run db:push
```

### 4. Run in development

```bash
npm run dev
```

The application will be available at `http://localhost:5000`.

### 5. Build for production

```bash
npm run build
npm run start
```

## Docker Deployment

The easiest way to run RETE is using Docker Compose, which handles all dependencies automatically.

### Quick Start with Docker

```bash
# 1. Copy the environment template
cp .env.example .env

# 2. Edit .env and configure at minimum:
#    - SESSION_SECRET (change for production)
#    - PRIVATE_KEY (your admin wallet private key)
#    - RPC_URL (your blockchain RPC endpoint)
#    - FACTORY_ADDRESS (deployed ReteTokenFactory address)

# 3. Start all services
docker-compose up -d

# 4. View logs
docker-compose logs -f app

# 5. Access the application
open http://localhost:5000
```

### Docker Services

| Service | Description | Port |
|---------|-------------|------|
| `app` | RETE application | 5000 |
| `db` | PostgreSQL database | 5432 |

### Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build

# View logs
docker-compose logs -f

# Reset database (removes all data)
docker-compose down -v
docker-compose up -d
```

### Production Considerations

For production deployments:

1. **Change default passwords** in `.env`
2. **Use a strong SESSION_SECRET** (generate with `openssl rand -base64 32`)
3. **Configure proper blockchain credentials** (PRIVATE_KEY, RPC_URL, FACTORY_ADDRESS)
4. **Set up a reverse proxy** (nginx, Traefik) with HTTPS
5. **Configure backup** for the PostgreSQL volume

## Project Structure

```
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/     # UI components (dashboard, marketplace, wallet, etc.)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions
│   │   └── pages/          # Page components
│   └── index.html
├── server/                 # Node.js backend
│   ├── index.ts            # Entry point
│   ├── routes.ts           # API route definitions
│   ├── db.ts               # Database connection
│   ├── storage.ts          # Data access layer
│   ├── blockchain.ts       # Blockchain interaction logic
│   ├── websocket.ts        # WebSocket event handling
│   └── vite.ts             # Vite dev server integration
├── shared/
│   └── schema.ts           # Database schema (Drizzle ORM) and Zod validators
├── script/
│   └── build.ts            # Production build script
├── drizzle.config.ts       # Drizzle Kit configuration
├── vite.config.ts          # Vite configuration
└── package.json
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Run production build |
| `npm run check` | TypeScript type checking |
| `npm run db:push` | Push schema changes to database |
| `docker-compose up -d` | Start with Docker (recommended) |
| `docker-compose down` | Stop Docker services |

## Acknowledgements

This project was developed by [Apio S.r.l.](https://www.apio.cc) as part of the **NGI TrustChain** project (Open Call 5), funded by the European Union under Grant Agreement No. 101093274.

The platform was validated in collaboration with **CER Pescara** (Renewable Energy Community of Pescara, Italy).

## License

MIT
