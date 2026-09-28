export { EMOTE_SPRITES, SELECTABLE_EMOTE_IDS } from "@orakl/protocol";

import { EMOTE_SPRITES, SELECTABLE_EMOTE_IDS } from "@orakl/protocol";

/** Inline style to render a sprite at `size` px (16×16 source upscaled). */
export function emoteStyle(emoteId: string, size = 32): string {
  const sprite = EMOTE_SPRITES[emoteId];
  if (!sprite) return "";
  const scale = size / 16;
  return [
    `width:${size}px`,
    `height:${size}px`,
    `background-image:url('/images/emotes.png')`,
    `background-size:${Math.round(80 * scale)}px ${Math.round(96 * scale)}px`,
    `background-position:${Math.round(-sprite.x * scale)}px ${Math.round(-sprite.y * scale)}px`,
    "background-repeat:no-repeat",
    "image-rendering:pixelated",
    "display:inline-block",
    "flex-shrink:0",
  ].join(";");
}

/** Pick `n` unique random emote IDs from the selectable pool. */
export function pickRandomEmotes(n: number): string[] {
  const pool = [...SELECTABLE_EMOTE_IDS];
  const result: string[] = [];
  while (result.length < n && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(...pool.splice(idx, 1));
  }
  return result;
}
