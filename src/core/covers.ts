import type { Cover } from "../types";

// Roughly how wide AniList serves each size. Only used to tell the browser
// which file to pick for `sizes`, so near enough is fine.
const WIDTHS: Record<keyof Cover, number> = {
  medium: 100,
  large: 230,
  extraLarge: 460,
};

/**
 * `src` and `srcset` for an <img>: the browser downloads the smallest size
 * that's sharp at the displayed width and the screen's pixel density.
 */
export function coverImage(
  c: Cover | null,
): { src: string; srcset: string } | null {
  const sizes = c
    ? (Object.keys(WIDTHS) as (keyof Cover)[]).filter((k) => c[k])
    : [];
  if (!c || !sizes.length) return null;
  return {
    src: c.large ?? c.medium ?? c.extraLarge!,
    srcset: sizes.map((k) => `${c[k]} ${WIDTHS[k]}w`).join(", "),
  };
}
