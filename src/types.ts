export type Source = "anilist" | "mal";

// AniList enums. AniList is the canonical graph; MAL ids are mapped onto it.
export type MediaFormat =
  | "TV"
  | "TV_SHORT"
  | "MOVIE"
  | "SPECIAL"
  | "OVA"
  | "ONA"
  | "MUSIC";
export type MediaStatus =
  | "FINISHED"
  | "RELEASING"
  | "NOT_YET_RELEASED"
  | "CANCELLED"
  | "HIATUS";
export type ListStatus =
  | "CURRENT"
  | "PLANNING"
  | "COMPLETED"
  | "DROPPED"
  | "PAUSED"
  | "REPEATING";
export type RelationType =
  | "ADAPTATION"
  | "PREQUEL"
  | "SEQUEL"
  | "PARENT"
  | "SIDE_STORY"
  | "CHARACTER"
  | "SUMMARY"
  | "ALTERNATIVE"
  | "SPIN_OFF"
  | "OTHER"
  | "SOURCE"
  | "COMPILATION"
  | "CONTAINS";

export interface MediaNode {
  id: number; // AniList id
  idMal: number | null;
  title: string;
  titleEnglish: string | null;
  format: MediaFormat | null;
  status: MediaStatus | null;
  episodes: number | null;
  seasonYear: number | null;
  cover: Cover | null;
  siteUrl: string;
}

/** AniList's cover in each size it has; see coverImage() in core/covers.ts */
export interface Cover {
  medium: string | null;
  large: string | null;
  extraLarge: string | null;
}

export interface Relation {
  type: RelationType;
  node: MediaNode;
}

export interface MediaWithRelations extends MediaNode {
  relations: Relation[];
}

export interface ListEntry {
  mediaId: number;
  status: ListStatus;
}

export interface UserList {
  entries: ListEntry[];
  media: MediaNode[];
  /** MAL entries that had no AniList counterpart */
  unmatched: number;
}

export interface RelationEdge {
  from: number;
  to: number;
  type: RelationType;
}
