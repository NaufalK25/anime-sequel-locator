import { computed, reactive, shallowRef } from "vue";
import { crawl, type Graph } from "../core/crawler";
import { buildFranchises } from "../core/franchises";
import { applyFilters } from "../core/filters";
import { fetchAniListUser } from "../providers/anilist";
import { fetchMalUser } from "../providers/mal";
import { loadLastRun, saveLastRun } from "../core/cache";
import { useSettings } from "./useSettings";
import type {
  ListStatus,
  MediaNode,
  MediaWithRelations,
  Source,
  UserList,
} from "../types";

type Phase = "idle" | "running" | "done" | "error";

const state = reactive({
  phase: "idle" as Phase,
  message: "",
  error: "",
  /** when the shown result was fetched (ms since epoch) */
  fetchedAt: null as number | null,
});
// Graph/list can hold thousands of objects; shallowRef skips deep reactivity.
const user = shallowRef<UserList | null>(null);
const graph = shallowRef<Graph | null>(null);
const watchedIds = shallowRef(new Set<number>());
let controller: AbortController | null = null;

interface LastRun {
  source: Source;
  username: string;
  user: UserList;
  graph: Graph;
  watchedIds: Set<number>;
  message: string;
  fetchedAt: number;
}

// Crawled nodes can carry their relation lists; nothing downstream reads
// them, so drop them before storing to keep the saved run small.
function stripRelations(g: Graph): Graph {
  const nodes = new Map<number, MediaNode>();
  for (const [id, n] of g.nodes) {
    const { relations: _, ...node } = n as MediaWithRelations;
    nodes.set(id, node);
  }
  return { ...g, nodes };
}

// Show the previous result after a refresh, as long as it was for the same
// user. Skipped if a new run already started while this was loading.
async function restoreLastRun() {
  const { settings } = useSettings();
  try {
    const last = await loadLastRun<LastRun>();
    if (
      !last ||
      state.phase !== "idle" ||
      last.source !== settings.source ||
      last.username !== settings.username.trim()
    )
      return;
    user.value = last.user;
    watchedIds.value = last.watchedIds;
    graph.value = last.graph;
    state.phase = "done";
    state.message = last.message;
    state.fetchedAt = last.fetchedAt ?? null;
  } catch {
    /* IndexedDB blocked or data unreadable; start empty */
  }
}
restoreLastRun();

export function useLocator() {
  const { settings } = useSettings();

  async function run() {
    controller?.abort();
    controller = new AbortController();
    const signal = controller.signal;
    const name = settings.username.trim();
    if (!name) return;

    state.phase = "running";
    state.error = "";
    try {
      state.message = "Reading your list…";
      const list =
        settings.source === "anilist"
          ? await fetchAniListUser(name)
          : await fetchMalUser(name);
      signal.throwIfAborted();

      const watchedStatuses = new Set(settings.watchedStatuses);
      const watched = new Set(
        list.entries
          .filter((e) => watchedStatuses.has(e.status))
          .map((e) => e.mediaId),
      );
      const seeds = list.media.filter((m) => watched.has(m.id));

      const g = await crawl(seeds, {
        follow: [...settings.follow],
        maxDepth: settings.crawlDepth,
        cacheTtlMs: settings.cacheTtlHours * 3600_000,
        signal,
        onProgress: (m) => (state.message = m),
      });

      user.value = list;
      watchedIds.value = watched;
      graph.value = g;
      state.phase = "done";
      state.message =
        `${seeds.length} watched entries, ${g.nodes.size - seeds.length} related entries found` +
        (list.unmatched
          ? `, ${list.unmatched} MAL entries not on AniList`
          : "");
      state.fetchedAt = Date.now();

      saveLastRun<LastRun>({
        source: settings.source,
        username: name,
        user: list,
        graph: stripRelations(g),
        watchedIds: watched,
        message: state.message,
        fetchedAt: state.fetchedAt,
      }).catch(() => {
        /* storage full or blocked; the result just won't survive a refresh */
      });
    } catch (e) {
      if (signal.aborted) {
        state.phase = graph.value ? "done" : "idle";
        state.message = "Stopped.";
        return;
      }
      state.phase = "error";
      state.error = e instanceof Error ? e.message : String(e);
    }
  }

  const cancel = () => controller?.abort();

  const franchises = computed(() => {
    if (!graph.value || !user.value) return [];
    const listStatus = new Map<number, ListStatus>(
      user.value.entries.map((e) => [e.mediaId, e.status]),
    );
    return buildFranchises(graph.value, watchedIds.value, listStatus);
  });

  const visible = computed(() =>
    applyFilters(franchises.value, settings.filters),
  );

  return { state, run, cancel, franchises, visible };
}
