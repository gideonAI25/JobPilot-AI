# JobPilot AI

JobPilot AI is a personal, AI-powered job discovery and application assistant designed to streamline the remote job hunt. It discovers relevant remote job listings, evaluates them against your professional profile, prepares tailored application materials, and assists with pre-filling application forms.

> [!IMPORTANT]
> **Human-in-the-Loop Principle**: You remain in total control of every single application. The MVP will **NEVER** automatically submit applications on your behalf.

---

## 🛠 Technology Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Turbopack)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict mode)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database**: [SQLite](https://sqlite.org/) (Zero-config, local storage)
- **ORM**: [Prisma ORM](https://www.prisma.io/)
- **AI Intelligence**: [Google Gemini API](https://ai.google.dev/)
- **Browser Automation**: [Playwright](https://playwright.dev/) (For controlled assisted pre-filling)
- **Notifications & Alerts**: [Telegram Bot API](https://core.telegram.org/bots/api)

---

## 📁 Project Architecture & Folder Structure

```
JobPilot-Ai/
├── app/                  # Next.js App Router routes, layouts, and API endpoints
├── components/           # Reusable UI components (pure presentation & interaction)
├── hooks/                # Custom React hooks for client state & lifecycle management
├── lib/                  # Shared utilities, client initializers, and helper libraries
├── prisma/               # Database schema definition and migration history
├── public/               # Static assets (icons, images, fonts)
├── services/             # Core business logic decoupled from React components
│                         # (Job scraping, profile matching, Gemini AI, Telegram, etc.)
├── types/                # Domain models, API contracts, and TypeScript declarations
├── .env.example          # Template for required environment variables
├── next.config.ts        # Next.js configuration
├── package.json          # Dependency manifest and npm scripts
├── tsconfig.json         # TypeScript configuration with `@/*` path mapping
└── README.md             # Project documentation
```

---

## 📋 Development Conventions

1. **Incremental Building**: Develop features step-by-step with verified milestones rather than all at once.
2. **Modular Architecture**: Build reusable components and clean separation of concerns.
3. **Decoupled Business Logic**: Keep business and domain logic inside the `services/` layer, strictly outside of React components.
4. **End-to-End TypeScript**: Strict typing across the codebase—no `any` types.
5. **Real Functionality Only**: Prioritize actual, working functionality over visual demonstrations. No fake buttons, placeholder UI, or mocked backend operations.
6. **Lean Dependencies**: Maintain a minimal dependency footprint, vetting every addition.
7. **Security & Secret Isolation**: Never expose API keys (Gemini, Telegram, etc.) or credentials in client-side code; all secrets must stay on the server.
8. **Verification & Testing**: Test every implementation thoroughly before moving to subsequent features.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18.18+ or 20+ (tested on Node v24+)
- npm 9+

### Installation

1. Clone or open the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up the local environment file:
   ```bash
   cp .env.example .env
   ```

### Running the Application

To run the Next.js development server:

```bash
npm run dev
```

The application will be accessible at:
[http://localhost:3000](http://localhost:3000)

### Main Navigation & Dashboard Routes (Phase 3)

| Route | View | Description |
|---|---|---|
| `/` | **Overview** | Executive pipeline analytics, recent job discoveries, pending reviews, and automation telemetry |
| `/jobs` | **Find Jobs** | Ingested job postings, search filters, and AI evaluation match score breakdowns |
| `/applications` | **Applications** | Application lifecycle management with human-in-the-loop review and sign-off |
| `/profile` | **My Profile** | Verified candidate source of truth with 10 sections and CV document management |
| `/documents` | **Documents** | Source CV uploads and tailored versioned application materials |
| `/automation` | **Automation** | Scheduled background ingestion telemetry and structured system audit logs |
| `/settings` | **Settings** | Database connection health, environment configuration, and service status |

### Building for Production

To build and verify TypeScript types and production assets:

```bash
npm run build
```

To run the production build:

```bash
npm start
```
