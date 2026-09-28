<script lang="ts">
import { LOGO_SCHEDULE } from "@orakl/shared";
  import { MediaQuery } from "svelte/reactivity";
  import { tv, type VariantProps } from "tailwind-variants";
  
  import { cn } from "tailwind-variants";

  const logoVariants = tv({
    base: "w-auto",
    variants: {
      size: { sm: "h-12", md: "h-20", lg: "h-32" },
    },
    defaultVariants: { size: "md" },
  });

  type LogoVariants = VariantProps<typeof logoVariants>;

  let {
    variant = "mark",
    size = "md",
    class: className = "",
    id = undefined,
    speed = 1,
    gradientScale = undefined,
  }: {
    variant?: "mark" | "wordmark";
    size?: NonNullable<LogoVariants["size"]>;
    class?: string;
    id?: string;
    speed?: number;
    gradientScale?: number;
  } = $props();

  const effectiveGradientScale = $derived(gradientScale ?? (variant === "mark" ? 1 : 0.5));

  const lightId = $derived(variant === "mark" ? "mark-gradient-light" : "wordmark-gradient-light");
  const darkId = $derived(variant === "mark" ? "mark-gradient-dark" : "wordmark-gradient-dark");
  const maskId = $derived(variant === "mark" ? "mark-mask" : "wordmark-mask");

  const vbW = $derived(variant === "mark" ? 630 : 2215);
  const vbH = $derived(variant === "mark" ? 630 : 603);
  const gCx = $derived(vbW / 2);
  const gCy = $derived(vbH / 2);
  const gR = $derived((Math.sqrt(vbW ** 2 + vbH ** 2) / 2) * 1.5 * effectiveGradientScale);

  const paused = $derived(speed === 0);
  const cxDur = $derived(speed > 0 ? `${(60 / speed).toFixed(1)}s` : "0s");
  const cyDur = $derived(speed > 0 ? `${(78 / speed).toFixed(1)}s` : "0s");
  const maxOut = $derived(Math.round(gR * 0.5));
  const cxValues = $derived(`${gCx};${-maxOut};${vbW + maxOut};${gCx};${vbW + maxOut};${-maxOut};${gCx}`);
  const cyValues = $derived(`${gCy};${vbH + maxOut};${-maxOut};${gCy};${-maxOut};${vbH + maxOut};${gCy}`);

  const reducedMotion = new MediaQuery("(prefers-reduced-motion: reduce)");

  let svgEl: SVGSVGElement | undefined = $state();

  $effect(() => {
    if (!svgEl) return;
    if (reducedMotion.current) {
      svgEl.pauseAnimations?.();
    } else {
      svgEl.unpauseAnimations?.();
    }
  });
</script>

{#if variant === "mark"}
  <svg
    bind:this={svgEl}
    viewBox="0 0 630 630"
    width="80"
    height="80"
    class={cn(logoVariants({ size }), className)}
    xmlns="http://www.w3.org/2000/svg"
    data-animated-logo
    {id}
    aria-hidden="true"
    role="presentation"
  >
    <defs>
      <mask id={maskId}>
        <g transform="matrix(0.214241,0,0,0.288032,-6.3604,26.968911)">
          <path fill="white" d="M1501.914,2042.848C699.101,2042.848 30.73,1714.278 30.73,999.996C30.73,288.57 699.101,-42.857 1501.914,-42.857C2300.887,-42.857 2969.258,288.57 2969.258,999.996C2969.258,1714.278 2300.887,2042.848 1501.914,2042.848ZM571.896,770.58C1137.21,530.99 1865.149,531.697 2431.061,771.705C2451.308,780.514 2476.809,778.93 2494.81,767.744C2512.811,756.558 2519.444,738.174 2511.391,721.788C2348.14,396.975 1957.103,168.006 1501.153,168.006C1045.797,168.006 655.184,396.38 491.442,720.49C483.334,736.91 489.954,755.35 507.988,766.578C526.023,777.806 551.591,779.407 571.896,770.58ZM2130.252,1573.475C1725.963,1678.054 1274.612,1677.542 870.248,1572.112C844.997,1565.45 816.942,1573.065 803.395,1590.259C789.848,1607.453 794.627,1629.381 814.782,1642.511C1002.35,1766.694 1241.202,1841.12 1501.153,1841.12C1760.153,1841.12 1998.207,1767.238 2185.371,1643.796C2205.526,1630.733 2210.364,1608.863 2196.9,1591.685C2183.436,1574.507 2155.465,1566.864 2130.252,1573.475ZM2555.091,1071.995C1986.567,665.19 1013.83,664.182 447.074,1071.436C429.028,1084.501 418.861,1102.443 418.887,1121.174C418.914,1139.905 429.133,1157.831 447.216,1170.868C1015.74,1577.672 1988.477,1578.681 2555.233,1171.427C2573.278,1158.362 2583.446,1140.42 2583.419,1121.689C2583.393,1102.957 2573.174,1085.032 2555.091,1071.995Z" />
        </g>
      </mask>
      <radialGradient id={lightId} cx={gCx} cy={gCy} r={gR} gradientUnits="userSpaceOnUse">
        <stop offset="0" style="stop-color:rgb(255,255,52);stop-opacity:1" />
        <stop offset="0.21" style="stop-color:rgb(207,234,102);stop-opacity:1" />
        <stop offset="0.45" style="stop-color:rgb(81,178,232);stop-opacity:1" />
        <stop offset="0.6" style="stop-color:rgb(175,219,247);stop-opacity:1" />
        <stop offset="0.77" style="stop-color:rgb(202,230,251);stop-opacity:1" />
        <stop offset="1" style="stop-color:rgb(230,246,255);stop-opacity:1" />
        {#if !paused}
          <animate attributeName="cx" values={cxValues} dur={cxDur} repeatCount="indefinite" />
          <animate attributeName="cy" values={cyValues} dur={cyDur} repeatCount="indefinite" />
        {/if}
      </radialGradient>
      <radialGradient id={darkId} cx={gCx} cy={gCy} r={gR} gradientUnits="userSpaceOnUse">
        <stop offset="0" style="stop-color:#eed12b;stop-opacity:1" />
        <stop offset="0.14" style="stop-color:#bfc75c;stop-opacity:1" />
        <stop offset="0.28" style="stop-color:#3aaae5;stop-opacity:1" />
        <stop offset="0.48" style="stop-color:#25336c;stop-opacity:1" />
        <stop offset="0.72" style="stop-color:#20144c;stop-opacity:1" />
        <stop offset="1" style="stop-color:#1e0840;stop-opacity:1" />
        {#if !paused}
          <animate attributeName="cx" values={cxValues} dur={cxDur} repeatCount="indefinite" />
          <animate attributeName="cy" values={cyValues} dur={cyDur} repeatCount="indefinite" />
        {/if}
      </radialGradient>
    </defs>
    <g mask="url(#{maskId})">
      <rect class="logo-rect-light" x="0" y="0" width="630" height="630" fill="url(#{lightId})" />
      <rect class="logo-rect-dark" x="0" y="0" width="630" height="630" fill="url(#{darkId})" />
    </g>
  </svg>
{:else}
  <svg
    bind:this={svgEl}
    viewBox="0 0 2215 603"
    width="293"
    height="80"
    class={cn(logoVariants({ size }), className)}
    xmlns="http://www.w3.org/2000/svg"
    data-animated-logo
    {id}
    aria-hidden="true"
    role="presentation"
  >
    <defs>
      <mask id={maskId}>
        <g transform="matrix(1,0,0,1,-0.085367,-0.318746)" fill="white">
          <g transform="matrix(1.062083,0,0,1.098472,-668.528119,-1203.488234)">
            <g transform="matrix(1,0,0,1,-5.649275,0)">
              <path d="M1269.871,1632.976L1397.133,1632.976C1388.545,1609.574 1386.203,1579.379 1386.203,1545.409L1386.203,1459.353C1386.203,1385.374 1449.443,1326.493 1518.149,1326.493C1547.817,1326.493 1578.266,1337.062 1593.1,1349.14L1593.1,1255.534C1578.266,1249.495 1556.405,1245.721 1534.544,1245.721C1463.497,1245.721 1412.748,1291.769 1393.229,1371.786L1386.203,1371.786L1386.203,1338.571C1386.203,1309.131 1393.229,1273.651 1402.598,1255.534L1269.871,1255.534C1276.117,1285.73 1280.021,1318.944 1280.021,1370.276L1280.021,1528.047C1280.021,1578.624 1276.117,1603.535 1269.871,1632.976Z" />
            </g>
            <g transform="matrix(1,0,0,1,-15.064734,0)">
              <path d="M1772.672,1642.789C1853.089,1642.789 1904.618,1610.329 1923.356,1568.811L1930.383,1568.811L1930.383,1575.605C1930.383,1600.516 1926.479,1622.407 1921.014,1632.976L2042.81,1632.976C2033.441,1607.31 2031.099,1576.36 2031.099,1512.194L2031.099,1389.149C2031.099,1278.936 1935.067,1245.721 1821.078,1245.721C1760.961,1245.721 1685.229,1260.818 1656.341,1271.387L1656.341,1341.591C1675.86,1327.248 1737.539,1307.621 1799.998,1307.621C1881.196,1307.621 1930.383,1339.326 1930.383,1406.511L1930.383,1459.353L1921.795,1459.353C1903.838,1420.854 1852.308,1384.619 1773.453,1384.619C1668.052,1384.619 1609.496,1440.481 1609.496,1513.704C1609.496,1586.928 1668.052,1642.789 1772.672,1642.789ZM1817.175,1579.379C1749.25,1579.379 1710.212,1551.448 1710.212,1512.949C1710.212,1474.45 1749.25,1446.52 1817.175,1446.52C1885.88,1446.52 1929.602,1481.244 1929.602,1512.949C1929.602,1555.223 1885.88,1579.379 1817.175,1579.379Z" />
            </g>
            <g transform="matrix(1,0,0,1,-18.830918,0)">
              <path d="M2487.836,1644.299C2518.285,1644.299 2547.953,1631.466 2561.226,1610.329L2557.322,1508.42C2548.734,1532.576 2536.242,1551.448 2505.793,1551.448C2449.579,1551.448 2440.991,1451.049 2362.916,1451.049L2362.916,1444.255L2366.82,1444.255C2459.729,1444.255 2519.066,1408.776 2519.066,1344.61C2519.066,1283.465 2476.905,1245.721 2391.023,1245.721C2304.36,1245.721 2250.489,1287.994 2224.724,1349.895L2219.259,1349.895L2219.259,1231.378C2219.259,1180.046 2223.944,1133.998 2230.19,1104.558L2102.928,1104.558C2109.174,1133.998 2113.858,1180.046 2113.858,1231.378L2113.858,1506.155C2113.858,1557.487 2109.174,1603.535 2102.928,1632.976L2230.19,1632.976C2224.724,1609.574 2220.04,1576.36 2220.04,1531.067L2220.04,1481.244C2228.628,1478.225 2255.954,1475.205 2270.788,1475.205C2406.638,1475.205 2357.451,1644.299 2487.836,1644.299ZM2220.821,1415.569C2223.163,1368.767 2284.842,1325.738 2344.959,1325.738C2385.558,1325.738 2409.761,1341.591 2409.761,1367.257C2409.761,1399.717 2376.97,1415.569 2327.002,1415.569L2220.821,1415.569Z" />
            </g>
            <g transform="matrix(1,0,0,1,-28.246377,0)">
              <path d="M2615.878,1632.976L2743.14,1632.976C2736.894,1603.535 2732.21,1557.487 2732.21,1506.155L2732.21,1231.378C2732.21,1180.046 2736.894,1133.998 2743.14,1104.558L2615.878,1104.558C2622.124,1133.998 2626.809,1180.046 2626.809,1231.378L2626.809,1506.155C2626.809,1557.487 2622.124,1603.535 2615.878,1632.976Z" />
            </g>
            <g transform="matrix(0.201718,0,0,0.262212,623.331545,1107.130167)">
              <path d="M1501.914,2042.848C699.101,2042.848 30.73,1714.278 30.73,999.996C30.73,288.57 699.101,-42.857 1501.914,-42.857C2300.887,-42.857 2969.258,288.57 2969.258,999.996C2969.258,1714.278 2300.887,2042.848 1501.914,2042.848ZM2553.687,1065.791C1985.163,658.986 1012.425,657.978 445.67,1065.231C427.624,1078.297 417.457,1096.238 417.483,1114.97C417.51,1133.701 427.729,1151.627 445.812,1164.663C1014.336,1571.468 1987.073,1572.477 2553.828,1165.223C2571.874,1152.158 2582.042,1134.216 2582.015,1115.484C2581.989,1096.753 2571.77,1078.827 2553.687,1065.791ZM570.492,764.376C1135.806,524.786 1863.745,525.493 2429.657,765.501C2449.904,774.31 2475.405,772.726 2493.406,761.54C2511.407,750.354 2518.04,731.97 2509.986,715.584C2346.736,390.771 1955.699,161.802 1499.749,161.802C1044.393,161.802 653.78,390.176 490.037,714.285C481.93,730.706 488.55,749.145 506.584,760.374C524.619,771.602 550.187,773.203 570.492,764.376ZM2128.848,1567.27C1724.559,1671.85 1273.208,1671.338 868.844,1565.908C843.593,1559.246 815.538,1566.861 801.991,1584.055C788.444,1601.249 793.223,1623.176 813.378,1636.307C1000.946,1760.489 1239.797,1834.916 1499.749,1834.916C1758.749,1834.916 1996.803,1761.034 2183.967,1637.592C2204.122,1624.529 2208.96,1602.659 2195.496,1585.481C2182.032,1568.303 2154.061,1560.66 2128.848,1567.27Z" />
            </g>
          </g>
        </g>
      </mask>
      <radialGradient id={lightId} cx={gCx} cy={gCy} r={gR} gradientUnits="userSpaceOnUse">
        <stop offset="0" style="stop-color:rgb(255,255,52);stop-opacity:1" />
        <stop offset="0.21" style="stop-color:rgb(207,234,102);stop-opacity:1" />
        <stop offset="0.45" style="stop-color:rgb(81,178,232);stop-opacity:1" />
        <stop offset="0.6" style="stop-color:rgb(175,219,247);stop-opacity:1" />
        <stop offset="0.77" style="stop-color:rgb(202,230,251);stop-opacity:1" />
        <stop offset="1" style="stop-color:rgb(230,246,255);stop-opacity:1" />
        {#if !paused}
          <animate attributeName="cx" values={cxValues} dur={cxDur} repeatCount="indefinite" />
          <animate attributeName="cy" values={cyValues} dur={cyDur} repeatCount="indefinite" />
        {/if}
      </radialGradient>
      <radialGradient id={darkId} cx={gCx} cy={gCy} r={gR} gradientUnits="userSpaceOnUse">
        <stop offset="0" style="stop-color:#eed12b;stop-opacity:1" />
        <stop offset="0.14" style="stop-color:#bfc75c;stop-opacity:1" />
        <stop offset="0.28" style="stop-color:#3aaae5;stop-opacity:1" />
        <stop offset="0.48" style="stop-color:#25336c;stop-opacity:1" />
        <stop offset="0.72" style="stop-color:#20144c;stop-opacity:1" />
        <stop offset="1" style="stop-color:#1e0840;stop-opacity:1" />
        {#if !paused}
          <animate attributeName="cx" values={cxValues} dur={cxDur} repeatCount="indefinite" />
          <animate attributeName="cy" values={cyValues} dur={cyDur} repeatCount="indefinite" />
        {/if}
      </radialGradient>
    </defs>
    <g mask="url(#{maskId})">
      <rect class="logo-rect-light" x="0" y="0" width="2215" height="603" fill="url(#{lightId})" />
      <rect class="logo-rect-dark" x="0" y="0" width="2215" height="603" fill="url(#{darkId})" />
    </g>
  </svg>
{/if}

<style>
  :global([data-animated-logo] .logo-rect-light),
  :global([data-animated-logo] .logo-rect-dark) {
    transition: opacity var(--ui-theme-transition-duration, 0.5s) ease;
  }
  :global([data-animated-logo] .logo-rect-dark) {
    opacity: 0;
  }
  /* Dark logo phases derived from LOGO_SCHEDULE: sunset, morning, noon, evening */
  :global(html[data-sky-phase="sunset"] [data-animated-logo] .logo-rect-light),
  :global(html[data-sky-phase="morning"] [data-animated-logo] .logo-rect-light),
  :global(html[data-sky-phase="noon"] [data-animated-logo] .logo-rect-light),
  :global(html[data-sky-phase="evening"] [data-animated-logo] .logo-rect-light) {
    opacity: 0;
  }
  :global(html[data-sky-phase="sunset"] [data-animated-logo] .logo-rect-dark),
  :global(html[data-sky-phase="morning"] [data-animated-logo] .logo-rect-dark),
  :global(html[data-sky-phase="noon"] [data-animated-logo] .logo-rect-dark),
  :global(html[data-sky-phase="evening"] [data-animated-logo] .logo-rect-dark) {
    opacity: 1;
  }
</style>
