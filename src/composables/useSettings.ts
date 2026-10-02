import { reactive, watch } from "vue";
import { AIRING, FORMATS, RELATIONS } from "../core/labels";
import type { FranchiseSort, ViewFilters } from "../core/filters";
import type { ListStatus, MediaNode, RelationType, Source } from "../types";

export interface Settings {
  source: Source;
  username: string;
  // crawl settings: changing these needs a new run
  watchedStatuses: ListStatus[];
  follow: RelationType[];
  crawlDepth: number;
  cacheTtlHours: number;
  // how results are laid out: cover cards or a compact list
  view: ResultView;
  // franchise order; like `view`, not reset with the filters
  sort: FranchiseSort;
  // which title to show; read it through titleOf() below
  titleLanguage: TitleLanguage;
  // view filters: applied instantly
  filters: ViewFilters;
}

export type ResultView = "cards" | "list";
/** romaji is AniList's main title (Japanese in Latin letters) */
export type TitleLanguage = "romaji" | "english";

const KEY = "sequel-locator:settings:v1";

const defaults = (): Settings => ({
  source: "anilist",
  username: "",
  watchedStatuses: ["COMPLETED", "CURRENT", "REPEATING", "PAUSED"],
  follow: RELATIONS.filter((r) => r !== "CHARACTER"),
  crawlDepth: 4,
  cacheTtlHours: 24 * 7,
  view: "cards",
  sort: "title-asc",
  titleLanguage: "romaji",
  filters: {
    formats: [...FORMATS],
    relations: [...RELATIONS],
    airing: [...AIRING],
    hideListStatuses: ["DROPPED"],
    maxDepth: 4,
    titleExclude: [],
    search: "",
    joinCrossovers: false,
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

/**
 * The title to show for an entry, in the chosen language. English falls back
 * to the main title when AniList has none. Reactive: computeds and templates
 * that call it update when the setting changes.
 */
export function titleOf(m: MediaNode): string {
  return settings.titleLanguage === "english"
    ? (m.titleEnglish ?? m.title)
    : m.title;
}

/** The title not being shown, if the entry has a different one. */
export function otherTitleOf(m: MediaNode): string | null {
  const other = settings.titleLanguage === "english" ? m.title : m.titleEnglish;
  return other && other !== titleOf(m) ? other : null;
}

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
    showMedia: (ids: number[]) => {
      const drop = new Set(ids);
      settings.filters.excludedMedia = settings.filters.excludedMedia.filter(
        (id) => !drop.has(id),
      );
    },
    showFranchise: (id: number) => {
      settings.filters.excludedFranchises =
        settings.filters.excludedFranchises.filter((x) => x !== id);
    },
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
