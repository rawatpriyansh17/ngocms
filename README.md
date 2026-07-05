# Sitaram Seva Sansthan CMS Dashboard

Private content management dashboard for **Sitaram Seva Sansthan**, the NGO behind `sitaramsevasansthan.org`.

This project powers the editorial backend for the public website in `../NGOCODE`. It owns the CMS database, media workflow, public content APIs, and AI knowledge embeddings used by the Sarthi assistant.

> Status: private/portfolio project maintained by a solo developer for Sitaram Seva Sansthan. This is not currently an open-source contribution project.

## What This App Does

- Provides a secured dashboard for managing website posts, events, event media, and the latest upcoming program flyer.
- Stores CMS content in English as the single source of truth.
- Uploads images/videos through ImageKit and stores public URLs in the CMS database.
- Exposes public read APIs consumed by the `NGOCODE` website.
- Maintains a CMS-owned vector knowledge base for the Sarthi AI assistant.
- Provides protected AI search and embedding sync endpoints.
- Shows an "AI Brain" sync indicator so dashboard users know whether new content was learned by the assistant.

## Tech Stack

| Area | Technologies |
| --- | --- |
| Framework | Next.js 16 App Router, React 19, TypeScript |
| Dashboard UI | Tailwind CSS 4, shadcn/Radix UI, Motion for React |
| Authentication | Clerk |
| Database | Turso/libSQL, Drizzle ORM, Drizzle Kit |
| Media | ImageKit upload auth, drag-and-drop uploads |
| AI/RAG | Vercel AI SDK, AI Gateway, `openai/text-embedding-3-small`, Turso vector search |
| Forms/UX | React Hook Form, Zod, toast feedback, progress indicators |
| Interactions | Drag-and-drop ordering with `@hello-pangea/dnd`, searchable comboboxes |
| Tooling | ESLint, TypeScript |

## System Architecture

```txt
CMS user
  |
  v
ngocms dashboard
  |-- authenticated editing --> Turso CMS database
  |-- media upload auth -----> ImageKit
  |-- public read APIs ------> NGOCODE public website
  |
  |-- embedding sync --------> AI Gateway embeddings
                               |
                               v
                            content_embeddings table
                               |
                               v
                         protected /api/ai/search
                               |
                               v
                         NGOCODE Sarthi assistant
```

The dashboard is the source of truth for editable content. The public website never writes CMS content directly; it reads through public API routes and calls protected AI search only with a shared internal secret.

## Core Dashboard Modules

### Posts Manager

- Create, edit, delete, and reorder public activity posts.
- Supports image and video posts.
- Stores optional event-page slug links so posts can lead visitors to full event coverage.
- New posts appear at the top by default to reduce manual reordering.
- Uses upload progress, success/error toasts, confirmation dialogs, and fallback previews.

### Events Manager

- Creates event detail pages with slug, heading, descriptions, and active/inactive state.
- Keeps only English CMS fields; translation is handled by the public website layer.
- Provides direct links to preview public event pages.
- Integrates with event media management.

### Event Media Manager

- Adds photos and videos to events.
- Supports photo captions, video thumbnails, and video category metadata.
- Uses searchable event slug selection for faster editing.
- Supports media ordering and deletion confirmation.

### Latest Event Manager

- Manages the flyer/image shown on the public upcoming program page.
- Allows the NGO to mark the latest event active/inactive.
- If inactive, the public site displays a polished "no upcoming program" state.

### AI Brain Sync Indicator

- Shows whether the assistant has learned the latest saved content.
- Displays clear states such as synced, learning, paused, and failed.
- Provides retry when embedding sync fails due to rate limits or provider issues.
- Tracks latest successful sync time and latest change status in user-friendly language.

## Database Model

The CMS Turso database contains:

| Table | Purpose |
| --- | --- |
| `posts` | Homepage/public activity posts with media URLs, order, and active state |
| `events` | Event detail pages with slug, descriptions, subheadings, and active state |
| `media` | Event photos/videos with captions, thumbnails, ordering, and video type |
| `latest_event` | Single upcoming-program flyer configuration |
| `content_embeddings` | Vector-searchable CMS/site knowledge chunks for Sarthi |

The `content_embeddings` table stores `F32_BLOB(1536)` embeddings generated with `openai/text-embedding-3-small`.

## AI/RAG Design

The RAG system is owned by the CMS because the CMS owns content lifecycle.

### Embedding Sources

- Active posts
- Active events
- Event media metadata
- Latest event flyer information
- Curated site facts such as donation methods, contact details, mission, services, and navigation

### Sync Strategy

- Content is normalized and hashed before embedding.
- If a source has not changed, existing embeddings are reused and no new embedding call is needed.
- If content changes, the old source chunks are replaced with fresh chunks.
- Deleted or inactive content is removed or marked inactive so Sarthi does not answer from outdated information.
- Manual retry is available from the dashboard when provider rate limits interrupt a sync.

### Search Flow

```txt
NGOCODE /api/chat
  |
  v
ngocms /api/ai/search
  |
  v
Embed query with AI Gateway
  |
  v
Turso vector_top_k search
  |
  v
Return compact chunks to public chat route
```

The search endpoint is protected with `x-cms-ai-secret` and is not meant for public browser access.

## Public API Surface

The public website consumes:

| Route | Used For |
| --- | --- |
| `GET /api/public/posts` | Paginated homepage posts |
| `GET /api/public/events` | Active event list/metadata |
| `GET /api/public/events/[slug]` | Full event details with media |
| `GET /api/public/latest-event` | Upcoming program flyer |

Internal/protected AI routes:

| Route | Purpose |
| --- | --- |
| `POST /api/ai/search` | Protected vector search for Sarthi |
| `POST /api/ai/embeddings/sync` | Backfill or refresh embeddings |
| `GET /api/dashboard/ai-sync/status` | Dashboard sync status polling |
| `POST /api/dashboard/ai-sync/retry` | Manual sync retry from UI |

## Environment Variables

Expected environment variables:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Turso CMS database
TURSO_CONNECTION_URL=
TURSO_AUTH_TOKEN=
TURSO_SYNC_URL=

# ImageKit
IMAGEKIT_PUBLIC_KEY=
IMAGEKIT_PRIVATE_KEY=
NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=

# AI Gateway / Sarthi embeddings
AI_GATEWAY_API_KEY=
CMS_AI_API_SECRET=
```

Do not commit real secrets. Local values should live in `.env`.

## Local Development

Install dependencies:

```bash
npm install
```

Run the CMS locally:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

Push schema changes to Turso:

```bash
npx drizzle-kit push
```

Backfill embeddings after the database schema and AI Gateway credentials are ready:

```bash
curl -X POST "http://localhost:3000/api/ai/embeddings/sync" \
  -H "x-cms-ai-secret: YOUR_CMS_AI_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"sourceType":"all"}'
```

The dashboard retry button can also be used for small retries after the initial setup.

## Engineering Challenges Solved

- Built a custom CMS instead of relying on static content files.
- Removed hardcoded Hindi CMS fields and kept English as the clean source of truth.
- Added media-heavy editing flows with ImageKit upload auth, progress UI, fallbacks, and confirmation dialogs.
- Designed public API routes that keep the dashboard private while allowing the public site to render content.
- Added CMS-owned RAG embeddings so the public AI assistant can answer from current website content without duplicating CMS data into the payment database.
- Implemented hash-based embedding refresh to reduce repeat AI Gateway usage.
- Added rate-limit-aware sync states and dashboard UX for non-technical users.
- Tuned responsive dashboard UI for real content editing on smaller screens.

## Resume Highlights

This project demonstrates:

- Full-stack dashboard engineering with authentication, database schema design, and media workflows.
- Production-style separation of public website, CMS, payment records, and AI knowledge storage.
- Practical AI/RAG implementation using embeddings, vector search, protected internal APIs, and sync status UX.
- Data lifecycle thinking: create/update/delete content, refresh embeddings, public revalidation, and stale-content prevention.
- UI polish for operational software used by non-technical NGO administrators.

## Related Project

The public website lives in `../NGOCODE`. It consumes this CMS, renders the public experience, handles Razorpay donations, and hosts the Sarthi AI assistant UI.
