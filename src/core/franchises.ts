import type { Graph } from "./crawler";
import type {
  ListStatus,
  MediaNode,
  RelationEdge,
  RelationType,
} from "../types";

export interface Suggestion {
  media: MediaNode;
  depth: number;
  relation: RelationType;
  fromTitle: string;
  listStatus: ListStatus | null;
}

export interface Franchise {
  /** smallest member id, stable enough for keys */
  key: number;
  title: string;
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

/** Group the graph into connected components ("franchises"), split into watched vs. not. */
export function buildFranchises(
  graph: Graph,
  watchedIds: Set<number>,
  listStatus: Map<number, ListStatus>,
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
  const links = new Map<number, number[]>();
  const link = (a: number, b: number) => {
    const l = links.get(a);
    if (l) l.push(b);
    else links.set(a, [b]);
  };
  for (const e of graph.edges) {
    link(e.from, e.to);
    link(e.to, e.from);
    const a = find(e.from);
    const b = find(e.to);
    if (a !== b) parent.set(Math.max(a, b), Math.min(a, b));
  }

  const groups = new Map<number, number[]>();
  for (const id of graph.nodes.keys()) {
    const root = find(id);
    const g = groups.get(root);
    if (g) g.push(id);
    else groups.set(root, [id]);
  }

  // Both ends of a relation usually list it (A SEQUEL B, B PREQUEL A), so keep
  // one edge per pair, preferring SEQUEL, and group the edges by franchise.
  const pairs = new Map<string, RelationEdge>();
  for (const e of graph.edges) {
    if (e.from === e.to) continue;
    const n: RelationEdge =
      e.type === "PREQUEL" ? { from: e.to, to: e.from, type: "SEQUEL" } : e;
    const k = `${Math.min(n.from, n.to)}-${Math.max(n.from, n.to)}`;
    const had = pairs.get(k);
    if (!had || (had.type !== "SEQUEL" && n.type === "SEQUEL")) pairs.set(k, n);
  }
  const edgesOf = new Map<number, RelationEdge[]>();
  for (const e of pairs.values()) {
    const root = find(e.from);
    const l = edgesOf.get(root);
    if (l) l.push(e);
    else edgesOf.set(root, [e]);
  }

  const byYear = (a: MediaNode, b: MediaNode) =>
    (a.seasonYear ?? 9999) - (b.seasonYear ?? 9999);
  const out: Franchise[] = [];

  for (const [root, ids] of groups) {
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
          fromTitle: graph.nodes.get(via.from)?.title ?? "?",
          listStatus: listStatus.get(id) ?? null,
        };
      })
      .sort((a, b) => byYear(a.media, b.media) || a.depth - b.depth);

    if (!suggestions.length) continue;
    watched.sort(byYear);
    out.push({
      key: root,
      title: watched[0].title,
      memberIds: ids,
      links,
      nodes: graph.nodes,
      edges: edgesOf.get(root) ?? [],
      watched,
      suggestions,
    });
  }

  return out.sort((a, b) => a.title.localeCompare(b.title));
}
