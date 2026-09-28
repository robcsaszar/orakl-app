import { FIXTURE_TOPICS_JSON } from "@/lib/mock/fixtures.js";
import type { LayoutLoad } from "./$types";

// Mirror the real (app)/solo layout's data shape so the real pages (which read
// it via PageData) type-check and render when rendered inside mimic.
export const load: LayoutLoad = ({ url }) => {
  const isGuest = url.searchParams.get("guest") === "1";
  return {
    nickname: url.searchParams.get("nickname") ?? "Dev Player",
    isGuest,
    isLoggedIn: !isGuest,
    userId: isGuest ? "anon" : "mimic-user",
    profileAvatarSrc: "",
    categoryDataJson: FIXTURE_TOPICS_JSON,
  };
};
