<script lang="ts">
import { percent as calcPercent } from "@orakl/shared";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import FileInput from "$lib/components/ui/FileInput.svelte";
  
  import Progress from "$lib/components/ui/Progress.svelte";
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

  function loadFile(file: File) {
    fileName = file.name;
    preview = null;
    result = null;
    dbDupes = null;
    allClear = false;
    dupeCheckFailed = false;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!Array.isArray(data)) throw new Error("File must contain a JSON array");
        questions = data;
        buildPreview();
      } catch (err) {
        preview = {
          total: 0,
          valid: 0,
          duplicates: 0,
          byCategory: {},
          errors: [(err as Error).message],
          samples: [],
        };
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

    const all = questions as Record<string, unknown>[];
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

  const percent = $derived(
    importProgress && importProgress.total > 0
      ? calcPercent(importProgress.processed, importProgress.total)
      : 0,
  );

  const importButtonLabel = $derived(
    importing
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
      label={fileName || "Drop a .json file or click to browse"}
      accept=".json"
      dropzone
      onfiles={(files) => loadFile(files[0])}
    >
      <span class="text-xs text-foreground-darker">tta-questions.json or any exported question set</span>
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

      <!-- Validation errors -->
      {#if preview.errors.length > 0}
        <Card variant="danger" padding="sm" class="gap-1 p-3 font-sans text-xs text-danger-light" role="alert">
          <p class="font-semibold">Validation errors ({preview.errors.length})</p>
          <ul class="list-inside list-disc space-y-0.5">
            {#each preview.errors.slice(0, 10) as err}
              <li>{err}</li>
            {/each}
            {#if preview.errors.length > 10}
              <li class="text-danger-light/70">…and {preview.errors.length - 10} more</li>
            {/if}
          </ul>
        </Card>
      {/if}

      <Button
        variant="primary"
        class="self-start"
        disabled={!allClear || importing}
        loading={importing}
        onclick={doImport}
      >
        {importButtonLabel}
      </Button>

      <!-- Progress -->
      {#if importing && importProgress !== null}
        <div class="flex w-full flex-col gap-1.5">
          <Progress value={percent} label="Import progress" class="h-1.5" />
          <div class="flex justify-between font-mono text-xs text-foreground-darker" aria-live="polite">
            <span>{importProgress.processed} / {importProgress.total}</span>
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
