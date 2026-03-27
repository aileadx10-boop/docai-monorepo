# DocAI Monorepo

Two independent apps that together power the DocAI / DocStack product.

## Apps

### `web/` — Frontend (DocAI)
The website, UI, and client-facing product.

```bash
cd web
# no build step — static site served by Vercel
```

Deployed via Vercel project **doc-ai** → Root Directory: `web`

### `agents/` — Backend Agents (DocAI-agents)
Orchestrator, cron jobs, and serverless worker automations.

```bash
cd agents
npm install
node orchestrator.js
```

Deployed via Vercel project **doc-ai-agents** → Root Directory: `agents`

Cron: `/api/cron` runs daily at 07:00 UTC.

## Communication
`web` and `agents` are fully independent. They communicate only via HTTP — no shared code, no cross-imports, no shared `node_modules`.

## Not legal advice
All output from this product includes the disclaimer: "Not legal advice. For legal advice, consult a licensed attorney."
