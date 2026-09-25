import type {
  ListStatus,
  MediaFormat,
  MediaStatus,
  RelationType,
} from "../types";

export const FORMATS: MediaFormat[] = [
  "TV",
  "TV_SHORT",
  "MOVIE",
  "SPECIAL",
  "OVA",
  "ONA",
  "MUSIC",
];
export const AIRING: MediaStatus[] = [
  "FINISHED",
  "RELEASING",
  "NOT_YET_RELEASED",
  "HIATUS",
  "CANCELLED",
];
export const LIST_STATUSES: ListStatus[] = [
  "COMPLETED",
  "CURRENT",
  "REPEATING",
  "PAUSED",
  "PLANNING",
  "DROPPED",
];
export const RELATIONS: RelationType[] = [
  "SEQUEL",
  "PREQUEL",
  "PARENT",
  "SIDE_STORY",
  "SPIN_OFF",
  "ALTERNATIVE",
  "SUMMARY",
  "COMPILATION",
  "CONTAINS",
  "OTHER",
  "CHARACTER",
];

const OVERRIDES: Record<string, string> = {
  TV: "TV",
  TV_SHORT: "TV short",
  OVA: "OVA",
  ONA: "ONA",
  NOT_YET_RELEASED: "Not yet aired",
  RELEASING: "Airing",
  CURRENT: "Watching",
  REPEATING: "Rewatching",
  PAUSED: "On hold",
  PLANNING: "Plan to watch",
  OTHER: "Other (PV, CM, music…)",
  CHARACTER: "Shared characters",
};

export function label(v: string): string {
  if (OVERRIDES[v]) return OVERRIDES[v];
  const s = v.toLowerCase().replace(/_/g, " ");
  return s[0].toUpperCase() + s.slice(1);
}
