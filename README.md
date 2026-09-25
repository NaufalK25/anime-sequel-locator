# Sequel Locator

Finds every anime related to what you've watched (sequels, movies, OVAs, side stories,
and the obscure PV/CM/music entries) from an AniList or MyAnimeList username, with
filters and per-entry / per-franchise exclusions.

Stack: Vue 3 + Vite + TypeScript, `idb-keyval` for caching. No router, no Pinia, no UI kit.

## Run

    npm install
    npm run dev

AniList works out of the box. For MyAnimeList, deploy the proxy (below) and set
`VITE_MAL_PROXY_URL` in `.env`.

## How it works

1. **Read the list** (`providers/`). AniList via GraphQL straight from the browser.
   MAL via the proxy, then each MAL id is mapped to its AniList entry (`idMal_in`)
   so there's one relation graph for both sources.
2. **Crawl** (`core/crawler.ts`). Breadth-first from every watched entry, fetching
   relations 50 ids per request, following only the relation types you choose.
   Unwatched entries keep being expanded, so S1 → S2 → S3 finds both S2 and S3.
   Results are cached in IndexedDB (7 days by default).
3. **Group** (`core/franchises.ts`). Union-find over relation edges gives franchises.
4. **Filter** (`core/filters.ts`). A pure function over the franchises, so every
   filter change is instant and needs no network.

Settings split in two: _search settings_ change what's fetched (re-run needed),
_filters_ only change what's shown.

## MAL proxy

MAL's API sends no CORS headers, so browsers can't call it directly.

    cd worker
    npx wrangler secret put MAL_CLIENT_ID   # from https://myanimelist.net/apiconfig
    npx wrangler deploy

Add your site's origin to `ALLOWED_ORIGINS` in `wrangler.toml`.

## Known gaps / next steps

- AniList has no PV/CM formats; those usually appear as MUSIC, SPECIAL or ONA with
  relation OTHER. MAL's database has more of them. To catch MAL-only entries, add a
  second crawler over the proxy's `/anime/{id}?fields=related_anime` endpoint.
- `CHARACTER` relations are off by default because crossovers (e.g. shared-universe
  franchises) balloon the graph. Turn it on and lower the depth if you want them.
- Ideas: "sort by what to watch next" (chronological chain), total runtime per
  franchise, export/import exclusions, shareable filter URLs.
