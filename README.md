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

---

## 🔍 Phase 4: Job Discovery Engine

JobPilot AI features a decoupled, multi-source job discovery engine:

- **Permitted Sources**:
  - **Jobicy** (Official API v2): Remote international engineering & data roles with structured salary brackets.
  - **We Work Remotely** (Public RSS 2.0): Remote AI & software engineering roles globally.
  - **Remotive** (Official Public API): 100% remote global engineering & tech roles.
- **LinkedIn & Manual Ingestion**:
  - Direct paste of LinkedIn and external career URLs & descriptions.
  - Canonical URL normalization (stripping tracking tokens like `trackingId`, `refId`, `utm_*`).
  - Automatic external ID extraction (e.g. LinkedIn job ID `4028372819`).
  - Incomplete listings without descriptions are saved and flagged as `NEEDS_REVIEW`.
  - Zero scraping, zero automated logins, strictly compliant with terms.
- **4-Tier Deduplication**:
  1. Exact canonical URL matching.
  2. Source external ID matching.
  3. Canonical cross-source fingerprinting (`company::title::arrangement`).
  4. Previously rejected / expired opportunity guard.

---

## 🧠 Phase 5: AI Intelligence & Evaluation Engine

- **Official Google GenAI SDK (`@google/genai`)**:
  - Server-side Gemini API integration (`gemini-2.5-flash`).
  - Native structured JSON mode with runtime **Zod schema validation**.
- **AI Provider Abstraction (`AIProvider`)**:
  - Easily plug in alternative providers (e.g., local **Ollama** via `llama3.2`).
  - Automatic fallback hierarchy and offline deterministic mock provider.
- **Strict Candidate Profile Grounding & Anti-Hallucination Contract**:
  - Never invents qualifications, degrees, skills, employment dates, or authorization.
  - Missing facts are explicitly flagged with `requiresManualConfirmation: true`.
- **Job Evaluation Engine**:
  - **5 Configurable Dimensions**: Skills match (30%), Role relevance (25%), Seniority fit (15%), Location & Nigeria eligibility (20%), Job freshness (10%).
  - **3-Tier Eligibility Classification**: `ELIGIBLE`, `UNCLEAR` (flagged for review, cannot be `STRONG_MATCH`), `INELIGIBLE` (strictly `NOT_RECOMMENDED`, blocked from application preparation).
  - **Deterministic Scoring**: Gemini handles semantic understanding; deterministic code handles mathematical score aggregation and freshness calculations.
- **Opportunity Ranking & Selection System**:
  - Ranks evaluated opportunities based on match score, application deadline urgency, and listing freshness.
  - Selects a configurable maximum (default: **3**) of qualified opportunities per run without mandatory quota.
  - Pipeline protection: applications in `PENDING_REVIEW` or `APPROVED` are **never overwritten or duplicated**.

---

## 🔮 Roadmap: Next Steps

- **Phase 6: Application Materials Generation**: Tailoring professional, truthful resumes and cover letters using verified candidate facts and Gemini.
- **Phase 7: Browser Assistance**: Human-supervised autofill assistance for application portals using Playwright.
- **Phase 8: Telegram Alerts & Automation**: Real-time qualified job notifications and daily pipeline digests.

### Building for Production

To build and verify TypeScript types and production assets:

```bash
npm run build
```

To run the production build:

```bash
npm start
```
