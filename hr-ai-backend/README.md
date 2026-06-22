# AI HR Backend

NestJS modular monolith for an AI-powered HR platform with role-scoped HR chat, approved-document RAG, employee self-service, document generation, onboarding, alerts, and dashboards.

It is not a full HRIS/SIRH. Payroll, leave approval workflows, career management, full HR administration, real AI, real S3/MinIO, real Power BI integration, and prediction logic are outside the MVP.

## Stack

- Node.js, NestJS, TypeScript
- PostgreSQL with Prisma ORM
- JWT auth with Passport
- RBAC guards and decorators
- class-validator / class-transformer
- Multer local uploads
- pgvector-ready document chunk structure
- OpenCode Go chat completions
- Role-scoped lexical RAG over PDF, DOCX, and TXT files
- Redis-backed token revocation
- Docker Compose
- Swagger at `/api/docs`

## Install

```bash
npm install
cp .env.example .env
npm run prisma:generate
```

Set `OPENCODE_GO_API_KEY` in `.env`. The default provider endpoint is
`https://opencode.ai/zen/go/v1` and the default model is
`deepseek-v4-flash`.

## Run Locally

Start PostgreSQL and Redis, then:

```bash
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

Health check:

```bash
curl http://localhost:3000/health
```

Default admin:

- Email: `admin@demo.local`
- Password: `admin123`

## Run With Docker

```bash
docker compose up --build
```

In a real setup, run Prisma migrations before using the API:

```bash
docker compose exec backend npm run prisma:migrate
docker compose exec backend npm run prisma:seed
```

## Prisma

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

`DocumentChunk.embedding` is currently a text placeholder. When pgvector is enabled, replace it with a vector-compatible column and add the required PostgreSQL extension/migration.

## API Overview

All application routes use the `/api` prefix, except `GET /health`.

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/users`
- `GET /api/users`
- `GET /api/users/:id`
- `PATCH /api/users/:id/role`
- `PATCH /api/users/:id/deactivate`
- `POST /api/employees`
- `GET /api/employees`
- `GET /api/employees/:id`
- `PATCH /api/employees/:id`
- `POST /api/employees/import`
- `POST /api/documents/upload`
- `GET /api/documents`
- `GET /api/documents/:id`
- `PATCH /api/documents/:id/validate`
- `PATCH /api/documents/:id/archive`
- `POST /api/rag/query`
- `POST /api/rag/index-document/:documentId`
- `POST /api/chat/ask`
- `GET /api/chat/conversations`
- `GET /api/chat/conversations/:id`
- `GET /api/chat/supervision/messages`
- `POST /api/chat/actions/:id/confirm`
- `POST /api/chat/actions/:id/cancel`
- `POST /api/generated-documents/request`
- `POST /api/generated-documents/:id/generate-draft`
- `PATCH /api/generated-documents/:id/validate`
- `PATCH /api/generated-documents/:id/reject`
- `GET /api/generated-documents`
- `GET /api/generated-documents/:id/download`
- `POST /api/onboarding/generate`
- `GET /api/onboarding`
- `GET /api/onboarding/:id`
- `PATCH /api/onboarding/steps/:id/complete`
- `GET /api/onboarding/:id/progress`
- `GET /api/dashboard/headcount`
- `GET /api/dashboard/absenteeism`
- `GET /api/dashboard/turnover`
- `GET /api/dashboard/onboarding-progress`
- `GET /api/dashboard/ai-usage`
- `GET /api/dashboard/alerts-summary`
- `POST /api/alerts`
- `GET /api/alerts`
- `GET /api/alerts/:id`
- `PATCH /api/alerts/:id/status`
- `GET /api/prediction/workforce-projection`
- `GET /api/prediction/turnover-risk`
- `GET /api/prediction/absenteeism-trend`

## Modular Monolith

The application is one NestJS app with feature modules. It is intentionally not split into microservices. Cross-cutting services such as Prisma, storage, LLM, embeddings, document parsing, auditing, and workers are internal modules that can evolve without changing the deployment model.

## HR assistant security

- HR/Admin can query organization and individual HR data, including salaries.
- Managers can query direct reports but cannot access their salaries or private document contents.
- Direction receives aggregate organization data and their own personal data.
- QVT receives anonymous wellbeing aggregates and their own personal data.
- Collaborators can query only their own individual data.
- Authorization and document visibility are applied before any context is sent to OpenCode Go.
- Unsupported or unauthorized questions are refused and audited.
- Chat-created HR actions are stored as 15-minute, single-use drafts and require explicit confirmation.

## MVP vs Future

MVP:

- Authentication and RBAC
- Minimal employee data
- HR knowledge documents
- Role-scoped RAG/chat with source-aware refusal behavior
- Confirmation-based leave/document request and onboarding actions
- WorkflowTask-backed onboarding plans
- Dashboards and alerts skeletons
- Audit logging

Future:

- Optional pgvector embeddings and semantic retrieval
- MinIO/S3 storage adapter
- Power BI PostgreSQL views
- Prediction jobs after enough clean historical data exists
- Advanced social risk analysis
- HRIS integrations
# Local integrated startup

Create the runtime environment file and add your OpenCode Go key:

```powershell
Copy-Item .env.example .env
# Edit .env and set OPENCODE_GO_API_KEY
docker compose up -d --build
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma db seed
```

The backend is available at `http://localhost:3000/api`, Swagger at `http://localhost:3000/api/docs`, and MinIO’s console at `http://localhost:9001`.

Validation:

```powershell
npm test
npm run lint
npm run build
$env:DATABASE_URL='postgresql://postgres:postgres@localhost:5432/hr_ai?schema=public'
npx prisma validate
```
