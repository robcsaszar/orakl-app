<script lang="ts">
import Metatags from "$lib/components/seo/Metatags.svelte";
import Link from "$lib/components/ui/Link.svelte";
</script>

<Metatags
  title="Credits"
  description="The icons, badges and tiles Orakl uses, and who made them."
/>

<article class="prose prose-invert font-sans max-w-none">
  <h1>Credits</h1>

  <section>
    <h2>Solar</h2>
    <p>
      Icons by 480 Design, licensed
      <Link
        href="https://creativecommons.org/licenses/by/4.0/"
        intent="inline"
        class="inline">CC BY 4.0</Link
      >. Source:
      <Link
        href="https://www.figma.com/community/file/1166831539721848736"
        intent="inline"
        class="inline">Solar icon set on Figma</Link
      >.
    </p>
  </section>

  <section>
    <h2>Kenney</h2>
    <p>Game assets by Kenney (kenney.nl).</p>
    <Link href="https://kenney.nl/support" class="inline-block">
      <img
        src="/images/credits/kenney-featuring-light.svg"
        alt="Featuring Kenney"
        class="hidden dark:block"
      />
      <img
        src="/images/credits/kenney-featuring-dark.svg"
        alt="Featuring Kenney"
        class="dark:hidden"
      />
    </Link>
  </section>

  <section>
    <h2>RLTiles</h2>
    <p>
      Part of (or All) the graphic tiles used in this program is the public
      domain roguelike tileset "RLTiles".
    </p>
    <p>Some of the tiles have been modified by Rob Csaszar.</p>
    <p>
      <Link
        href="https://rltiles.sourceforge.net/"
        intent="inline"
        class="inline">RLTiles</Link
      >
    </p>
  </section>
</article>
