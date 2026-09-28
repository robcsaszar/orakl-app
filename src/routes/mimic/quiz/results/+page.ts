export const load = ({ url }: { url: URL }) => ({
  claimed: url.searchParams.get("claimed") === "1",
  isAnonymousPlayer: url.searchParams.get("anon") === "1",
});
