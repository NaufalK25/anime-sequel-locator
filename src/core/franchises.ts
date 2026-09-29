import type { Graph } from "./crawler";
import type {
  ListStatus,
  MediaFormat,
  MediaNode,
  RelationEdge,
  RelationType,
} from "../types";

export interface Suggestion {
  media: MediaNode;
  depth: number;
  relation: RelationType;
  /** the entry it was found from; kept whole so either title can be shown */
  from: MediaNode | null;
  listStatus: ListStatus | null;
}

export interface Franchise {
  /** smallest member id, stable enough for keys */
  key: number;
  /**
   * the entry the franchise is named after: the earliest watched TV series,
   * else the most series-like watched entry
   */
  main: MediaNode;
  memberIds: number[];
  /** undirected relation links; shared by every franchise from the same graph */
  links: Map<number, number[]>;
  /** every crawled entry; shared by every franchise from the same graph */
  nodes: Map<number, MediaNode>;
  /**
   * this franchise's relations, one per pair of entries. PREQUEL is flipped
   * into SEQUEL, so every SEQUEL edge points from earlier to later.
   */
  edges: RelationEdge[];
  watched: MediaNode[];
  suggestions: Suggestion[];
}

/** Formats from most to least likely to be a franchise's main series. */
const MAIN_FORMATS: MediaFormat[] = [
  "TV",
  "TV_SHORT",
  "ONA",
  "OVA",
  "MOVIE",
  "SPECIAL",
  "MUSIC",
];

/** Relation types a crossover or collab is filed under; story relations never are. */
const CROSSOVER_TYPES: ReadonlySet<RelationType> = new Set([
  "CHARACTER",
  "OTHER",
  "SPIN_OFF",
]);

/**
 * Crossover links: a bridge (removing it disconnects the graph) of a crossover
 * type, with watched entries on both sides. That's two series you watched held
 * together by one collab. Bridges come from an iterative Tarjan's DFS, so
 * long sequel chains can't overflow the stack.
 */
function crossoverLinks(
  ids: Iterable<number>,
  edges: Iterable<RelationEdge>,
  watchedIds: Set<number>,
): Set<RelationEdge> {
  const adj = new Map<number, { to: number; edge: RelationEdge }[]>();
  const add = (a: number, b: number, edge: RelationEdge) => {
    const l = adj.get(a);
    if (l) l.push({ to: b, edge });
    else adj.set(a, [{ to: b, edge }]);
  };
  for (const e of edges) {
    add(e.from, e.to, e);
    add(e.to, e.from, e);
  }

  const disc = new Map<number, number>();
  const low = new Map<number, number>();
  // watched entries in each DFS subtree, i.e. on the far side of a bridge
  const below = new Map<number, number>();
  const cut = new Set<RelationEdge>();
  let t = 0;
  const visit = (id: number) => {
    disc.set(id, t);
    low.set(id, t++);
    below.set(id, watchedIds.has(id) ? 1 : 0);
  };

  for (const start of ids) {
    if (disc.has(start)) continue;
    visit(start);
    const bridges: { edge: RelationEdge; child: number }[] = [];
    const stack = [{ id: start, via: null as RelationEdge | null, i: 0 }];
    while (stack.length) {
      const top = stack[stack.length - 1];
      const next = adj.get(top.id)?.[top.i++];
      if (next) {
        if (next.edge === top.via) continue;
        if (disc.has(next.to)) {
          low.set(top.id, Math.min(low.get(top.id)!, disc.get(next.to)!));
        } else {
          visit(next.to);
          stack.push({ id: next.to, via: next.edge, i: 0 });
        }
        continue;
      }
      stack.pop();
      const parent = stack[stack.length - 1];
      if (!parent) continue;
      low.set(parent.id, Math.min(low.get(parent.id)!, low.get(top.id)!));
      below.set(parent.id, below.get(parent.id)! + below.get(top.id)!);
      if (low.get(top.id)! > disc.get(parent.id)!)
        bridges.push({ edge: top.via!, child: top.id });
    }
    const total = below.get(start)!;
    for (const { edge, child } of bridges) {
      const far = below.get(child)!;
      if (far > 0 && total - far > 0 && CROSSOVER_TYPES.has(edge.type))
        cut.add(edge);
    }
  }
  return cut;
}

/**
 * Group the graph into connected components ("franchises"), split into watched
 * vs. not. Unless `joinCrossovers` is set, crossover links (see
 * `crossoverLinks`) are cut first, and a collab left with nothing watched of
 * its own is shown in every franchise it links to.
 */
export function buildFranchises(
  graph: Graph,
  watchedIds: Set<number>,
  listStatus: Map<number, ListStatus>,
  joinCrossovers = false,
): Franchise[] {
  const parent = new Map<number, number>();
  const find = (x: number): number => {
    let root = x;
    while ((parent.get(root) ?? root) !== root) root = parent.get(root)!;
    while (x !== root) {
      const p = parent.get(x) ?? x;
      parent.set(x, root);
      x = p;
    }
    return root;
  };
  const push = <K, V>(m: Map<K, V[]>, k: K, v: V) => {
    const l = m.get(k);
    if (l) l.push(v);
    else m.set(k, [v]);
  };

  // Both ends of a relation usually list it (A SEQUEL B, B PREQUEL A), so keep
  // one edge per pair, preferring SEQUEL.
  const pairs = new Map<string, RelationEdge>();
  for (const e of graph.edges) {
    if (e.from === e.to) continue;
    const n: RelationEdge =
      e.type === "PREQUEL" ? { from: e.to, to: e.from, type: "SEQUEL" } : e;
    const k = `${Math.min(n.from, n.to)}-${Math.max(n.from, n.to)}`;
    const had = pairs.get(k);
    if (!had || (had.type !== "SEQUEL" && n.type === "SEQUEL")) pairs.set(k, n);
  }

  const cut = joinCrossovers
    ? new Set<RelationEdge>()
    : crossoverLinks(graph.nodes.keys(), pairs.values(), watchedIds);
  for (const e of pairs.values()) {
    if (cut.has(e)) continue;
    const a = find(e.from);
    const b = find(e.to);
    if (a !== b) parent.set(Math.max(a, b), Math.min(a, b));
  }

  const groups = new Map<number, number[]>();
  for (const id of graph.nodes.keys()) push(groups, find(id), id);
  const edgesOf = new Map<number, RelationEdge[]>();
  for (const e of pairs.values())
    if (!cut.has(e)) push(edgesOf, find(e.from), e);

  // A group with nothing watched was split off by a cut (a collab between two
  // series): show it in each franchise on the other end of its cut links.
  const hasWatched = (root: number) =>
    groups.get(root)!.some((id) => watchedIds.has(id));
  const guests = new Map<number, Set<number>>();
  const guestEdges = new Map<number, RelationEdge[]>();
  for (const e of cut) {
    for (const [mine, theirs] of [
      [find(e.from), find(e.to)],
      [find(e.to), find(e.from)],
    ]) {
      if (hasWatched(mine) || !hasWatched(theirs)) continue;
      const g = guests.get(theirs) ?? new Set();
      g.add(mine);
      guests.set(theirs, g);
      push(guestEdges, theirs, e);
    }
  }

  // links for filters.ts: every edge except cuts between two watched series
  const links = new Map<number, number[]>();
  for (const e of pairs.values()) {
    if (cut.has(e) && hasWatched(find(e.from)) && hasWatched(find(e.to)))
      continue;
    push(links, e.from, e.to);
    push(links, e.to, e.from);
  }

  const byYear = (a: MediaNode, b: MediaNode) =>
    (a.seasonYear ?? 9999) - (b.seasonYear ?? 9999);
  // Name a franchise after its main series, not whatever came out first: a
  // pilot film or event special often predates the TV show it's attached to.
  const mainness = (m: MediaNode) =>
    m.format ? MAIN_FORMATS.indexOf(m.format) : MAIN_FORMATS.length;
  const byMain = (a: MediaNode, b: MediaNode) =>
    mainness(a) - mainness(b) || byYear(a, b) || a.id - b.id;
  const out: Franchise[] = [];

  for (const [root, own] of groups) {
    const visiting = [...(guests.get(root) ?? [])];
    const ids = [...own, ...visiting.flatMap((g) => groups.get(g)!)];
    const edges = [
      ...(edgesOf.get(root) ?? []),
      ...visiting.flatMap((g) => edgesOf.get(g) ?? []),
      ...(guestEdges.get(root) ?? []),
    ];
    const watched = ids
      .filter((id) => watchedIds.has(id))
      .map((id) => graph.nodes.get(id)!);
    if (!watched.length) continue;

    const suggestions: Suggestion[] = ids
      .filter((id) => !watchedIds.has(id))
      .map((id) => {
        const via = graph.via.get(id)!;
        return {
          media: graph.nodes.get(id)!,
          depth: graph.depth.get(id) ?? 0,
          relation: via.type,
          from: graph.nodes.get(via.from) ?? null,
          listStatus: listStatus.get(id) ?? null,
        };
      })
      .sort((a, b) => byYear(a.media, b.media) || a.depth - b.depth);

    if (!suggestions.length) continue;
    watched.sort(byYear);
    out.push({
      key: root,
      main: [...watched].sort(byMain)[0],
      memberIds: ids,
      links,
      nodes: graph.nodes,
      edges,
      watched,
      suggestions,
    });
  }

  return out;
}
