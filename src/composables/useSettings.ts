import { reactive, watch } from "vue";
import { AIRING, FORMATS, RELATIONS } from "../core/labels";
import type { ViewFilters } from "../core/filters";
import type { ListStatus, RelationType, Source } from "../types";

export interface Settings {
  source: Source;
  username: string;
  // crawl settings: changing these needs a new run
  watchedStatuses: ListStatus[];
  follow: RelationType[];
  crawlDepth: number;
  cacheTtlHours: number;
  // view filters: applied instantly
  filters: ViewFilters;
}

const KEY = "sequel-locator:settings:v1";

const defaults = (): Settings => ({
  source: "anilist",
  username: "",
  watchedStatuses: ["COMPLETED", "CURRENT", "REPEATING", "PAUSED"],
  follow: RELATIONS.filter((r) => r !== "CHARACTER"),
  crawlDepth: 4,
  cacheTtlHours: 24 * 7,
  filters: {
    formats: [...FORMATS],
    relations: [...RELATIONS],
    airing: [...AIRING],
    hideListStatuses: ["DROPPED"],
    maxDepth: 4,
    titleExclude: [],
    search: "",
    excludedMedia: [],
    excludedFranchises: [],
  },
});

function load(): Settings {
  const d = defaults();
  try {
    const saved = JSON.parse(
      localStorage.getItem(KEY) ?? "{}",
    ) as Partial<Settings>;
    return { ...d, ...saved, filters: { ...d.filters, ...saved.filters } };
  } catch {
    return d;
  }
}

// Module-level singleton: every component shares the same reactive object.
// For an app this size that's all Pinia would give you.
const settings = reactive(load());
watch(
  settings,
  (v) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(v));
    } catch {
      /* storage full or blocked; settings just won't persist */
    }
  },
  { deep: true },
);

export function useSettings() {
  const toggleIn = (list: number[], id: number) => {
    const i = list.indexOf(id);
    if (i === -1) list.push(id);
    else list.splice(i, 1);
  };
  return {
    settings,
    excludeMedia: (id: number) => toggleIn(settings.filters.excludedMedia, id),
    excludeFranchise: (id: number) =>
      toggleIn(settings.filters.excludedFranchises, id),
    resetFilters: () => {
      const { excludedMedia, excludedFranchises } = settings.filters;
      Object.assign(settings.filters, defaults().filters, {
        excludedMedia,
        excludedFranchises,
      });
    },
    clearExclusions: () => {
      settings.filters.excludedMedia = [];
      settings.filters.excludedFranchises = [];
    },
  };
}
