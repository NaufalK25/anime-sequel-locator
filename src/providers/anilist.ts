import { createLimiter, sleep } from "../core/rateLimiter";
import type {
  Cover,
  ListStatus,
  MediaFormat,
  MediaNode,
  MediaStatus,
  MediaWithRelations,
  RelationType,
  UserList,
} from "../types";

const ENDPOINT = "https://graphql.anilist.co";
// AniList documents 90 req/min but has run in a degraded 30/min mode; stay polite.
const limiter = createLimiter(1000);

const NODE = `id idMal type format status episodes seasonYear siteUrl title { romaji english } coverImage { medium large extraLarge }`;

interface RawNode {
  id: number;
  idMal: number | null;
  type: "ANIME" | "MANGA";
  format: MediaFormat | null;
  status: MediaStatus | null;
  episodes: number | null;
  seasonYear: number | null;
  siteUrl: string;
  title: { romaji: string | null; english: string | null };
  coverImage: Cover | null;
}

function toNode(r: RawNode): MediaNode {
  return {
    id: r.id,
    idMal: r.idMal,
    title: r.title.romaji ?? r.title.english ?? `#${r.id}`,
    titleEnglish: r.title.english,
    format: r.format,
    status: r.status,
    episodes: r.episodes,
    seasonYear: r.seasonYear,
    cover: r.coverImage,
    siteUrl: r.siteUrl,
  };
}

export async function gql<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  return limiter.schedule(async () => {
    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ query, variables }),
      });
      if (res.status === 429) {
        const retry = Number(res.headers.get("Retry-After")) || 60;
        await sleep(retry * 1000);
        continue;
      }
      const json = (await res.json()) as {
        data?: T;
        errors?: { message: string }[];
      };
      if (json.errors?.length)
        throw new Error(json.errors.map((e) => e.message).join("; "));
      if (!json.data)
        throw new Error(`AniList returned ${res.status} with no data`);
      return json.data;
    }
    throw new Error(
      "AniList kept rate-limiting the requests. Wait a minute and run again.",
    );
  });
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function fetchAniListUser(userName: string): Promise<UserList> {
  const query = `query ($userName: String) {
    MediaListCollection(userName: $userName, type: ANIME) {
      lists { entries { status media { ${NODE} } } }
    }
  }`;
  type Resp = {
    MediaListCollection: {
      lists: { entries: { status: ListStatus; media: RawNode }[] }[];
    };
  };
  const data = await gql<Resp>(query, { userName });

  const seen = new Set<number>();
  const result: UserList = { entries: [], media: [], unmatched: 0 };
  // Custom lists duplicate entries, so dedupe by media id.
  for (const list of data.MediaListCollection.lists) {
    for (const e of list.entries) {
      if (seen.has(e.media.id)) continue;
      seen.add(e.media.id);
      result.entries.push({ mediaId: e.media.id, status: e.status });
      result.media.push(toNode(e.media));
    }
  }
  return result;
}

/** Fetch anime relations for many ids, 50 per request. Non-anime relations (manga, novels) are dropped. */
export async function fetchRelations(
  ids: number[],
  onChunk?: (done: number, total: number) => void,
): Promise<MediaWithRelations[]> {
  const query = `query ($ids: [Int]) {
    Page(perPage: 50) {
      media(id_in: $ids) {
        ${NODE}
        relations { edges { relationType(version: 2) node { ${NODE} } } }
      }
    }
  }`;
  type Resp = {
    Page: {
      media: (RawNode & {
        relations: { edges: { relationType: RelationType; node: RawNode }[] };
      })[];
    };
  };

  const out: MediaWithRelations[] = [];
  const batches = chunk(ids, 50);
  for (const [i, batch] of batches.entries()) {
    const data = await gql<Resp>(query, { ids: batch });
    for (const m of data.Page.media) {
      out.push({
        ...toNode(m),
        relations: m.relations.edges
          .filter((e) => e.node.type === "ANIME")
          .map((e) => ({ type: e.relationType, node: toNode(e.node) })),
      });
    }
    onChunk?.(i + 1, batches.length);
  }
  return out;
}

/** Map MyAnimeList ids to AniList media. */
export async function mapMalIds(
  malIds: number[],
): Promise<Map<number, MediaNode>> {
  const query = `query ($ids: [Int]) {
    Page(perPage: 50) { media(idMal_in: $ids, type: ANIME) { ${NODE} } }
  }`;
  type Resp = { Page: { media: RawNode[] } };
  const map = new Map<number, MediaNode>();
  for (const batch of chunk(malIds, 50)) {
    const data = await gql<Resp>(query, { ids: batch });
    for (const m of data.Page.media) if (m.idMal) map.set(m.idMal, toNode(m));
  }
  return map;
}
