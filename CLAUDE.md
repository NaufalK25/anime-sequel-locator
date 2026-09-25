# CLAUDE.md

Anime sequel locator: a client-only Vue SPA. Given an AniList or MyAnimeList
username, it finds every anime related to what the user has watched (sequels,
movies, OVAs, side stories, PV/CM/music extras) and lets them filter and exclude
results.

## Commands

- `npm run dev`: dev server on http://localhost:5173
- `npm run build`: type-check (`vue-tsc`) then build. Run this to verify changes.
- `npm run typecheck`: type-check only
- MAL proxy: `cd worker && npx wrangler deploy` (needs the `MAL_CLIENT_ID` secret)

There are no tests yet. If you add them, use Vitest and start with the pure
functions in `src/core/` (`filters.ts`, `franchises.ts`).

## Stack and constraints

Vue 3 (`<script setup>`, Composition API) + Vite + TypeScript (strict).
The only runtime dependency besides Vue is `idb-keyval`.

Keep it lightweight. Ask before adding a dependency, and do not add
vue-router, Pinia, a UI component library, Axios, or a GraphQL client
(Apollo/urql). Plain `fetch` and composables cover this app.

There is no backend. The only server code is `worker/mal-proxy.js`, which
exists solely because MAL's API sends no CORS headers.

## Architecture

Data flows in one direction:

1. `src/providers/`: read the user's list.
   - `anilist.ts`: GraphQL calls, all routed through the rate limiter in `gql()`.
   - `mal.ts`: reads the MAL list via the proxy, then maps MAL ids to AniList
     ids. AniList is the single canonical graph for both sources; every
     `MediaNode.id` is an AniList id.
2. `src/core/crawler.ts`: breadth-first walk from watched entries, following
   only the chosen relation types. Unwatched entries keep being expanded
   (S1 watched → S2 → S3 finds both). Relations are cached in IndexedDB
   under `rel:{id}` via `core/cache.ts`.
3. `src/core/franchises.ts`: union-find over relation edges → franchises
   (connected components), each split into watched entries and suggestions.
4. `src/core/filters.ts`: pure function applying view filters.

State lives in two composables, used as module-level singletons:

- `useSettings.ts`: one `reactive` object persisted to localStorage
  (key `sequel-locator:settings:v1`).
- `useLocator.ts`: run state, plus the list and graph in `shallowRef`s.

Settings come in two kinds, and the distinction matters:

- **Search settings** (`watchedStatuses`, `follow`, `crawlDepth`) change what
  gets fetched and need a new run.
- **View filters** (`settings.filters`) are applied by `applyFilters` in a
  `computed` and must never trigger network requests.

When adding a filter: add the field to `ViewFilters`, a default in
`useSettings.ts`, logic in `applyFilters`, and a control in `FilterPanel.vue`.

## API rules

- Every AniList request goes through `gql()` so it passes the limiter and the
  429 retry. Never call `fetch` on AniList directly.
- AniList is currently limited to 30 req/min (documented normal: 90).
  The limiter spaces requests 2100 ms apart. Don't lower it.
- Batch by id: `Page(perPage: 50)` with `id_in` / `idMal_in`. Never fetch
  one media per request.
- Filter relation nodes to `type === 'ANIME'`; relations include manga and novels.
- Use `relationType(version: 2)` so COMPILATION and CONTAINS are returned.
- AniList has no PV/CM formats; those usually appear as MUSIC, SPECIAL or ONA
  with relation OTHER.
- The MAL proxy only allows `/users/{name}/animelist` and `/anime/{id}`.
  Widen `ALLOWED_PATH` in the worker deliberately, not by default.
- If you change the shape of `MediaWithRelations`, bump the cache key prefix
  (e.g. `rel2:`) so stale cached objects aren't read with the new type.
- If you change the `Settings` shape incompatibly, bump the localStorage key
  version.

## Conventions

- `<script setup lang="ts">` in every component; `defineModel` for v-model.
- Graph-sized data (thousands of objects) goes in `shallowRef`, not `reactive`.
- Enum values are AniList's (`SIDE_STORY`, `NOT_YET_RELEASED`). Convert to
  display text only with `label()` from `core/labels.ts`; add overrides there.
- Plain CSS in `src/style.css` using the custom properties on `:root`. No CSS
  framework. All colors live in the two `:root` blocks at the top; don't write a
  color value anywhere else. `--accent` marks unwatched things, `--seen` marks entries
  already on the user's list; keep those meanings. Dark mode comes from
  `prefers-color-scheme`, so every new color needs both values.
- UI copy: sentence case, plain words, errors say what happened and what to do.

## Known gaps

- MAL has more PV/CM/music entries than AniList. Planned: a second crawler
  using the proxy's `/anime/{id}?fields=related_anime`.
- `CHARACTER` relations are off by default because crossovers balloon the graph.
- Private lists aren't supported (would need OAuth for each source).
