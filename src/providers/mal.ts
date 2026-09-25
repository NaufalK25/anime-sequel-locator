import { mapMalIds } from "./anilist";
import type { ListStatus, UserList } from "../types";

const PROXY = import.meta.env.VITE_MAL_PROXY_URL?.replace(/\/$/, "");
const MAL_API = "https://api.myanimelist.net/v2";

const STATUS: Record<string, ListStatus> = {
  watching: "CURRENT",
  completed: "COMPLETED",
  on_hold: "PAUSED",
  dropped: "DROPPED",
  plan_to_watch: "PLANNING",
};

export const malAvailable = Boolean(PROXY);

/**
 * MAL's official API sends no CORS headers, so a browser can't call it directly.
 * We read the list through the proxy in /worker, then map every entry onto
 * AniList so a single relation graph serves both sources.
 */
export async function fetchMalUser(username: string): Promise<UserList> {
  if (!PROXY)
    throw new Error(
      "MyAnimeList needs the proxy. Set VITE_MAL_PROXY_URL in .env (see README).",
    );

  const raw: { malId: number; status: ListStatus }[] = [];
  let url: string | null =
    `${PROXY}/users/${encodeURIComponent(username)}/animelist?fields=list_status&limit=1000&nsfw=true`;

  while (url) {
    const res: Response = await fetch(url);
    if (res.status === 404)
      throw new Error(`No MyAnimeList user named "${username}".`);
    if (res.status === 403)
      throw new Error(`"${username}" has a private MyAnimeList list.`);
    if (!res.ok) throw new Error(`MyAnimeList returned ${res.status}.`);
    const json = (await res.json()) as {
      data: { node: { id: number }; list_status: { status: string } }[];
      paging?: { next?: string };
    };
    for (const d of json.data)
      raw.push({
        malId: d.node.id,
        status: STATUS[d.list_status.status] ?? "PLANNING",
      });
    url = json.paging?.next ? json.paging.next.replace(MAL_API, PROXY) : null;
  }

  const mapped = await mapMalIds(raw.map((r) => r.malId));
  const result: UserList = { entries: [], media: [], unmatched: 0 };
  for (const r of raw) {
    const m = mapped.get(r.malId);
    if (!m) {
      result.unmatched++;
      continue;
    }
    result.entries.push({ mediaId: m.id, status: r.status });
    result.media.push(m);
  }
  return result;
}
