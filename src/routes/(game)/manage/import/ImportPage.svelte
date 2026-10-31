<script lang="ts">
import { CREDIT_LICENCE_LABEL, percent as calcPercent } from "@orakl/shared";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import FileInput from "$lib/components/ui/FileInput.svelte";
  
  import Progress from "$lib/components/ui/Progress.svelte";
  import { buildPack, type PackImage } from "$lib/import-pack";
  import { unzipPack } from "$lib/import-unzip";
  import { onDestroy } from "svelte";
  interface PreviewData {
    total: number;
    valid: number;
    duplicates: number;
    byCategory: Record<string, number>;
    errors: string[];
    samples: {
      id: string;
      category: string;
      type: string;
      difficulty: string | undefined;
      questionText: string;
      correctAnswer: string;
      incorrectAnswers: string[];
    }[];
  }

  interface ImportResult {
    inserted: number;
    skipped: number;
    duplicates: number;
    errors: string[];
  }

  interface ImportProgress {
    processed: number;
    total: number;
    etaMs: number | null;
  }

  let fileName = $state("");
  let questions = $state<unknown[]>([]);
  let preview = $state<PreviewData | null>(null);
  let result = $state<ImportResult | null>(null);
  let importing = $state(false);
  let importProgress = $state<ImportProgress | null>(null);
  let checkingDb = $state(false);
  let dbDupes = $state<number | null>(null);
  let allClear = $state(false);
  /** The duplicate check could not run; the import is not blocked, but the
   *  "already in database" count is unknown and must not read as zero. */
  let dupeCheckFailed = $state(false);

  /** Images from a zip pack, by `images/<file>` path; empty for a plain JSON file. */
  let packImages = $state<Map<string, PackImage>>(new Map());
  /** Object URLs for the pack thumbnails, revoked when the file changes. */
  let thumbnails = $state<Map<string, string>>(new Map());
  let isPack = $state(false);
  let imageProgress = $state<{ done: number; total: number } | null>(null);
  /** Seconds the image upload is waiting out a 429, or null when not waiting. */
  let limitWaitSeconds = $state<number | null>(null);

  const IMAGE_RETRY_LIMIT = 10;
  const DEFAULT_RETRY_MS = 10_000;

  function revokeThumbnails() {
    for (const url of thumbnails.values()) URL.revokeObjectURL(url);
    thumbnails = new Map();
  }

  onDestroy(revokeThumbnails);

  function failPreview(message: string) {
    preview = {
      total: 0,
      valid: 0,
      duplicates: 0,
      byCategory: {},
      errors: [message],
      samples: [],
    };
  }

  async function loadZip(file: File) {
    try {
      const pack = buildPack(unzipPack(await file.arrayBuffer()));
      questions = pack.questions;
      packImages = pack.images;
      isPack = true;
      thumbnails = new Map(
        [...pack.images].map(([path, img]) => [
          path,
          URL.createObjectURL(new Blob([img.bytes as BlobPart], { type: img.type })),
        ]),
      );
      buildPreview();
      const problems = pack.problems.map((p) =>
        p.index < 0 ? p.message : `[${p.index}]${p.id ? ` ${p.id}` : ""}: ${p.message}`,
      );
      if (preview) preview.errors.push(...problems);
    } catch (err) {
      failPreview((err as Error).message);
    }
  }

  function loadFile(file: File) {
    fileName = file.name;
    preview = null;
    result = null;
    dbDupes = null;
    allClear = false;
    dupeCheckFailed = false;
    revokeThumbnails();
    packImages = new Map();
    isPack = false;

    if (file.name.toLowerCase().endsWith(".zip")) {
      void loadZip(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!Array.isArray(data)) throw new Error("File must contain a JSON array");
        questions = data;
        buildPreview();
      } catch (err) {
        failPreview((err as Error).message);
      }
    };
    reader.readAsText(file);
  }

  function buildPreview() {
    const errors: string[] = [];
    const byCategory: Record<string, number> = {};
    const samples: PreviewData["samples"] = [];
    const seenFingerprints = new Set<string>();
    let valid = 0;
    let duplicates = 0;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i] as Record<string, unknown>;
      const missing: string[] = [];
      if (typeof q?.id !== "string") missing.push("id");
      if (typeof q?.category !== "string") missing.push("category");
      if (typeof q?.type !== "string") missing.push("type");
      if (!q?.question || typeof (q.question as Record<string, unknown>)?.text !== "string")
        missing.push("question.text");
      if (typeof q?.correctAnswer !== "string") missing.push("correctAnswer");
      if (!Array.isArray(q?.incorrectAnswers)) missing.push("incorrectAnswers");

      if (missing.length > 0) {
        errors.push(`[${i}] missing: ${missing.join(", ")}`);
        continue;
      }

      if (typeof q.question_fingerprint === "string" && q.question_fingerprint.length > 0) {
        if (seenFingerprints.has(q.question_fingerprint)) {
          duplicates++;
          valid++;
          byCategory[q.category as string] = (byCategory[q.category as string] ?? 0) + 1;
          continue;
        }
        seenFingerprints.add(q.question_fingerprint);
      }

      valid++;
      byCategory[q.category as string] = (byCategory[q.category as string] ?? 0) + 1;

      if (samples.length < 3) {
        samples.push({
          id: q.id as string,
          category: q.category as string,
          type: q.type as string,
          difficulty: q.difficulty as string | undefined,
          questionText: (q.question as Record<string, string>).text,
          correctAnswer: q.correctAnswer as string,
          incorrectAnswers: q.incorrectAnswers as string[],
        });
      }
    }

    preview = { total: questions.length, valid, duplicates, byCategory, errors, samples };
    void checkDbDupes();
  }

  async function checkDbDupes() {
    const fingerprints = (questions as Record<string, unknown>[])
      .map((q) => q.question_fingerprint)
      .filter((fp): fp is string => typeof fp === "string" && fp.length > 0);

    if (fingerprints.length === 0) {
      dbDupes = 0;
      return;
    }

    checkingDb = true;
    dbDupes = null;
    dupeCheckFailed = false;
    try {
      const res = await fetch("/api/manage/check-fingerprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprints }),
      });
      if (res.ok) {
        const data = await res.json();
        dbDupes = data.existingCount ?? 0;
        allClear =
          dbDupes === 0 &&
          (preview?.duplicates ?? 1) === 0 &&
          (preview?.errors.length ?? 1) === 0 &&
          (preview?.valid ?? 0) > 0;
      } else {
        // Swallowing this left dbDupes null, which renders as neither badge —
        // so the duplicate check silently did not run and the import stayed
        // enabled (#860). Say so instead.
        dupeCheckFailed = true;
      }
    } catch {
      dupeCheckFailed = true;
    } finally {
      checkingDb = false;
    }
  }

  async function doImport() {
    if (!preview || preview.errors.length > 0) return;
    importing = true;
    result = null;

    let all = questions as Record<string, unknown>[];
    const BATCH = 10;
    const total = all.length;
    let processed = 0;
    let inserted = 0;
    let skipped = 0;
    let duplicates = 0;
    const errors: string[] = [];
    let msPerQuestion: number | null = null;

    importProgress = { processed: 0, total, etaMs: null };

    try {
      if (isPack) {
        const urls = await uploadPackImages();
        if (typeof urls === "string") {
          result = { inserted: 0, skipped: 0, duplicates: 0, errors: [urls] };
          return;
        }
        all = all.map((q) => withStoredUrl(q, urls));
      }

      for (let i = 0; i < all.length; i += BATCH) {
        const batch = all.slice(i, i + BATCH);
        const t0 = performance.now();

        const res = await fetch("/api/manage/import-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questions: batch }),
        });
        const elapsed = performance.now() - t0;
        const data = await res.json();

        if (!res.ok) {
          errors.push(data.error ?? "Import failed");
          break;
        }

        inserted += data.inserted ?? 0;
        skipped += data.skipped ?? 0;
        duplicates += data.duplicates ?? 0;
        if (Array.isArray(data.errors)) errors.push(...data.errors);

        processed += batch.length;
        if (i === 0) msPerQuestion = elapsed / batch.length;
        const etaMs = msPerQuestion !== null ? msPerQuestion * (total - processed) : null;
        importProgress = { processed, total, etaMs };
      }

      result = { inserted, skipped, duplicates, errors };
    } catch {
      result = { inserted: 0, skipped: 0, duplicates: 0, errors: ["Network error"] };
    } finally {
      importing = false;
      importProgress = null;
    }
  }

  /** Uploads each distinct pack image once; resolves to path → stored URL, or an error message. */
  async function uploadPackImages(): Promise<Map<string, string> | string> {
    const urls = new Map<string, string>();
    const entries = [...packImages];
    imageProgress = { done: 0, total: entries.length };
    try {
      for (const [path, img] of entries) {
        const outcome = await uploadOne(path, img);
        if (!outcome.ok) return outcome.error;
        urls.set(path, outcome.url);
        imageProgress = { done: urls.size, total: entries.length };
      }
      return urls;
    } finally {
      imageProgress = null;
      limitWaitSeconds = null;
    }
  }

  async function uploadOne(
    path: string,
    img: PackImage,
  ): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
    for (let attempt = 0; attempt <= IMAGE_RETRY_LIMIT; attempt++) {
      const form = new FormData();
      form.append("file", new File([img.bytes as BlobPart], img.name, { type: img.type }));
      const res = await fetch("/api/manage/import-image", { method: "POST", body: form });
      if (res.status === 429) {
        const header = Number(res.headers.get("Retry-After"));
        const waitMs = header > 0 ? header * 1000 : DEFAULT_RETRY_MS;
        limitWaitSeconds = Math.ceil(waitMs / 1000);
        await new Promise((r) => setTimeout(r, waitMs));
        limitWaitSeconds = null;
        continue;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: `${path}: ${data.error ?? "Image upload failed"}` };
      return { ok: true, url: data.url };
    }
    return { ok: false, error: `${path}: rate limited, try again in a few minutes` };
  }

  function withStoredUrl(q: Record<string, unknown>, urls: Map<string, string>) {
    const question = q.question as { media?: { url?: string } } | undefined;
    const stored = question?.media?.url ? urls.get(question.media.url) : undefined;
    if (!question?.media || !stored) return q;
    return { ...q, question: { ...question, media: { ...question.media, url: stored } } };
  }

  interface PackRow {
    id: string;
    text: string;
    thumbnail: string | undefined;
    credit: string;
  }

  /** A pack row as read from `questions.json`, before validation. */
  type PackRowSource = {
    id?: unknown;
    question?: {
      text?: unknown;
      media?: { url?: unknown; credit?: { licence?: string; author?: string } };
    };
  } | null;

  const packRows = $derived.by<PackRow[]>(() => {
    if (!isPack) return [];
    const rows: PackRow[] = [];
    for (const q of questions as PackRowSource[]) {
      const media = q?.question?.media;
      if (typeof media?.url !== "string") continue;
      const credit = media.credit;
      rows.push({
        id: String(q?.id),
        text: String(q?.question?.text),
        thumbnail: thumbnails.get(media.url),
        credit: credit
          ? [
              credit.licence
                ? (CREDIT_LICENCE_LABEL[credit.licence as keyof typeof CREDIT_LICENCE_LABEL] ??
                  credit.licence)
                : undefined,
              credit.author,
            ]
              .filter(Boolean)
              .reverse()
              .join(" · ")
          : "No credit",
      });
    }
    return rows;
  });

  /** A zip has no fingerprints to check, so its gate is clean rows rather than `allClear`. */
  const canImport = $derived(
    isPack
      ? !checkingDb &&
          (preview?.errors.length ?? 1) === 0 &&
          (preview?.duplicates ?? 1) === 0 &&
          (dbDupes ?? 0) === 0 &&
          (preview?.valid ?? 0) > 0
      : allClear,
  );

  const percent = $derived(
    importProgress && importProgress.total > 0
      ? calcPercent(importProgress.processed, importProgress.total)
      : 0,
  );

  const imagePercent = $derived(
    imageProgress && imageProgress.total > 0
      ? calcPercent(imageProgress.done, imageProgress.total)
      : 0,
  );

  const importButtonLabel = $derived(
    imageProgress
      ? `Uploading images ${imageProgress.done} / ${imageProgress.total}`
      : importing
      ? "Importing…"
      : checkingDb
        ? "Checking duplicates…"
        : `Import ${preview?.valid ?? 0} questions`,
  );
</script>

<div class="flex flex-col gap-6">
  <!-- File picker -->
  <Card variant="mezzanine" class="gap-3">
    <h2 class="text-xl">Select file</h2>
    <FileInput
      id="json-file"
      label={fileName || "Drop a .json or .zip file or click to browse"}
      accept=".json,.zip"
      dropzone
      onfiles={(files) => loadFile(files[0])}
    >
      <span class="text-xs text-foreground-darker">tta-questions.json, any exported question set, or a zip with questions.json and an images folder</span>
    </FileInput>
  </Card>

  <!-- Preview -->
  {#if preview !== null}
    <Card variant="mezzanine" class="gap-3">
      <h2 class="text-xl">Preview</h2>

      <!-- Summary badges -->
      <div class="flex flex-wrap gap-2">
        <Badge variant="status">{preview.total} total</Badge>
        <Badge variant="status" tone="success">{preview.valid} valid</Badge>
        {#if preview.total - preview.valid > 0}
          <Badge variant="status" tone="danger">{preview.total - preview.valid} invalid</Badge>
        {/if}
        {#if preview.duplicates > 0}
          <Badge variant="status" tone="warning">{preview.duplicates} content dupes</Badge>
        {/if}
        {#if checkingDb}
          <Badge variant="status" class="animate-pulse" role="status" aria-live="polite">Checking duplicates…</Badge>
        {/if}
        {#if !checkingDb && dbDupes !== null && dbDupes > 0}
          <Badge variant="status" tone="info">{dbDupes} already in database</Badge>
        {/if}
        {#if dupeCheckFailed}
          <Badge variant="status" tone="warning" role="status" aria-live="polite"
            >Duplicate check unavailable — importing may re-add existing questions</Badge
          >
        {/if}
        {#if allClear}
          <Badge variant="status" tone="success">All unique — safe to import</Badge>
        {:else if isPack && canImport}
          <Badge variant="status" tone="success">Ready to import</Badge>
        {/if}
      </div>

      <!-- By category -->
      <div class="flex flex-wrap gap-2">
        {#each Object.entries(preview.byCategory) as [cat, count]}
          <Badge variant="status">{cat}: {count}</Badge>
        {/each}
      </div>

      <!-- Sample rows -->
      {#if preview.samples.length > 0}
        <div class="flex flex-col gap-2">
          <p class="text-xs text-foreground-darker">First {preview.samples.length} valid questions</p>
          {#each preview.samples as s, i (i)}
            <Card padding="sm" class="gap-0 px-3 py-2.5 font-mono text-xs">
              <table class="w-full">
                <tbody>
                  <tr><td class="w-32 py-0.5 pr-4 text-foreground-darker">id</td><td class="max-w-xs truncate py-0.5 text-secondary-300">{s.id}</td></tr>
                  <tr><td class="py-0.5 pr-4 text-foreground-darker">category</td><td class="py-0.5">{s.category}</td></tr>
                  <tr><td class="py-0.5 pr-4 text-foreground-darker">type</td><td class="py-0.5">{s.type}</td></tr>
                  <tr><td class="py-0.5 pr-4 text-foreground-darker">difficulty</td><td class="py-0.5">{s.difficulty ?? "—"}</td></tr>
                  <tr><td class="py-0.5 pr-4 text-foreground-darker">question</td><td class="py-0.5 whitespace-normal">{s.questionText}</td></tr>
                  <tr><td class="py-0.5 pr-4 text-foreground-darker">correct</td><td class="py-0.5 text-success">{s.correctAnswer}</td></tr>
                  <tr><td class="py-0.5 pr-4 text-foreground-darker">incorrect</td><td class="py-0.5 text-danger">{s.incorrectAnswers.join(" / ")}</td></tr>
                </tbody>
              </table>
            </Card>
          {/each}
        </div>
      {/if}

      <!-- Pack images -->
      {#if packRows.length > 0}
        <div class="flex flex-col gap-2">
          <p class="text-xs text-foreground-darker">Questions with images ({packRows.length})</p>
          {#each packRows.slice(0, 50) as row, i (i)}
            <Card padding="sm" class="flex-row items-center gap-3 px-3 py-2.5 text-xs">
              {#if row.thumbnail}
                <img src={row.thumbnail} alt="" class="size-12 shrink-0 rounded-sm object-cover" />
              {:else}
                <div class="size-12 shrink-0 rounded-sm border border-border bg-surface" aria-hidden="true"></div>
              {/if}
              <div class="flex min-w-0 flex-col gap-0.5">
                <span class="truncate">{row.text}</span>
                <span class="text-foreground-darker">{row.credit}</span>
              </div>
            </Card>
          {/each}
          {#if packRows.length > 50}
            <p class="text-xs text-foreground-darker">…and {packRows.length - 50} more</p>
          {/if}
        </div>
      {/if}

      <!-- Validation errors -->
      {#if preview.errors.length > 0}
        <Card variant="danger" padding="sm" class="gap-1 p-3 font-sans text-xs text-danger-light" role="alert">
          <p class="font-semibold">Validation errors ({preview.errors.length})</p>
          <ul class="max-h-64 list-inside list-disc space-y-0.5 overflow-y-auto">
            {#each preview.errors as err}
              <li>{err}</li>
            {/each}
          </ul>
        </Card>
      {/if}

      <Button
        variant="primary"
        class="self-start"
        disabled={!canImport || importing}
        loading={importing}
        onclick={doImport}
      >
        {importButtonLabel}
      </Button>

      <!-- Progress -->
      {#if limitWaitSeconds !== null}
        <p class="text-xs text-foreground-darker" role="status">Upload limit reached. Waiting {limitWaitSeconds} s…</p>
      {/if}
      {#if importing && importProgress !== null}
        <div class="flex w-full flex-col gap-1.5">
          <Progress
            value={imageProgress ? imagePercent : percent}
            label={imageProgress ? "Image upload progress" : "Import progress"}
            class="h-1.5"
          />
          <div class="flex justify-between font-mono text-xs text-foreground-darker" aria-live="polite">
            {#if imageProgress}
              <span>Uploading images {imageProgress.done} / {imageProgress.total}</span>
            {:else}
              <span>{importProgress.processed} / {importProgress.total}</span>
            {/if}
            {#if importProgress.etaMs !== null}
              <span>{importProgress.etaMs > 1000 ? `~${Math.ceil(importProgress.etaMs / 1000)}s left` : "Almost done…"}</span>
            {/if}
          </div>
        </div>
      {/if}
    </Card>
  {/if}

  <!-- Results -->
  {#if result !== null}
    <Card variant="mezzanine" class="gap-3">
      <h2 class="text-xl">Results</h2>
      <div class="flex flex-wrap gap-2 font-sans text-sm">
        <Badge variant="status" tone="success">Inserted: {result.inserted}</Badge>
        <Badge variant="status">Skipped (already in DB): {result.skipped}</Badge>
      </div>
      {#if result.errors.length > 0}
        <Card variant="danger" padding="sm" class="gap-1 p-3 font-sans text-xs text-danger-light" role="alert">
          <p class="font-semibold">Import errors</p>
          <ul class="list-inside list-disc space-y-0.5">
            {#each result.errors as err}
              <li>{err}</li>
            {/each}
          </ul>
        </Card>
      {/if}
    </Card>
  {/if}
</div>
