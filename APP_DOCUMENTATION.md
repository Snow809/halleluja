# Intelli-Talent — Application Documentation

This document explains the main Intelli-Talent HR SaaS application: architecture, technology stack, modules, workflows, security model, AI/RAG behavior, and operational setup.

The mobile PWA prototype in `frontend-pwa/` is intentionally excluded from this document because it is not part of the main application scope currently used for demos.

---

## 1. Product overview

Intelli-Talent is a secure HR platform built around four main ideas:

1. **Employee self-service**
   - Request leave.
   - Request HR documents.
   - Access personal generated documents.
   - Follow onboarding/offboarding tasks.
   - Ask ARIA, the HR assistant, questions within authorized data.

2. **HR/Admin operations**
   - Manage employees and accounts.
   - Review leave and document requests.
   - Upload, validate, archive, index, and preview HR documents.
   - Manage document templates.
   - Supervise AI usage and audit activity.

3. **Secure AI assistance**
   - ARIA answers from authorized HR data and approved indexed documents.
   - ARIA can propose actions for leave and document requests.
   - Sensitive data access is role-scoped.
   - Document RAG is grounded in indexed internal documents.

4. **Privacy-preserving QVT analytics**
   - QVT risk analytics are aggregate-only.
   - No employee-level burnout or disengagement scores are exposed.
   - Manager sees only team aggregate metrics.
   - QVT role sees company/department aggregates.

---

## 2. Repository structure

```text
lastversion/
├── hr-ai-backend/       # NestJS API, Prisma schema, Docker services, ML scripts
├── frontend-new/        # Main desktop web app using React + Chakra + Purity UI style
├── frontend-pwa/        # Mobile PWA prototype, currently not used for the main demo
└── APP_DOCUMENTATION.md # This file
```

Main folders:

```text
hr-ai-backend/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   ├── fixtures/
│   └── migrations/
├── src/
│   ├── modules/
│   ├── services/
│   ├── common/
│   └── main.ts
├── ml/
│   ├── train_qvt_models.py
│   ├── requirements.txt
│   ├── data/       # local Kaggle CSVs, not meant for public sensitive data
│   └── artifacts/  # trained model outputs
└── docker-compose.yml
```

```text
frontend-new/
├── src/
│   ├── api/        # API client, typed models, query hooks
│   ├── app/        # providers, auth context, router
│   ├── assets/
│   ├── components/
│   ├── features/   # app pages by business domain
│   ├── layouts/
│   ├── purity/     # adapted Purity UI dashboard components
│   └── theme/
└── package.json
```

---

## 3. High-level architecture

The application is a modular monolith with a separate frontend.

```text
Browser / frontend-new
        │
        ▼
React + Chakra UI + TanStack Query
        │ HTTP / JSON / SSE
        ▼
NestJS backend API
        │
        ├── PostgreSQL + Prisma
        ├── pgvector document embeddings
        ├── Redis for short-lived state / MFA challenges / cache-like flows
        ├── MinIO object storage
        ├── Hugging Face TEI local embeddings container
        ├── OpenCode Go LLM API for chat and generation
        ├── Presidio for anonymization
        └── Gotenberg for document/PDF generation
```

The backend remains the source of truth for:

- authentication;
- MFA;
- consent;
- role authorization;
- document access;
- AI data access rules;
- QVT privacy boundaries;
- audit logs.

The frontend never decides whether sensitive data is allowed. It only renders what the API returns.

---

## 4. Technology stack

### Backend

| Area | Technology |
|---|---|
| Runtime | Node.js |
| Framework | NestJS |
| Language | TypeScript |
| ORM | Prisma |
| Database | PostgreSQL |
| Vector search | pgvector |
| Auth | JWT + refresh tokens + Passport |
| MFA | TOTP / Google Authenticator compatible |
| Storage | MinIO, S3-compatible |
| Cache / temporary state | Redis |
| Document parsing | Mammoth, pdf-parse |
| DOCX templating | Docxtemplater + PizZip |
| PDF conversion | Gotenberg |
| Anonymization | Microsoft Presidio Analyzer + Anonymizer |
| Embeddings | Hugging Face Text Embeddings Inference |
| Embedding model | `sentence-transformers/all-MiniLM-L6-v2`, 384 dimensions |
| Chat LLM | OpenCode Go API |
| API docs | Swagger |
| Tests | Jest |

### Frontend

| Area | Technology |
|---|---|
| Framework | React |
| Language | TypeScript |
| Build tool | Vite |
| UI system | Chakra UI |
| Visual base | Adapted Purity UI Dashboard components |
| Server state | TanStack Query |
| Routing | React Router |
| Charts | ApexCharts / React ApexCharts |
| Markdown | react-markdown + remark-gfm |
| Tests | Vitest + Testing Library |

### Infrastructure services

`hr-ai-backend/docker-compose.yml` starts:

- `backend`
- `postgres`
- `redis`
- `minio`
- `embeddings`
- `presidio-analyzer`
- `presidio-anonymizer`
- `gotenberg`

---

## 5. Backend modules

The backend is split into feature modules under `hr-ai-backend/src/modules`.

| Module | Purpose |
|---|---|
| `auth` | Login, MFA, JWT refresh, logout, current user |
| `consents` | Terms/CGU consent state |
| `users` | Account management, roles, settings |
| `employees` | Employee listing, details, imports, scoped access |
| `dashboard` | Employee, HR, manager, admin dashboard metrics |
| `documents` | HR document upload, validation, archive, preview, download, indexing metadata |
| `generated-documents` | Generated employee documents, clear/anonymized access |
| `rag` | Document indexing, pgvector retrieval, RAG search |
| `chat` | ARIA chat, intent routing, history, action drafts |
| `onboarding` | Onboarding/offboarding activation and task completion |
| `notifications` | Account-scoped notifications |
| `hr-contact` | HR inbox/contact requests |
| `audit` | Audit log creation and admin audit UI data |
| `qvt` | Aggregate QVT predictions and privacy-preserving analytics |
| `prediction` | Legacy/basic prediction endpoints |
| `alerts` | Security/HR alerts |
| `admin` | Admin-specific functionality |
| `data-erasure` | Queue-only right-to-erasure workflow |

---

## 6. Frontend pages and routes

The main frontend is `frontend-new`.

### Public routes

| Route | Page |
|---|---|
| `/login` | Login form |
| `/mfa` | TOTP MFA verification/setup |
| `/consent` | Terms/consent acceptance |

### Employee routes

| Route | Page |
|---|---|
| `/employee/dashboard` | Employee dashboard |
| `/employee/activities` | Activity view |
| `/employee/vacations` | Leave request/history |
| `/employee/request-document` | Document request form |
| `/employee/documents` | Personal documents and generated documents |
| `/employee/onboarding` | Onboarding/offboarding journey |

### HR routes

| Route | Page |
|---|---|
| `/hr/dashboard` | HR dashboard |
| `/hr/employees` | Employee directory |
| `/hr/employees/:id` | Employee detail |
| `/hr/vacations` | HR leave self-service |
| `/hr/request-document` | HR document self-service |
| `/hr/documents` | Document library and templates |
| `/hr/requests` | Request review |
| `/hr/inbox` | HR inbox/messages |
| `/hr/right-to-erasure` | Right-to-erasure request queue |

### Manager routes

| Route | Page |
|---|---|
| `/manager/dashboard` | Manager dashboard |
| `/manager/team` | Team view |
| `/manager/vacations` | Manager leave self-service |
| `/manager/request-document` | Manager document self-service |
| `/manager/requests` | Team request review |
| `/manager/risks` | Aggregate team QVT view |

### Admin routes

| Route | Page |
|---|---|
| `/admin/dashboard` | Admin/HR-style dashboard |
| `/admin/accounts` | Account management |
| `/admin/employees` | Employee directory |
| `/admin/employees/:id` | Employee detail |
| `/admin/vacations` | Admin leave self-service |
| `/admin/request-document` | Admin document self-service |
| `/admin/documents` | Document library and templates |
| `/admin/requests` | Request review |
| `/admin/ai-supervision` | AI supervision |
| `/admin/right-to-erasure` | Right-to-erasure queue |
| `/admin/audit` | Audit logs |

### QVT routes

| Route | Page |
|---|---|
| `/qvt/dashboard` | Company aggregate QVT dashboard |
| `/qvt/analytics` | Anonymous department analytics |

### Shared authenticated routes

| Route | Page |
|---|---|
| `/assistant` | Full ARIA assistant |
| `/profile` | User profile |
| `/settings` | User settings |

---

## 7. Role model and access rules

The app uses backend roles mapped to frontend shells.

| Backend role | Frontend shell |
|---|---|
| `COLLABORATOR` | Employee |
| `HR` | HR |
| `MANAGER` | Manager |
| `ADMIN` | Admin |
| `QVT` | QVT |

### Core authorization rules

#### Employee / collaborator

Can access:

- own profile;
- own leave balance and leave requests;
- own document requests;
- own generated documents;
- own onboarding/offboarding tasks;
- public approved documents through ARIA/RAG.

Cannot access:

- other employees’ records;
- salaries of others;
- private employee documents of others;
- QVT risk data.

#### Manager

Can access:

- direct reports;
- team request review;
- aggregate team QVT metrics;
- non-sensitive team information;
- public approved documents.

Cannot access:

- salaries;
- private/payroll/medical documents;
- individual QVT/burnout/disengagement scores;
- non-team employee details.

#### HR

Can access:

- employee directory and HR workflows;
- requests;
- documents/templates;
- HR inbox;
- most employee operational data.

Cannot access:

- AI supervision;
- admin-only audit UI;
- QVT analytics as a QVT role.

#### Admin

Can access:

- accounts;
- employee directory;
- document library;
- request review;
- AI supervision;
- audit logs;
- right-to-erasure queue.

Admin is not the QVT analytics role in the latest product direction.

#### QVT

Can access:

- anonymous company aggregate QVT dashboard;
- anonymous department-level QVT analytics.

Cannot access:

- employee names in risk data;
- individual risk scores;
- employee-level risk factors;
- salary or HR private documents.

---

## 8. Authentication and consent workflow

The authentication flow is:

```text
Login email/password
        │
        ▼
MFA challenge
        │
        ├── first login: generate TOTP secret + QR code
        └── existing MFA: ask for 6-digit code
        │
        ▼
Issue access token + refresh token
        │
        ▼
Check consent / CGU
        │
        ├── not accepted: redirect to consent page
        └── accepted: redirect to role dashboard
```

Important details:

- Password login alone does **not** issue a usable full session.
- MFA challenges are short-lived and backed by Redis.
- TOTP is compatible with Google Authenticator and similar apps.
- Consent fields are stored on `User`:
  - `termsAcceptedAt`
  - `termsVersion`
  - `consents`
- `/auth/me` returns MFA and consent status so the frontend can route correctly.

---

## 9. Main business workflows

### 9.1 Leave request workflow

```text
Employee / Manager / HR / Admin
        │
        ▼
Creates leave request manually or via ARIA
        │
        ▼
HrRequest(kind = VACATION, status = PENDING)
        │
        ▼
Manager / HR / Admin reviews
        │
        ├── approve → absence created/linked, notification generated
        ├── reject  → notification generated
        └── reopen  → request returns to pending
```

Supported behavior:

- Manual leave request.
- ARIA-proposed leave request.
- Review by authorized roles.
- Reopening previously approved requests.
- Optional attachment support for leave requests.

### 9.2 Document request workflow

```text
User selects document template
        │
        ▼
Frontend/backend detect required template fields
        │
        ▼
User provides request-specific fields
        │
        ▼
HrRequest(kind = DOCUMENT)
        │
        ▼
HR/Admin review/generation
        │
        ▼
Generated document created
        │
        ├── clear PDF for employee owner
        └── anonymized PDF for HR/Admin/manager preview
```

Important privacy rule:

- Highly sensitive request-time values such as CIN should not be stored permanently in normal employee records.
- Sensitive fields should be used only for generation and redacted/anonymized where appropriate.

### 9.3 Document template workflow

```text
HR/Admin uploads DOCX template
        │
        ▼
Template bracket labels are detected
        │
        ▼
Fields are mapped:
        ├── employee data
        ├── system/company data
        ├── request-specific input
        └── HR manual input
        │
        ▼
Employees request documents using that template
```

The current Atlas Tech template style uses bracket labels such as:

```text
[Nom et Prénom de l'employé(e)]
[Numéro CIN]
[Numéro CNSS personnel]
```

### 9.4 HR document upload/index workflow

```text
HR/Admin uploads document
        │
        ▼
Document stored in MinIO
        │
        ▼
Status = PENDING_REVIEW
        │
        ▼
HR/Admin validates document
        │
        ▼
Status = APPROVED
        │
        ▼
RAG indexing:
        ├── parse PDF/DOCX/TXT
        ├── chunk text
        ├── embed with local TEI model
        ├── store vectors in pgvector
        └── update indexing metadata
```

Indexing metadata on `HrDocument`:

- `indexedStatus`
- `indexedAt`
- `indexError`
- `chunkCount`

### 9.5 Onboarding/offboarding workflow

```text
HR/Admin activates workflow for employee
        │
        ▼
OpenCode Go generates tailored tasks
        │
        ▼
WorkflowTask rows are created
        │
        ▼
First task unlocked, later tasks locked
        │
        ▼
Completing a task unlocks the next one
        │
        ▼
Final task completion updates employee/user state
```

Onboarding:

- Employee status becomes `ONBOARDING`.
- User onboarding state becomes `ON`.
- When complete:
  - Employee status becomes `ACTIVE`.
  - User onboarding state becomes `OFF`.

Offboarding:

- Employee status becomes `OFFBOARDING`.
- User onboarding state becomes `OFFBOARDING`.
- When complete:
  - Employee status becomes `INACTIVE`.
  - User account can be suspended.

### 9.6 HR contact workflow

```text
Employee sends HR message
        │
        ▼
HrContactRequest created
        │
        ▼
HR/Admin inbox displays it
        │
        ▼
HR/Admin updates status:
        ├── OPEN
        ├── IN_PROGRESS
        └── RESOLVED
```

### 9.7 Notification workflow

Notifications are account-based.

They can be generated by:

- request decisions;
- generated documents;
- onboarding changes;
- alerts;
- system events.

Notifications include:

- type;
- title/message;
- read state;
- optional `actionUrl`;
- optional resource type/id;
- priority.

---

## 10. ARIA assistant architecture

ARIA is the HR assistant integrated into the platform.

It supports:

- normal HR conversation within controlled scope;
- document RAG over approved indexed documents;
- employee-data answers according to role;
- action proposals for leave requests;
- action proposals for document requests;
- citations/sources for document-based answers;
- chat history.

### Chat pipeline

```text
User message
        │
        ▼
Save message in conversation
        │
        ▼
LLM intent/router step
        │
        ├── GENERAL_CHAT
        ├── DOCUMENT_RAG
        ├── EMPLOYEE_DATA
        ├── ORG_DATA
        ├── SELF_SERVICE_INFO
        ├── PROPOSE_LEAVE_REQUEST
        └── PROPOSE_DOCUMENT_REQUEST
        │
        ▼
Backend authorization
        │
        ▼
Context retrieval
        ├── database context
        └── indexed document chunks
        │
        ▼
Grounded answer or action draft
```

### Grounding rule

ARIA should not answer company, HR, legal, policy, employee, document, salary, onboarding, or leave questions from generic model knowledge.

For these topics, it must use:

- authorized database context;
- approved indexed documents;
- or return a refusal/missing-data answer.

### Action drafts

ARIA can propose:

- `CREATE_LEAVE_REQUEST`
- `CREATE_DOCUMENT_REQUEST`

Actions are not executed immediately. The flow is:

```text
ARIA detects action intent
        │
        ▼
ARIA extracts required fields
        │
        ▼
If missing fields:
        ask follow-up
        │
        ▼
If complete:
        create action draft
        │
        ▼
User clicks Accept or Cancel
        │
        ▼
Backend executes or cancels draft
```

Action drafts are:

- temporary;
- user-scoped;
- explicit-confirmation only;
- audited.

### Conversation history

Each user has their own chat conversations.

The regular conversation list shows the latest conversations for the authenticated user only. Older data can remain stored for audit/supervision.

---

## 11. RAG and document search

The RAG system uses local embeddings and PostgreSQL vector search.

```text
Approved HR document
        │
        ▼
Parse text
        │
        ▼
Chunk text
        │
        ▼
Embedding via local TEI container
        │
        ▼
Store chunk + vector in PostgreSQL/pgvector
        │
        ▼
ARIA document query
        │
        ▼
Apply authorization filters
        │
        ▼
pgvector similarity search
        │
        ▼
Send authorized chunks to LLM
```

Embedding service:

- Docker image: `ghcr.io/huggingface/text-embeddings-inference:cpu-1.9`
- Model: `sentence-transformers/all-MiniLM-L6-v2`
- Dimensions: `384`
- API: OpenAI-compatible `/v1/embeddings`

Document chunk storage:

- `DocumentChunk.chunkText`
- `DocumentChunk.embedding`
- `DocumentChunk.embeddingModel`
- `DocumentChunk.documentId`
- chunk order/page metadata

Authorization is applied before chunks are used for answer generation.

---

## 12. Document security and anonymization

The document system separates clear and anonymized access.

### Uploaded HR documents

Uploaded documents have:

- status: draft/pending/approved/archived;
- visibility:
  - public;
  - role-restricted;
  - employee-private;
- allowed roles;
- owner employee if private.

Public approved documents can be queried by every authenticated role through ARIA/RAG.

### Generated documents

Generated employee documents can store:

- clear PDF path;
- anonymized PDF path;
- metadata;
- status.

Access rules:

| User | Access |
|---|---|
| Employee owner | Clear generated document |
| HR/Admin | Anonymized preview/download |
| Manager | Anonymized direct-report document only |
| Other collaborator | No access |

### Anonymization services

The backend uses:

- Presidio Analyzer;
- Presidio Anonymizer;
- Gotenberg for PDF conversion.

The goal is to make sensitive fields visually unavailable for reviewers who do not need clear personal data.

---

## 13. QVT prediction and privacy model

QVT is designed as an aggregate-only analytics module.

It should never expose:

- employee names;
- employee IDs;
- individual burnout score;
- individual disengagement score;
- individual risk factors;
- individual recommendations.

### Manager view

Managers see:

- team aggregate employee count;
- average burnout risk;
- average disengagement risk;
- aggregate top drivers;
- general model recommendation.

### QVT view

QVT role sees:

- company aggregate view;
- department-filtered aggregate view;
- department comparison where group size allows.

### Privacy guard

Groups smaller than 3 employees are hidden.

The API returns an insufficient-group-size state instead of exposing risky small-group analytics.

### ML pipeline

Local training scripts live under:

```text
hr-ai-backend/ml/
```

The scripts are intended for local/demo model training from Kaggle-style datasets.

Expected outputs are stored in:

```text
hr-ai-backend/ml/artifacts/
```

The backend uses artifacts for QVT recomputation. If artifacts are missing, QVT should show a clear “model not trained/unavailable” state rather than fake predictions.

---

## 14. Audit and observability

Audit logs exist for sensitive and operational actions.

Examples:

- login/logout events;
- document preview/download;
- document validation/archive/reindex;
- request approve/reject/reopen;
- generated document preview/download/validation;
- template changes;
- ARIA sensitive refusals/actions;
- onboarding/offboarding actions.

Audit UI is admin-only.

Audit data is stored in `AuditLog`:

- actor user;
- action;
- resource type/id;
- status;
- metadata;
- timestamp.

---

## 15. Data model highlights

Important Prisma models:

| Model | Purpose |
|---|---|
| `User` | Login account, MFA, consent, settings, role links |
| `Role` / `Permission` | RBAC model |
| `Employee` | Employee profile and HR metrics |
| `Department` | Organization grouping |
| `JobPosition` | Role/position metadata |
| `HrRequest` | Leave and document requests |
| `HrRequestComment` | Public/internal request notes |
| `Absence` | Leave/absence records |
| `HrDocument` | Uploaded HR documents |
| `DocumentChunk` | RAG text chunks and vectors |
| `DocumentTemplate` | DOCX template metadata and field schema |
| `GeneratedDocument` | Generated clear/anonymized documents |
| `WorkflowTask` | Onboarding/offboarding tasks |
| `AiConversation` | Chat conversation |
| `AiMessage` | Chat messages |
| `AiActionDraft` | Pending ARIA actions |
| `Notification` | Account-scoped notification |
| `AuditLog` | Audit trail |
| `QvtPredictionSnapshot` | Aggregate QVT predictions |
| `DataErasureRequest` | Queue-only right-to-erasure requests |

---

## 16. Local development

### Backend

```powershell
cd hr-ai-backend
npm install
Copy-Item .env.example .env
```

Set the OpenCode Go key:

```text
OPENCODE_GO_API_KEY=...
```

Start infrastructure and backend:

```powershell
docker compose up --build
```

Useful commands:

```powershell
npm run build
npm test
npx prisma validate
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Backend URLs:

```text
API:     http://localhost:3000/api
Swagger: http://localhost:3000/api/docs
Health:  http://localhost:3000/health
MinIO:   http://localhost:9001
```

### Frontend

```powershell
cd frontend-new
npm install
npm run dev
```

Default frontend URL:

```text
http://localhost:5173
```

Build/test:

```powershell
npm run build
npm test -- --run
```

### Environment variables

Backend `.env` important values:

```text
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hr_ai?schema=public
JWT_SECRET=...
JWT_REFRESH_SECRET=...
OPENCODE_GO_API_KEY=...
OPENCODE_GO_BASE_URL=https://opencode.ai/zen/go/v1
OPENCODE_GO_MODEL=deepseek-v4-flash
EMBEDDING_PROVIDER=tei
EMBEDDING_BASE_URL=http://embeddings:80/v1
EMBEDDING_MODEL=text-embeddings-inference
EMBEDDING_DIMENSIONS=384
MINIO_ENDPOINT=localhost
MINIO_PUBLIC_ENDPOINT=http://localhost:9000
PRESIDIO_ANALYZER_URL=http://localhost:5002
PRESIDIO_ANONYMIZER_URL=http://localhost:5001
GOTENBERG_URL=http://localhost:3001
```

Frontend `.env`:

```text
VITE_API_BASE_URL=/api
```

---

## 17. Demo credentials

Seeded accounts depend on the current seed file, but the usual demo pattern is:

```text
admin@ydays.local
hr@ydays.local
manager@ydays.local
collab@ydays.local
qvt@ydays.local
```

The login flow requires MFA. On first login, the app can show a QR code/secret for Google Authenticator setup.

---

## 18. Deployment model

The current deployment model is Docker Compose for local/demo usage.

```text
docker compose up --build
```

For production, the following should be hardened:

- secrets management;
- HTTPS;
- CORS origins;
- MinIO/S3 credentials;
- database backups;
- Redis persistence/security;
- OpenCode Go/API key handling;
- Presidio/Gotenberg network isolation;
- audit log retention;
- object storage lifecycle rules;
- migration strategy.

---

## 19. Security principles

The app follows these principles:

1. **Backend authorization is the source of truth**
   - The frontend never decides sensitive access.

2. **Least privilege**
   - Each role only sees the minimum necessary data.

3. **Explicit AI actions**
   - ARIA proposes actions, but the user must confirm them.

4. **Grounded answers**
   - HR/company/legal/document answers must come from approved data or indexed documents.

5. **Sensitive document separation**
   - Clear documents are only for the owning employee when applicable.
   - HR/manager/admin preview can use anonymized versions.

6. **Privacy-preserving QVT**
   - QVT analytics are aggregate-only.
   - No individual risk exposure.

7. **Auditability**
   - Sensitive actions should be logged.

---

## 20. Known product boundaries

The current app is a strong demo/MVP, not a complete enterprise HRIS.

Not fully covered yet:

- payroll integration;
- real payroll processing;
- external HRIS sync;
- advanced reporting warehouse;
- production-grade email notifications;
- full offline mobile mode;
- complete legal archival policy;
- full model monitoring and retraining lifecycle;
- production identity provider integration;
- full DPO/compliance workflow automation.

---

## 21. Recommended demo narrative

Suggested flow for presenting the product:

1. Login with MFA.
2. Show role-based dashboard.
3. As employee:
   - request leave;
   - request a document;
   - preview generated document;
   - ask ARIA a self-service question.
4. As HR/Admin:
   - review pending request;
   - upload/validate/index a public policy document;
   - show employee directory and document library;
   - show AI supervision/audit as admin.
5. As manager:
   - review team requests;
   - show team aggregate QVT view.
6. As QVT:
   - show anonymous company and department analytics.
7. Close with governance:
   - local storage;
   - role-filtered AI;
   - local embeddings;
   - anonymization;
   - auditability.

