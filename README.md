# MathEngineer

> **Deterministic Step-by-Step Engineering Mathematics Platform**  
> Designed specifically for undergraduate engineering students to master numerical techniques, root-finding algorithms, and computational methods with verified convergence, Socratic guidance, and zero hallucinations.

---

## Architecture Overview

MathEngineer employs a **deterministic-first, AI-assisted** architecture. Mathematical computations, interval convergence, bracket discovery, and step validations are executed by verifiable numerical engines. Large language models (Google Gemini) are strictly isolated as an advisory layer for conceptual pedagogy, course note grounding (RAG), and natural language voice/chat interactions.

```mermaid
flowchart TD
    subgraph Client["Frontend Application (Vercel / React 19)"]
        UI["Navigation & UI Shell<br/>(Home, Learn, Solve, Practice, Progress, Review, Quiz)"]
        SolverSM["Interactive Solver State Machine<br/>(Bisection, False-Position, Newton-Raphson)"]
        OCR["Image Capture & OCR Pipeline<br/>(Tesseract.js Client Processing)"]
        AssistantUI["Math Assistant Interface<br/>(Voice Recognition, Speech Synthesis, Chat)"]
        LocalStores["Client Persistence Stores<br/>(Active Problem, Learning Analytics, Offline Cache)"]
    end

    subgraph Edge["Reverse Proxy / Edge Routing"]
        VercelRewrite["Vercel Edge Rewrites<br/>(/api/* -> Render Backend)"]
    end

    subgraph Server["Backend API & Compute (Render / Deno 2)"]
        HTTPServer["Deno HTTP Server (server.ts)<br/>(CORS Enabled, REST Handlers, Health Checks)"]
        TutorOrchestrator["Unified Intelligent Tutor Router<br/>(Local Definitions, RAG, Gemini Client)"]
        RAG["Course Knowledge Engine<br/>(Class Notes, Citation Index, Semantic Retrieval)"]
        PersistenceAPI["Persistence & Migration API<br/>(/api/problems, /api/attempts, /api/sync)"]
        DenoDB["Embedded Database Layer<br/>(Deno KV / SQLite Storage)"]
    end

    subgraph External["External Cloud Services"]
        GeminiAPI["Google Gemini API<br/>(gemini-2.5-flash Advisory Layer)"]
    end

    UI --> SolverSM
    UI --> OCR
    UI --> AssistantUI
    UI --> LocalStores
    LocalStores -.->|Async Sync| VercelRewrite
    AssistantUI --> VercelRewrite
    OCR --> VercelRewrite
    VercelRewrite --> HTTPServer
    HTTPServer --> PersistenceAPI
    HTTPServer --> TutorOrchestrator
    PersistenceAPI --> DenoDB
    TutorOrchestrator --> RAG
    TutorOrchestrator -.->|Fallback Only| GeminiAPI
```

---

## Numerical Solving & Validation Pipeline

Every problem submitted by an engineering student passes through a multi-stage deterministic pipeline. The algorithms guarantee bounded convergence according to university examination criteria.

```mermaid
flowchart LR
    A["Problem Input<br/>(Equation f(x)=0, Bounds / Guess)"] --> B{"Input Type?"}
    
    B -->|Exam Photo| C["Tesseract OCR Engine<br/>Character Normalization"]
    C --> D["Equation Parser &<br/>Bracket Search"]
    D --> E["Discovered Interval [a, b]<br/>such that f(a)·f(b) < 0"]
    
    B -->|Manual / Curated| E
    
    E --> F["Select Numerical Method"]
    
    F -->|Bisection| G1["c = (a + b) / 2<br/>Bracket Halving"]
    F -->|False Position| G2["c = (a·f(b) - b·f(a)) / (f(b) - f(a))<br/>Linear Chord"]
    F -->|Newton-Raphson| G3["x_{n+1} = x_n - f(x_n)/f'(x_n)<br/>Symbolic Derivative"]
    
    G1 --> H["Convergence & Tolerance Evaluation<br/>|x_{n} - x_{n-1}| < ε  OR  |f(x_n)| < ε"]
    G2 --> H
    G3 --> H
    
    H -->|Not Converged| I["Error Diagnosis & Hints<br/>(Sign check, rounding, formula substitution)"]
    I --> F
    
    H -->|Converged| J["Verified Root Solution<br/>Iteration Table & Full Step-by-Step Proof"]
```

---

## Intelligent Tutor & Grounding (RAG) Pipeline

The assistant uses a 4-tier query resolution hierarchy to maximize speed, minimize token consumption, and eliminate algorithmic hallucination:

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant UI as Math Assistant
    participant Router as Tutor Orchestrator
    participant Engine as Deterministic Math Engine
    participant RAG as Course Knowledge Base
    participant Gemini as Google Gemini API

    Student->>UI: Asks mathematical question or requests step hint
    UI->>Router: POST /api/chat (Query, Problem Context, History)
    
    rect rgb(240, 245, 255)
    Note over Router: Tier 1: Assessment Guard
    Router->>Router: If active Quiz assessment, block assistance
    end

    rect rgb(245, 255, 245)
    Note over Router: Tier 2: Local Deterministic & Definitions (0 Gemini Calls)
    Router->>Engine: Match known formula, definition, or calculation
    Engine-->>Router: Verified definition, formula, or next iteration step
    end

    alt Solved by Tier 2
        Router-->>UI: Verified deterministic response (Instant)
    else Requires Course Notes (Tier 3)
        rect rgb(255, 250, 240)
        Router->>RAG: Semantic search across syllabus notes
        RAG-->>Router: Course-grounded notes + citations (Dr. Lodhi)
        end
        Router-->>UI: Course-grounded explanation with citation
    else Open Conceptual Pedagogy (Tier 4)
        rect rgb(255, 240, 245)
        Router->>Gemini: Prompt with deterministic context, course grounding & Hinglish mode
        Gemini-->>Router: Pedagogical Socratic response
        end
        Router-->>UI: Personalized explanation + Speech synthesis transcript
    end

    UI->>Student: Formatted KaTeX mathematical response + audio
```

---

## Core Modules

| Module | Route | Key Capabilities |
| :--- | :--- | :--- |
| **Home** | `/` | Course roadmap, method progress summaries, curated daily practice problem, student streak counter. |
| **Learn** | `/learn` | 10-part structured lessons for Bisection, Regula Falsi, and Newton-Raphson methods with interactive graphs. |
| **Solve** | `/solve` | Step-by-step solver with three learning modes: *"Try it myself"*, *"Guided Hints"*, and *"Show complete solution"*. Real-time arithmetic and bracketing validation. |
| **Practice** | `/practice` | 20 curated undergraduate exam-style problems across varying difficulty levels, plus side-by-side **Method Comparison** benchmark tool. |
| **Progress** | `/progress` | Quantitative mastery tracking, hint reliance analytics, recency model, and adaptive practice recommendations. |
| **Review** | `/review` | Persistent log of historical problem attempts, mistake classification (bracketing, rounding, formula substitution), and retry mechanisms. |
| **Quiz** | `/quiz` | Timed mastery assessments with randomized question configurations and objective scoring. |

---

## Technology Stack

- **Frontend**: React 19, TypeScript 5.7, Vite 6, Tailwind CSS 3.4, Lucide Icons, KaTeX (LaTeX math rendering).
- **Backend**: Deno 2 Runtime, Standalone HTTP Server (`server.ts`), Deno KV / SQLite database engine.
- **Computer Vision & OCR**: Tesseract.js (in-browser optical character recognition), automated interval discovery.
- **Mathematical Computation**: Deterministic numerical algorithms, expression parser, automated symbolic differentiator.
- **AI & RAG Engine**: Google Gemini API (`gemini-2.5-flash`), Course Knowledge Semantic Retrieval.

---

## Deployment Guide

MathEngineer is pre-configured for dual-cloud deployment:
- **Frontend**: Deployed to **Vercel** with global CDN edge caching and automated `/api/*` proxying.
- **Backend**: Deployed to **Render** as a high-performance containerized Deno web service.

```
                    ┌─────────────────────────┐
                    │  Vercel Edge Network    │
                    │  (Static React Assets)  │
                    │  https://*.vercel.app   │
                    └────────────┬────────────┘
                                 │
                    Rewrites /api/* to Render
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │  Render Web Service     │
                    │  (Deno 2 HTTP Server)   │
                    │  https://*.onrender.com │
                    └────────────┬────────────┘
                                 │
                       Reads GEMINI_API_KEY
                                 ▼
                    ┌─────────────────────────┐
                    │  Google Gemini API      │
                    └─────────────────────────┘
```

### 1. Backend Deployment on Render

1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New → Web Service**.
2. Connect your GitHub repository (`Labdhimandovara/MathEngineer`).
3. Select **Docker** environment (or let Render detect `render.yaml` Blueprint):
   - **Name**: `mathengineer`
   - **Branch**: `main`
   - **Region**: Oregon (or nearest to your users)
   - **Plan**: Free (or Starter)
   - **Health Check Path**: `/api/ai-status`
4. Add the following **Environment Variables**:
   | Variable | Value | Required? | Description |
   | :--- | :--- | :--- | :--- |
   | `PORT` | `8000` | Yes | HTTP server binding port |
   | `GEMINI_API_KEY` | `your_gemini_api_key` | Optional | Powers AI Tutor and exam-photo equation parsing |
   | `DENO_TLS_CA_STORE` | `system` | Optional | Uses system certificates |
5. Click **Create Web Service**. Once deployed, Render will provide your public backend URL:  
   `https://mathengineer.onrender.com`

---

### 2. Frontend Deployment on Vercel

1. Go to [Vercel Dashboard](https://vercel.com/new) and click **Import Repository** (`Labdhimandovara/MathEngineer`).
2. Framework Preset will automatically detect **Vite**.
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
3. In `vercel.json`, ensure the proxy destination points to your Render backend:
   ```json
   {
     "rewrites": [
       {
         "source": "/api/:path*",
         "destination": "https://mathengineer.onrender.com/api/:path*"
       },
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```
4. Click **Deploy**. Vercel will build and launch your application with zero additional configuration needed.

---

## Local Development

### Prerequisites
- [Deno 2+](https://deno.land/) installed (recommended), or Node.js 20+.
- A Google Gemini API key (optional, for AI features).

### Getting Started

```bash
# Clone the repository
git clone https://github.com/Labdhimandovara/MathEngineer.git
cd MathEngineer

# Set up local environment variables
cp .env.example .env
# Edit .env and supply your GEMINI_API_KEY

# Start local development server (Vite + hot reloading)
deno task dev

# Run comprehensive test suite (664 automated tests)
deno task test

# Build production bundle
deno task build

# Run production backend server locally
deno task start
```

---

## Test Suite Verification

MathEngineer includes an exhaustive automated test suite covering deterministic root finding, bracketing algorithms, error classification, voice interaction robustness, course RAG grounding, and Gemini API fallbacks.

```bash
deno test -A --unstable-sloppy-imports
```
```text
ok | 664 passed | 0 failed (6s)
```

---

## License

MIT License. Designed and developed for engineering mathematics education.
