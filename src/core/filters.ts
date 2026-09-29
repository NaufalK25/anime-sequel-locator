import type { Franchise } from "./franchises";
import type {
  ListStatus,
  MediaFormat,
  MediaStatus,
  RelationType,
} from "../types";

export interface ViewFilters {
  formats: MediaFormat[];
  relations: RelationType[];
  airing: MediaStatus[];
  /** hide suggestions that are already on your list with these statuses */
  hideListStatuses: ListStatus[];
  maxDepth: number;
  /**
   * case-insensitive substrings matched against watched titles. A matching watched
   * entry hides the suggestions nearest to it; ones at least as near to another
   * watched entry stay.
   */
  titleExclude: string[];
  search: string;
  excludedMedia: number[];
  /** any member id; the whole franchise containing it is hidden */
  excludedFranchises: number[];
}

export type FranchiseSort =
  | "title-asc"
  | "title-desc"
  | "count-asc"
  | "count-desc";

/** Order franchises by title or by how many suggestions each shows; ties go by title. */
export function sortFranchises(
  franchises: Franchise[],
  sort: FranchiseSort,
): Franchise[] {
  const byTitle = (a: Franchise, b: Franchise) =>
    a.title.localeCompare(b.title);
  const cmp: Record<FranchiseSort, (a: Franchise, b: Franchise) => number> = {
    "title-asc": byTitle,
    "title-desc": (a, b) => byTitle(b, a),
    "count-asc": (a, b) =>
      a.suggestions.length - b.suggestions.length || byTitle(a, b),
    "count-desc": (a, b) =>
      b.suggestions.length - a.suggestions.length || byTitle(a, b),
  };
  return [...franchises].sort(cmp[sort]);
}

/** Breadth-first hop counts from `starts`, never walking through `blocked`. */
function hopsFrom(
  starts: number[],
  links: Map<number, number[]>,
  blocked: Set<number>,
): Map<number, number> {
  const hops = new Map(starts.map((id) => [id, 0]));
  let frontier = starts;
  for (let d = 1; frontier.length; d++) {
    const next: number[] = [];
    for (const id of frontier) {
      for (const n of links.get(id) ?? []) {
        if (hops.has(n) || blocked.has(n)) continue;
        hops.set(n, d);
        next.push(n);
      }
    }
    frontier = next;
  }
  return hops;
}

export function applyFilters(
  franchises: Franchise[],
  f: ViewFilters,
): Franchise[] {
  const formats = new Set(f.formats);
  const relations = new Set(f.relations);
  const airing = new Set(f.airing);
  const hideList = new Set(f.hideListStatuses);
  const excludedMedia = new Set(f.excludedMedia);
  const excludedFr = new Set(f.excludedFranchises);
  const keywords = f.titleExclude
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);
  const q = f.search.trim().toLowerCase();

  const titleOf = (t: string, en: string | null) =>
    `${t} ${en ?? ""}`.toLowerCase();

  return franchises
    .filter((fr) => !fr.memberIds.some((id) => excludedFr.has(id)))
    .filter(
      (fr) =>
        !q ||
        titleOf(fr.title, null).includes(q) ||
        fr.suggestions.some((s) =>
          titleOf(s.media.title, s.media.titleEnglish).includes(q),
        ),
    )
    .map((fr) => {
      const dropped = fr.watched
        .filter((w) =>
          keywords.some((k) => titleOf(w.title, w.titleEnglish).includes(k)),
        )
        .map((w) => w.id);
      if (!dropped.length) return { fr, near: null };
      const kept = fr.watched
        .map((w) => w.id)
        .filter((id) => !dropped.includes(id));
      const toKept = hopsFrom(kept, fr.links, new Set(dropped));
      const toDropped = hopsFrom(dropped, fr.links, new Set(kept));
      // a suggestion stays if it's at least as close to a kept watched entry as to a dropped one
      return {
        fr,
        near: (id: number) =>
          toKept.has(id) && toKept.get(id)! <= (toDropped.get(id) ?? Infinity),
      };
    })
    .map(({ fr, near }) => ({
      ...fr,
      suggestions: fr.suggestions.filter((s) => {
        const m = s.media;
        if (near && !near(m.id)) return false;
        if (excludedMedia.has(m.id)) return false;
        if (m.format && !formats.has(m.format)) return false;
        if (m.status && !airing.has(m.status)) return false;
        if (!relations.has(s.relation)) return false;
        if (s.depth > f.maxDepth) return false;
        return !(s.listStatus && hideList.has(s.listStatus));
      }),
    }))
    .filter((fr) => fr.suggestions.length > 0);
}
