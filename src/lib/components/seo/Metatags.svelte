<script lang="ts">
  import { SITE_NAME, SITE_URL } from "@/lib/constants";

  let {
    title,
    description,
    image,
    url,
    noindex = false,
    nofollow = false,
  }: {
    title: string;
    description: string;
    image?: string;
    url?: string;
    noindex?: boolean;
    nofollow?: boolean;
  } = $props();

  const ogImage = $derived(image ?? `${SITE_URL}/og.jpg`);
  const ogUrl = $derived(url ?? SITE_URL);
  const fullTitle = $derived(`${title} · ${SITE_NAME}`);
  const robots = $derived([noindex ? "noindex" : "index", nofollow ? "nofollow" : "follow"].join(", "));
</script>

<svelte:head>
  <title>{fullTitle}</title>
  <meta name="description" content={description} />
  <meta name="robots" content={robots} />

  <!-- Open Graph -->
  <meta property="og:title" content={fullTitle} />
  <meta property="og:description" content={description} />
  <meta property="og:type" content="website" />
  <meta property="og:image" content={ogImage} />
  <meta property="og:url" content={ogUrl} />
  <meta property="og:site_name" content={SITE_NAME} />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={fullTitle} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={ogImage} />
</svelte:head>
