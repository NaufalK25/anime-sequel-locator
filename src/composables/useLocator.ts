import { computed, reactive, shallowRef } from "vue";
import { crawl, type Graph } from "../core/crawler";
import { buildFranchises } from "../core/franchises";
import { applyFilters } from "../core/filters";
import { fetchAniListUser } from "../providers/anilist";
import { fetchMalUser } from "../providers/mal";
import { useSettings } from "./useSettings";
import type { ListStatus, UserList } from "../types";

type Phase = "idle" | "running" | "done" | "error";

const state = reactive({ phase: "idle" as Phase, message: "", error: "" });
// Graph/list can hold thousands of objects; shallowRef skips deep reactivity.
const user = shallowRef<UserList | null>(null);
const graph = shallowRef<Graph | null>(null);
const watchedIds = shallowRef(new Set<number>());
let controller: AbortController | null = null;

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
