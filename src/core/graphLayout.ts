import type { RelationEdge } from "../types";

export interface Cell {
  col: number;
  row: number;
}

export interface Layout {
  cells: Map<number, Cell>;
  /**
   * entry → the entry it was hung under (always in the same column). With the
   * sequel edges, these are the only links the layout needs to draw.
   */
  anchors: Map<number, number>;
}

/**
 * Grid positions for one franchise. Sequel chains run left to right in watch
 * order; every other relation hangs below the entry it's attached to. The
 * largest chain goes on the top row. Expects edges from `buildFranchises`,
 * where every SEQUEL edge points from the earlier entry to the later one.
 */
export function layoutFranchise(
  ids: number[],
  edges: RelationEdge[],
  year: (id: number) => number,
): Layout {
  const byYear = (a: number, b: number) => year(a) - year(b) || a - b;
  const push = (m: Map<number, number[]>, k: number, v: number) => {
    const l = m.get(k);
    if (l) l.push(v);
    else m.set(k, [v]);
  };
  const next = new Map<number, number[]>();
  const prev = new Map<number, number[]>();
  const near = new Map<number, number[]>();
  for (const e of edges) {
    push(near, e.from, e.to);
    push(near, e.to, e.from);
    if (e.type === "SEQUEL") {
      push(next, e.from, e.to);
      push(prev, e.to, e.from);
    }
  }

  // chains: connected over sequel edges; an entry with none is a chain of one
  const chainOf = new Map<number, number[]>();
  const chains: number[][] = [];
  for (const id of [...ids].sort(byYear)) {
    if (chainOf.has(id)) continue;
    const chain = [id];
    chainOf.set(id, chain);
    chains.push(chain);
    for (let i = 0; i < chain.length; i++) {
      const c = chain[i];
      for (const n of [...(next.get(c) ?? []), ...(prev.get(c) ?? [])]) {
        if (chainOf.has(n)) continue;
        chainOf.set(n, chain);
        chain.push(n);
      }
    }
  }

  // inside a chain: column = longest sequel path to it, rows stack branches
  const localCol = new Map<number, number>();
  const localRow = new Map<number, number>();
  for (const chain of chains) {
    const remaining = new Set(chain);
    const queue = chain.filter((id) => !prev.get(id)?.length).sort(byYear);
    while (remaining.size) {
      // a sequel loop has no clear start; break it at its earliest entry
      if (!queue.length) queue.push([...remaining].sort(byYear)[0]);
      const id = queue.shift()!;
      if (!remaining.has(id)) continue;
      remaining.delete(id);
      const before = (prev.get(id) ?? []).filter((p) => localCol.has(p));
      localCol.set(
        id,
        Math.max(-1, ...before.map((p) => localCol.get(p)!)) + 1,
      );
      for (const n of next.get(id) ?? []) {
        if ((prev.get(n) ?? []).every((p) => localCol.has(p))) queue.push(n);
      }
    }
    const perCol = new Map<number, number[]>();
    for (const id of chain) push(perCol, localCol.get(id)!, id);
    for (const col of perCol.values()) {
      col.sort(byYear).forEach((id, i) => localRow.set(id, i));
    }
  }

  const pos = new Map<number, Cell>();
  const anchors = new Map<number, number>();
  const taken = new Set<string>();
  let bottom = -1;
  // put a whole chain at the first free rows from `fromRow` down
  const place = (chain: number[], offset: number, fromRow: number) => {
    const cells = chain.map((id) => ({
      id,
      col: localCol.get(id)! + offset,
      row: localRow.get(id)!,
    }));
    let base = fromRow;
    while (cells.some((c) => taken.has(`${c.col},${c.row + base}`))) base++;
    for (const c of cells) {
      const row = c.row + base;
      pos.set(c.id, { col: c.col, row });
      taken.add(`${c.col},${row}`);
      bottom = Math.max(bottom, row);
    }
  };

  const ordered = [...chains].sort(
    (a, b) => b.length - a.length || byYear(a[0], b[0]),
  );
  for (const start of ordered) {
    if (pos.has(start[0])) continue;
    place(start, 0, bottom + 1);
    // walk outwards, hanging each unplaced chain under the entry it relates to
    const queue = [...start];
    while (queue.length) {
      const id = queue.shift()!;
      const p = pos.get(id)!;
      for (const n of [...(near.get(id) ?? [])].sort(byYear)) {
        if (pos.has(n)) continue;
        const chain = chainOf.get(n)!;
        place(chain, p.col - localCol.get(n)!, p.row + 1);
        anchors.set(n, id);
        queue.push(...chain);
      }
    }
  }

  const minCol = Math.min(...[...pos.values()].map((c) => c.col));
  for (const c of pos.values()) c.col -= minCol;
  return { cells: pos, anchors };
}
