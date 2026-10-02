import { cacheGetMany, cacheSetMany } from "./cache";
import { fetchRelations } from "../providers/anilist";
import type {
  MediaNode,
  MediaWithRelations,
  RelationEdge,
  RelationType,
} from "../types";

export interface CrawlOptions {
  /** Relation types worth walking through. CHARACTER is off by default: crossovers explode the graph. */
  follow: RelationType[];
  /** How many hops away from a watched entry to keep walking. */
  maxDepth: number;
  cacheTtlMs: number;
  signal?: AbortSignal;
  onProgress?: (msg: string) => void;
}

export interface Graph {
  nodes: Map<number, MediaNode>;
  edges: RelationEdge[];
  /** hops from the nearest watched entry (watched = 0) */
  depth: Map<number, number>;
  /** how each discovered entry was first reached */
  via: Map<number, { from: number; type: RelationType }>;
}

// cache key prefix; bump it when MediaWithRelations changes shape
// (rel2: covers became an object with every size)
const REL = "rel2:";

async function relationsFor(
  ids: number[],
  opts: CrawlOptions,
  label: string,
): Promise<MediaWithRelations[]> {
  const cached = await cacheGetMany<MediaWithRelations>(
    ids.map((id) => `${REL}${id}`),
    opts.cacheTtlMs,
  );
  const hits = cached.filter((c): c is MediaWithRelations => Boolean(c));
  const missing = ids.filter((_, i) => !cached[i]);

  if (!missing.length) return hits;
  const fresh = await fetchRelations(missing, (done, total) => {
    opts.signal?.throwIfAborted();
    opts.onProgress?.(
      `${label}: fetched ${done}/${total} batches (${hits.length} from cache)`,
    );
  });
  await cacheSetMany(
    fresh.map((m) => [`${REL}${m.id}`, m] as [string, MediaWithRelations]),
  );
  return [...hits, ...fresh];
}

/**
 * Relations that lead out of a franchise: crossovers, collabs, PVs. The entry
 * on the other end is kept, but the walk doesn't continue from it, or a One
 * Piece x Dragon Ball special would pull in all of Dragon Ball.
 */
const DEAD_END: ReadonlySet<RelationType> = new Set(["OTHER", "CHARACTER"]);

/**
 * Breadth-first walk from everything you've watched. Unwatched entries keep
 * being expanded, so S1 (watched) -> S2 -> S3 surfaces both S2 and S3, except
 * entries only reached through a DEAD_END relation.
 */
export async function crawl(
  seeds: MediaNode[],
  opts: CrawlOptions,
): Promise<Graph> {
  const follow = new Set(opts.follow);
  // reached so far only through a DEAD_END relation, so not expanded
  const stopped = new Set<number>();
  const nodes = new Map(seeds.map((s) => [s.id, s]));
  const depth = new Map(seeds.map((s) => [s.id, 0]));
  const via = new Map<number, { from: number; type: RelationType }>();
  const edges: RelationEdge[] = [];

  let frontier = seeds.map((s) => s.id);
  for (let d = 0; frontier.length && d < opts.maxDepth; d++) {
    opts.signal?.throwIfAborted();
    const media = await relationsFor(frontier, opts, `Hop ${d + 1}`);
    const next: number[] = [];

    for (const m of media) {
      if (!nodes.has(m.id)) nodes.set(m.id, m);
      for (const r of m.relations) {
        if (!follow.has(r.type)) continue;
        edges.push({ from: m.id, to: r.node.id, type: r.type });
        const deadEnd = DEAD_END.has(r.type);
        if (depth.has(r.node.id)) {
          // a story relation reached it after all: walk on from it
          if (!deadEnd && stopped.delete(r.node.id)) {
            via.set(r.node.id, { from: m.id, type: r.type });
            next.push(r.node.id);
          }
          continue;
        }
        nodes.set(r.node.id, r.node);
        depth.set(r.node.id, d + 1);
        via.set(r.node.id, { from: m.id, type: r.type });
        if (deadEnd) stopped.add(r.node.id);
        else next.push(r.node.id);
      }
    }
    opts.onProgress?.(`Hop ${d + 1}: found ${next.length} new entries`);
    frontier = next;
  }

  return { nodes, edges, depth, via };
}
