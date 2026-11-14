<!--
  The Life tab of the Sky part, for one time of day: how many clouds are in
  the sky, how often flocks come and on how many days, how often star events
  come, and what an hour of that sky holds. The values are the same ones the
  Clouds, Birds and Stars parts keep.
-->
<script lang="ts">
  import type { SkyPhase } from "@orakl/shared";
  import Slider from "@/lib/components/ui/Slider.svelte";
  import { skyStrength } from "@/lib/sky-colours-lab.svelte";
  import SkyReset from "./SkyReset.svelte";
  import { birdStart, forecast, lifeBirds, lifeClouds, lifeStars, resetLifeClouds, setLifeBirds, setLifeClouds, setLifeStars } from "./sky-life.svelte";
  import { cloudLab } from "@/lib/sky-clouds-lab.svelte";
  import { hinted, ui } from "./sky-panel.svelte";

  let { phase, name }: { phase: SkyPhase; /** The time of day in words: "Sunset". */ name: string } = $props();

  const track = `${ui.slider} [&_input]:bg-secondary/25`;
  const num = (v: number) => String(+v.toFixed(2));
  const clouds = $derived(lifeClouds(phase));
  const birds = $derived(lifeBirds(phase));
  const start = $derived(birdStart(phase));
  const stars = $derived(lifeStars(phase));
  const hour = $derived(forecast(phase));
  const ownClouds = $derived(cloudLab.settings.inSky?.[phase] !== undefined);
  const perHour = (v: number) => (v <= 0 ? "never" : v < 1 ? `one in ${num(1 / v)} h` : `${num(v)} an hour`);
</script>

<section class={ui.group} aria-label="Clouds">
  <h3 class={ui.heading}>Clouds</h3>
  <div class="flex flex-col gap-4" use:hinted={"How many clouds are in the sky at once at this time of day. Each day picks a number between the two. Which designs they are is set in Clouds, by each design's 'How often'."}>
    {#each [0, 1] as const as end (end)}
      <Slider id="life-clouds-{end}" size="sm" label={end ? "Most in the sky" : "Fewest in the sky"} min={0} max={12} value={clouds[end]} format={(v) => (v === 0 ? "none" : `${v} ${v === 1 ? "cloud" : "clouds"}`)} class={track} oninput={(e) => setLifeClouds(phase, end, Number(e.currentTarget.value))}>
        {#snippet labelEnd()}<SkyReset label={end ? "Most in the sky" : "Fewest in the sky"} changed={ownClouds} tip="Set for this time of day. Click to show the pool's own number again." onclick={() => resetLifeClouds(phase)} />{/snippet}
      </Slider>
    {/each}
  </div>
</section>
{#if __FEATURE_BIRDS__}
  <section class={ui.group} aria-label="Birds">
    <h3 class={ui.heading}>Birds</h3>
    <div use:hinted={"How many flocks start in an hour at this time of day, on a day that has birds. Which kinds, and their twists, are set in Birds."}>
      <Slider id="life-birds-rate" size="sm" label="Flocks per hour" min={0} max={300} step={0.5} value={birds.perHour} format={perHour} class={track} oninput={(e) => setLifeBirds(phase, "perHour", `${name}: flocks per hour`, Number(e.currentTarget.value))}>
        {#snippet labelEnd()}<SkyReset label="Flocks per hour" changed={birds.perHour !== start.perHour} onclick={() => setLifeBirds(phase, "perHour", `${name}: reset flocks per hour`, start.perHour)} />{/snippet}
      </Slider>
    </div>
    <div use:hinted={"On how many days this time of day has flocks at all. On the other days it has clouds only."}>
      <Slider id="life-birds-days" size="sm" label="Days with birds" min={0} max={1} step={0.01} value={birds.days} format={(v) => (v >= 1 ? "every day" : v <= 0 ? "no day" : `${Math.round(v * 100)}% of days`)} class={track} oninput={(e) => setLifeBirds(phase, "days", `${name}: days with birds`, Number(e.currentTarget.value))}>
        {#snippet labelEnd()}<SkyReset label="Days with birds" changed={birds.days !== start.days} onclick={() => setLifeBirds(phase, "days", `${name}: reset days with birds`, start.days)} />{/snippet}
      </Slider>
    </div>
  </section>
{/if}
<section class={ui.group} aria-label="Stars">
  <h3 class={ui.heading}>Stars</h3>
  {#if skyStrength(phase).stars <= 0}
    <p class={ui.hint}>The stars do not show at this time of day. Give them a strength on the Look tab and their events can come.</p>
  {/if}
  <div use:hinted={"Makes every timed star event come less or more often at this time of day: shooting stars, showers, satellites and the aurora. The rates themselves are set in Stars."}>
    <Slider id="life-stars" size="sm" label="Star events" min={0} max={3} step={0.05} value={stars} format={(v) => (v === 0 ? "none" : v === 1 ? "as set" : `${num(v)}×`)} class={track} oninput={(e) => setLifeStars(phase, `${name}: star events`, Number(e.currentTarget.value))}>
      {#snippet labelEnd()}<SkyReset label="Star events" changed={stars !== 1} onclick={() => setLifeStars(phase, `${name}: reset star events`, 1)} />{/snippet}
    </Slider>
  </div>
</section>
<section class={ui.group} aria-label="An hour of this sky">
  <h3 class={ui.heading}>An hour of this sky</h3>
  <p class={ui.hint}>What {name.toLowerCase()} holds in one hour, worked out from every setting as it stands, for this month. These are means; the day's seed decides each hour.</p>
  <dl class="flex flex-col gap-3 font-mono text-xs">
    {#each hour as line (line.what)}
      <div class="flex flex-col gap-1">
        <div class="flex items-baseline justify-between gap-3">
          <dt class="text-foreground">{line.what}</dt>
          <dd class="text-right text-foreground-darker">{line.much}</dd>
        </div>
        {#each line.parts ?? [] as part (part.what)}
          <div class="flex items-baseline justify-between gap-3 border-l border-secondary/15 pl-3">
            <dt class="min-w-0 truncate text-foreground-darker">{part.what}</dt>
            <dd class="shrink-0 text-right tabular-nums text-foreground-darker">{part.much}</dd>
          </div>
        {/each}
      </div>
    {/each}
  </dl>
</section>
