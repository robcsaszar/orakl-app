import { toast } from "./toast.js";

/** Tells the Curator an Admin closed their Lobby. One toast id, so the quiz
 *  frame and a later lobby probe never stack two copies. */
export function showModeratedCloseNotice(): void {
  toast.info("Orakl closed your lobby. Nothing from this session was saved.", {
    id: "lobby-moderated",
    duration: 8000,
  });
}
