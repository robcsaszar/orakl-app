<script lang="ts">
import { isHttpsUrl } from "@orakl/shared";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import FileInput from "$lib/components/ui/FileInput.svelte";
  import Icon from "$lib/components/ui/Icon.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import RadioGroup from "$lib/components/ui/RadioGroup.svelte";
  import Select from "$lib/components/ui/Select.svelte";
  
  import { toast } from "@/lib/toast.js";
  import { cn } from "tailwind-variants";
  import ResponsiveOverlay from "$lib/components/ui/ResponsiveOverlay.svelte";
  import QuestionHistoryModal from "./QuestionHistoryModal.svelte";

  // Native colour pickers only take #rrggbb; this is the secondary token's hex twin.
  const DEFAULT_CATEGORY_COLOR = "#a855f7";

  interface Category {
    id: string;
    name: string;
    icon?: string;
    count: number;
  }

  interface OwnQuestion {
    id: string;
    category: string;
    label: string;
    created_at: string;
  }

  let {
    categories,
    ownQuestions = [],
    questionsCursor = null,
  }: {
    categories: Category[];
    ownQuestions?: OwnQuestion[];
    questionsCursor?: string | null;
  } = $props();

  type QuestionType = "standard" | "true_false" | "image_matching";
  type ImageMode = "file" | "url";

  const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
    standard: "Multiple choice",
    true_false: "True/false",
    image_matching: "Image matching",
  };

  let categoryId = $state("");
  let questionText = $state("");
  let questionType = $state<QuestionType>("standard");
  let difficulty = $state<"easy" | "medium" | "hard">("easy");
  let submitting = $state(false);
  let editingId = $state<string | null>(null);
  let formEl = $state<HTMLDivElement | undefined>(undefined);

  // Text choice answers
  let answers = $state([{ text: "" }, { text: "" }, { text: "" }, { text: "" }]);
  let correctAnswerIndex = $state(0);

  // True/false
  let trueFalseAnswer = $state<"true" | "false">("true");

  // Source and post-answer note (any question type)
  let sourceUrl = $state("");
  let sourceLabel = $state("");
  let postAnswerNote = $state("");
  let sourceUrlError = $state("");
  let postAnswerNoteError = $state("");

  // Image matching
  let imageMode = $state<ImageMode>("url");
  let imageUrl = $state("");
  let pendingFile = $state<File | null>(null);
  let imagePreviewUrl = $state("");
  let imageStatus = $state<{ message: string; type: "neutral" | "success" | "error" } | null>(null);
  // Image matching opens the block through its own branch below, so this only
  // tracks a curator choosing to add an image to a type that does not need one.
  let imageExpanded = $state(false);
  let matchPairs = $state([
    { left: "", right: "" },
    { left: "", right: "" },
    { left: "", right: "" },
    { left: "", right: "" },
  ]);
  let correctPairIndex = $state(0);

  // New category
  let showNewCategory = $state(false);
  let newCategoryName = $state("");
  let newCategoryIcon = $state("");
  let newCategoryColor = $state(DEFAULT_CATEGORY_COLOR);
  let newCategoryError = $state("");
  let addingCategory = $state(false);
  // Writable derived: optimistic count/add updates reassign locally; resets
  // to server truth when the prop refreshes.
  let localCategories = $derived<Category[]>(categories);

  async function addCategory() {
    newCategoryError = "";
    const name = newCategoryName.trim();
    if (!name) {
      newCategoryError = "Name is required.";
      return;
    }
    addingCategory = true;
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          icon: newCategoryIcon.trim() || undefined,
          color: newCategoryColor,
        }),
      });
      const data = await res.json() as { id?: string; error?: string };
      if (!res.ok || !data.id) {
        newCategoryError = data.error ?? "Failed to create category.";
        return;
      }
      localCategories = [
        ...localCategories,
        { id: data.id, name, icon: newCategoryIcon.trim() || undefined, count: 0 },
      ];
      categoryId = data.id;
      showNewCategory = false;
      newCategoryName = "";
      newCategoryIcon = "";
      newCategoryColor = DEFAULT_CATEGORY_COLOR;
    } catch {
      newCategoryError = "Network error. Try again.";
    } finally {
      addingCategory = false;
    }
  }

  async function checkDimensions(file: File): Promise<{ ok: boolean }> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ ok: img.naturalWidth >= 100 && img.naturalHeight >= 100 });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ ok: false });
      };
      img.src = url;
    });
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      imageStatus = { message: "File must be an image.", type: "error" };
      return;
    }
    const { ok } = await checkDimensions(file);
    if (!ok) {
      imageStatus = { message: "Image must be at least 100×100 px.", type: "error" };
      return;
    }
    if (imagePreviewUrl.startsWith("blob:")) URL.revokeObjectURL(imagePreviewUrl);
    pendingFile = file;
    imagePreviewUrl = URL.createObjectURL(file);
    imageStatus = { message: `${file.name} ready to upload.`, type: "success" };
  }

  function onImageUrlInput() {
    const val = imageUrl.trim();
    if (!val) {
      imagePreviewUrl = "";
      return;
    }
    imagePreviewUrl = val;
    imageStatus = null;
  }

  /** Clears the image reference; leaves the stored file untouched (issue #916) —
   *  submitting after this plays the question with no image. */
  function removeImage() {
    imageUrl = "";
    pendingFile = null;
    if (imagePreviewUrl.startsWith("blob:")) URL.revokeObjectURL(imagePreviewUrl);
    imagePreviewUrl = "";
    imageStatus = null;
  }

  /** Resolves the image to submit: uploads a pending file, or takes the
   *  pasted/retained URL. Undefined means no image — omitted from the
   *  payload, which the API stores as no image on any type but
   *  image_matching. Throws with a user-facing message on upload failure. */
  async function resolveImageUrl(): Promise<string | undefined> {
    if (imageMode === "file") {
      // Switching to file mode without choosing one keeps the image the
      // question already has; clearing it is what removeImage() is for.
      if (!pendingFile) return imageUrl.trim() || undefined;
      const fd = new FormData();
      fd.append("file", pendingFile);
      const uploadRes = await fetch("/api/upload-image", { method: "POST", body: fd });
      const uploadData = await uploadRes.json() as { url?: string; error?: string };
      if (!uploadRes.ok || !uploadData.url) {
        throw new Error(uploadData.error ?? "Image upload failed.");
      }
      return uploadData.url;
    }
    return imageUrl.trim() || undefined;
  }

  function validateExtras(): boolean {
    sourceUrlError = "";
    postAnswerNoteError = "";
    const url = sourceUrl.trim();
    if (url && !isHttpsUrl(url)) {
      sourceUrlError = "Source URL must start with https://.";
    }
    if (postAnswerNote.length > 160) {
      postAnswerNoteError = "Note must be 160 characters or fewer.";
    }
    return !sourceUrlError && !postAnswerNoteError;
  }

  async function submit() {
    const isEditing = editingId !== null;
    // An existing question in a category the pickers hide (Image Quiz while
    // its flag is off) resolves to no id; the edit then keeps its category.
    if (!isEditing && !categoryId) { toast.error("Select a category."); return; }
    const text = questionText.trim();
    if (!text) { toast.error("Enter a question."); return; }
    if (!validateExtras()) { toast.error("Fix the errors below."); return; }

    const url = sourceUrl.trim();
    const extras = {
      ...(url ? { source: { url, label: sourceLabel.trim() || undefined } } : {}),
      ...(postAnswerNote.trim() ? { postAnswerNote: postAnswerNote.trim() } : {}),
    };

    let payload: Record<string, unknown>;

    if (questionType === "image_matching") {
      if (imageMode === "file" && !pendingFile) {
        toast.error("Select an image.");
        return;
      }
      if (imageMode === "url" && !imageUrl.trim()) {
        toast.error("Enter an image URL.");
        return;
      }

      // Validate pairs before any upload to avoid orphaned files
      const left: string[] = [];
      const right: string[] = [];
      for (const pair of matchPairs) {
        const l = pair.left.trim();
        const r = pair.right.trim();
        if (!l || !r) { toast.error("All 4 match pairs are required."); return; }
        left.push(l);
        right.push(r);
      }

      submitting = true;
      try {
        const finalImageUrl = await resolveImageUrl();
        payload = {
          questionType: "image_matching",
          ...(categoryId ? { categoryId } : {}),
          questionText: text,
          imageUrl: finalImageUrl,
          matchItems: { left, right },
          correctPairIndex,
          difficulty,
          ...extras,
        };
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Network error during image upload.");
        submitting = false;
        return;
      }
    } else if (questionType === "true_false") {
      submitting = true;
      try {
        const finalImageUrl = await resolveImageUrl();
        payload = {
          questionType: "true_false",
          ...(categoryId ? { categoryId } : {}),
          questionText: text,
          correctAnswer: trueFalseAnswer,
          ...(finalImageUrl ? { imageUrl: finalImageUrl } : {}),
          difficulty,
          ...extras,
        };
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Network error during image upload.");
        submitting = false;
        return;
      }
    } else {
      const filledAnswers = answers
        .map((a, i) => ({ text: a.text.trim(), isCorrect: i === correctAnswerIndex }))
        .filter((a) => a.text);
      if (filledAnswers.length < 2) { toast.error("Provide at least 2 answers."); return; }
      if (!filledAnswers.some((a) => a.isCorrect)) { toast.error("The answer marked correct can't be blank."); return; }

      submitting = true;
      try {
        const finalImageUrl = await resolveImageUrl();
        payload = {
          questionType: "standard",
          ...(categoryId ? { categoryId } : {}),
          questionText: text,
          answers: filledAnswers,
          ...(finalImageUrl ? { imageUrl: finalImageUrl } : {}),
          difficulty,
          ...extras,
        };
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Network error during image upload.");
        submitting = false;
        return;
      }
    }

    try {
      const res = await fetch(
        isEditing ? `/api/custom-questions/${editingId}` : "/api/custom-questions",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (res.ok) {
        if (isEditing) {
          toast.success("Question saved.");
          const prior = libraryQuestions.find((q) => q.id === editingId);
          const newCategory = localCategories.find((c) => c.id === categoryId);
          libraryQuestions = libraryQuestions.map((q) =>
            q.id === editingId
              ? { ...q, label: text, category: newCategory?.name ?? q.category }
              : q,
          );
          if (prior && newCategory && prior.category !== newCategory.name) {
            localCategories = localCategories.map((c) => {
              if (c.name === prior.category) return { ...c, count: Math.max(0, c.count - 1) };
              if (c.id === newCategory.id) return { ...c, count: c.count + 1 };
              return c;
            });
          }
          resetEditForm();
        } else {
          toast.success("Question added.");
          resetFields();
          localCategories = localCategories.map((c) =>
            c.id === categoryId ? { ...c, count: c.count + 1 } : c,
          );
        }
      } else {
        const data = await res.json() as { error?: string };
        toast.error(data.error ?? (isEditing ? "Failed to save question." : "Failed to add question."));
      }
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      submitting = false;
    }
  }

  // Writable derived: optimistic deletes/appended pages reassign locally;
  // resets to server truth when the prop refreshes.
  let libraryQuestions = $derived<OwnQuestion[]>(ownQuestions);
  let nextCursor = $derived<string | null>(questionsCursor);
  let loadingMore = $state(false);
  let pendingDeleteId = $state<string | null>(null);
  let deleting = $state(false);
  let historyId = $state<string | null>(null);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    loadingMore = true;
    try {
      const res = await fetch(
        `/api/custom-questions?cursor=${encodeURIComponent(nextCursor)}`,
      );
      if (!res.ok) {
        toast.error("Could not load more questions. Try again.");
        return;
      }
      const data = await res.json() as { entries: OwnQuestion[]; nextCursor: string | null };
      libraryQuestions = [...libraryQuestions, ...data.entries];
      nextCursor = data.nextCursor;
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      loadingMore = false;
    }
  }

  async function confirmDelete() {
    const id = pendingDeleteId;
    if (!id || deleting) return;
    deleting = true;
    try {
      const res = await fetch(`/api/custom-questions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        toast.error(d.error ?? "Delete failed.");
        return;
      }
      // Look up in the loaded list (not the first-page prop) so questions
      // appended via load more still decrement their category count.
      const deleted = libraryQuestions.find((q) => q.id === id);
      libraryQuestions = libraryQuestions.filter((q) => q.id !== id);
      localCategories = localCategories.map((c) =>
        deleted && c.name === deleted.category ? { ...c, count: Math.max(0, c.count - 1) } : c,
      );
      pendingDeleteId = null;
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      deleting = false;
    }
  }

  function questionLabel(q: OwnQuestion): string {
    return q.label || q.id;
  }

  /** Clears the question fields; category, type and difficulty are left so a
   *  curator adding several in a row keeps their choices. */
  function resetFields() {
    questionText = "";
    answers = [{ text: "" }, { text: "" }, { text: "" }, { text: "" }];
    correctAnswerIndex = 0;
    trueFalseAnswer = "true";
    sourceUrl = "";
    sourceLabel = "";
    postAnswerNote = "";
    sourceUrlError = "";
    postAnswerNoteError = "";
    imageUrl = "";
    pendingFile = null;
    if (imagePreviewUrl.startsWith("blob:")) URL.revokeObjectURL(imagePreviewUrl);
    imagePreviewUrl = "";
    imageStatus = null;
    matchPairs = [
      { left: "", right: "" },
      { left: "", right: "" },
      { left: "", right: "" },
      { left: "", right: "" },
    ];
    correctPairIndex = 0;
  }

  function resetEditForm() {
    resetFields();
    editingId = null;
    categoryId = "";
    questionType = "standard";
    difficulty = "easy";
    imageMode = "url";
    imageExpanded = false;
  }

  interface FetchedQuestion {
    id: string;
    category: string;
    difficulty: "easy" | "medium" | "hard";
    type: "text_choice" | "true_false" | "image_matching";
    question: { text: string; media?: { url: string } };
    correctAnswer: string;
    incorrectAnswers: string[];
    matchItems?: { left: string[]; right: string[] };
    /** Signed /media/ path for the stored image; the canonical URL never resolves on its own. */
    previewUrl?: string;
    source?: { url: string; label?: string };
    postAnswerNote?: string;
  }

  async function startEdit(q: OwnQuestion) {
    try {
      const res = await fetch(`/api/custom-questions/${q.id}`);
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(d.error ?? "Could not load question.");
        return;
      }
      const data = (await res.json()) as FetchedQuestion;

      editingId = data.id;
      categoryId = localCategories.find((c) => c.name === data.category)?.id ?? "";
      questionText = data.question.text;
      difficulty = data.difficulty;
      sourceUrl = data.source?.url ?? "";
      sourceLabel = data.source?.label ?? "";
      postAnswerNote = data.postAnswerNote ?? "";
      sourceUrlError = "";
      postAnswerNoteError = "";

      // Media loads the same way for every type: the edit form previews
      // through the signed /media/ route and submits the canonical URL back.
      imageMode = "url";
      imageUrl = data.question.media?.url ?? "";
      pendingFile = null;
      imagePreviewUrl = data.previewUrl ?? imageUrl;
      imageStatus = null;
      imageExpanded = data.type === "image_matching" || Boolean(imageUrl);

      if (data.type === "image_matching" && data.matchItems) {
        questionType = "image_matching";
        matchPairs = data.matchItems.left.map((left, i) => ({
          left,
          right: data.matchItems?.right[i] ?? "",
        }));
        const pairIndex = data.matchItems.left.findIndex(
          (left, i) => `${left}|${data.matchItems?.right[i]}` === data.correctAnswer,
        );
        correctPairIndex = pairIndex >= 0 ? pairIndex : 0;
      } else if (data.type === "true_false") {
        questionType = "true_false";
        trueFalseAnswer = data.correctAnswer === "true" ? "true" : "false";
      } else {
        questionType = "standard";
        const filled = [data.correctAnswer, ...data.incorrectAnswers];
        answers = [0, 1, 2, 3].map((i) => ({ text: filled[i] ?? "" }));
        correctAnswerIndex = 0;
      }

      formEl?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      toast.error("Network error. Try again.");
    }
  }
</script>

<div class="flex flex-col gap-6" bind:this={formEl}>
  {#if editingId}
    <h2 class="text-xl">Editing question</h2>
  {/if}

  <!-- Category -->
  <Card variant="ground" padding="md" class="gap-3">
    <h3 class="text-2xl font-semibold">Question and category</h3>
    <Select id="category-select" label="Category" name="category" bind:value={categoryId}>
      <option value="" disabled>Select a category</option>
      {#each localCategories as cat}
        <option value={cat.id}>{cat.icon ? `${cat.icon} ` : ""}{cat.name} ({cat.count} {cat.count === 1 ? "question" : "questions"})</option>
      {/each}
    </Select>

    {#if !editingId}
      {#if !showNewCategory}
        <Button variant="ghost" intent="compact" class="self-start" onclick={() => (showNewCategory = true)}>
          + New category
        </Button>
      {:else}
        <Card variant="mezzanine" class="gap-3">
          <div class="flex flex-wrap items-start gap-3">
            <div class="min-w-48 flex-1">
              <Input
                id="new-cat-name"
                label="Name"
                name="new-cat-name"
                maxlength={60}
                placeholder="e.g. Ancient Rome"
                bind:value={newCategoryName}
                error={newCategoryError}
              />
            </div>
            <div class="w-24">
              <Input id="new-cat-icon" label="Icon" name="new-cat-icon" maxlength={8} placeholder="🏛️" bind:value={newCategoryIcon} />
            </div>
            <div class="w-20">
              <Input id="new-cat-color" label="Colour" name="new-cat-color" type="color" bind:value={newCategoryColor} class="h-12 p-1" />
            </div>
          </div>
          <div class="flex items-center gap-2">
            <Button variant="secondary" intent="compact" onclick={addCategory} loading={addingCategory} disabled={addingCategory}>
              {addingCategory ? "Adding…" : "Add category"}
            </Button>
            <Button variant="outline" intent="compact" onclick={() => { showNewCategory = false; newCategoryError = ""; }}>
              Cancel
            </Button>
          </div>
        </Card>
      {/if}
    {/if}

    {#if editingId}
      <p class="text-xs text-foreground-darker">Type: {QUESTION_TYPE_LABEL[questionType]} (not editable)</p>
    {:else}
      <RadioGroup options={["standard", "true_false", "image_matching"] as const} bind:selected={questionType} name="questionType" legend="Question type">
        {#snippet optionLabel(type)}
          <span class="font-sans text-sm">{QUESTION_TYPE_LABEL[type]}</span>
        {/snippet}
      </RadioGroup>
    {/if}

    <Input
      id="question-text"
      label="Question"
      name="question"
      type="textarea"
      rows={3}
      maxlength={500}
      placeholder="What is the capital of France?"
      bind:value={questionText}
    />

    <RadioGroup options={["easy", "medium", "hard"] as const} bind:selected={difficulty} name="difficulty" legend="Difficulty">
      {#snippet optionLabel(d)}
        <span class="font-sans text-sm capitalize">{d}</span>
      {/snippet}
    </RadioGroup>
  </Card>

  <!-- Text choice answers -->
  {#if questionType === "standard"}
    <Card variant="ground" padding="md" class="gap-3">
      <h3 class="text-2xl font-semibold">Answers</h3>
      {#each answers as answer, i}
        <Input
          id="answer-{i}"
          label=""
          name="answer-{i}"
          aria-label="Answer {i + 1}"
          maxlength={200}
          placeholder="Answer {i + 1}"
          bind:value={answer.text}
        />
      {/each}
      <RadioGroup options={[0, 1, 2, 3]} bind:selected={correctAnswerIndex} name="correct-answer" legend="Correct answer">
        {#snippet optionLabel(i)}
          <span class="max-w-40 truncate font-sans text-sm">{answers[i]?.text.trim() || `Answer ${i + 1}`}</span>
        {/snippet}
      </RadioGroup>
    </Card>
  {/if}

  <!-- True/false -->
  {#if questionType === "true_false"}
    <Card variant="ground" padding="md" class="gap-3">
      <h3 class="text-2xl font-semibold">Answers</h3>
      <RadioGroup options={["true", "false"] as const} bind:selected={trueFalseAnswer} name="trueFalseAnswer" legend="Correct answer">
        {#snippet optionLabel(v)}
          <span class="font-sans text-sm capitalize">{v}</span>
        {/snippet}
      </RadioGroup>
    </Card>
  {/if}

  <!-- Image — optional for standard and true/false, required for image matching -->
  <Card variant="ground" padding="md" class="gap-4">
    <h3 class="text-2xl font-semibold">Image{questionType === "image_matching" ? "" : " (optional)"}</h3>

    {#if imageStatus}
      <p
        class={cn(
          "text-sm",
          imageStatus.type === "error" ? "text-danger" : imageStatus.type === "success" ? "text-success" : "text-foreground-darker",
        )}
        role="status"
      >
        {imageStatus.message}
      </p>
    {/if}

    {#if questionType !== "image_matching" && !imageExpanded}
      <Button variant="ghost" class="self-start" onclick={() => (imageExpanded = true)}>
        Add an image
      </Button>
    {:else}
      <RadioGroup options={["url", "file"] as const} bind:selected={imageMode} name="imageMode" legend="Image source">
        {#snippet optionLabel(mode)}
          <span class="font-sans text-sm">{mode === "url" ? "URL" : "Upload file"}</span>
        {/snippet}
      </RadioGroup>

      {#if imageMode === "url"}
        <Input
          id="image-url"
          label="Image URL"
          name="imageUrl"
          type="url"
          placeholder="https://example.com/image.jpg"
          bind:value={imageUrl}
          oninput={onImageUrlInput}
        />
      {:else}
        <FileInput
          id="image-file"
          label={pendingFile ? pendingFile.name : "Choose an image"}
          accept="image/*"
          onfiles={(files) => handleFile(files[0])}
        />
      {/if}

      {#if imagePreviewUrl}
        <div class="flex h-40 w-40 self-start overflow-hidden rounded-xl corner-shape-squircle border-2 border-secondary/20">
          <img
            src={imagePreviewUrl}
            alt="What players will see with this question"
            class="h-full w-full object-contain"
            onerror={() => (imageStatus = { message: "Image failed to load.", type: "error" })}
          />
        </div>
        <Button variant="outline" class="self-start min-h-11" onclick={removeImage}>
          Remove image
        </Button>
      {/if}
    {/if}
  </Card>

  <!-- Image matching -->
  {#if questionType === "image_matching"}
    <Card variant="ground" padding="md" class="gap-3">
      <h3 class="text-2xl font-semibold">Match pairs</h3>
      {#each matchPairs as pair, i}
        <div class="flex items-center gap-2">
          <Input
            id="pair-left-{i}"
            label=""
            name="pair-left-{i}"
            aria-label="Pair {i + 1}, left"
            maxlength={200}
            placeholder="Left {i + 1}"
            bind:value={pair.left}
          />
          <Icon name="chevron-right" class="shrink-0 text-foreground-darker" />
          <Input
            id="pair-right-{i}"
            label=""
            name="pair-right-{i}"
            aria-label="Pair {i + 1}, right"
            maxlength={200}
            placeholder="Right {i + 1}"
            bind:value={pair.right}
          />
        </div>
      {/each}
      <RadioGroup options={[0, 1, 2, 3]} bind:selected={correctPairIndex} name="correctPair" legend="Correct pair">
        {#snippet optionLabel(i)}
          <span class="max-w-40 truncate font-sans text-sm">
            {matchPairs[i]?.left.trim() ? `${matchPairs[i].left.trim()} → ${matchPairs[i].right.trim()}` : `Pair ${i + 1}`}
          </span>
        {/snippet}
      </RadioGroup>
    </Card>
  {/if}

  <!-- Source and post-answer note -->
  <Card variant="ground" padding="md" class="gap-3">
    <h3 class="text-2xl font-semibold">Source and note</h3>
    <Input
      id="source-url"
      label="Source URL"
      name="sourceUrl"
      type="url"
      placeholder="https://example.com/citation"
      bind:value={sourceUrl}
      error={sourceUrlError}
    />
    <Input
      id="source-label"
      label="Source label (optional)"
      name="sourceLabel"
      maxlength={200}
      placeholder="e.g. Encyclopaedia Britannica"
      bind:value={sourceLabel}
    />
    <Input
      id="post-answer-note"
      label="Post-answer note (optional)"
      name="postAnswerNote"
      type="textarea"
      rows={2}
      maxlength={160}
      placeholder="Shown to players when the answer is revealed"
      bind:value={postAnswerNote}
      error={postAnswerNoteError}
    />
  </Card>

  <div class="flex items-center gap-2">
    <Button variant="primary" class="self-start" onclick={submit} loading={submitting} disabled={submitting}>
      {#if submitting}
        {editingId ? "Saving…" : "Adding…"}
      {:else}
        {editingId ? "Save changes" : "Add question"}
      {/if}
    </Button>
    {#if editingId}
      <Button variant="outline" class="self-start" onclick={resetEditForm}>Cancel</Button>
    {/if}
  </div>
</div>

{#if libraryQuestions.length > 0}
  <section aria-label="Your question library" class="mt-8 flex flex-col gap-3">
    <h2 class="text-xl">Your questions ({libraryQuestions.length})</h2>

    <ul class="flex flex-col gap-2">
      {#each libraryQuestions as q (q.id)}
        <li>
          <Card padding="sm" class="flex-row items-start justify-between gap-3 px-4 py-3">
            <div class="flex min-w-0 flex-col gap-0.5">
              <span class="truncate text-sm">{questionLabel(q)}</span>
              <span class="text-xs text-foreground-darker">{q.category} · {q.created_at.slice(0, 10)}</span>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <Button
                variant="ghost"
                intent="compact"
                aria-label="Question history"
                onclick={() => (historyId = q.id)}
              >
                History
              </Button>
              <Button
                variant="secondary"
                intent="compact"
                aria-label="Edit question"
                onclick={() => startEdit(q)}
              >
                Edit
              </Button>
              <Button
                variant="danger"
                intent="compact"
                aria-label="Delete question"
                onclick={() => (pendingDeleteId = q.id)}
              >
                Delete
              </Button>
            </div>
          </Card>
        </li>
      {/each}
    </ul>

    {#if nextCursor}
      <Button
        variant="outline"
        intent="compact"
        class="self-start"
        loading={loadingMore}
        disabled={loadingMore}
        onclick={loadMore}
      >
        Load more
      </Button>
    {/if}
  </section>
{/if}

<ResponsiveOverlay
  id="delete-question-dialog"
  open={pendingDeleteId !== null}
  hasTitle={true}
  onClose={() => (pendingDeleteId = null)}
>
  {#snippet title()}Delete question{/snippet}
  <p class="text-sm text-foreground-darker">This removes the question from your library. It cannot be undone.</p>
  {#snippet footer()}
    <Button variant="outline" intent="compact" onclick={() => (pendingDeleteId = null)}>Cancel</Button>
    <Button variant="danger" intent="compact" onclick={confirmDelete} loading={deleting} disabled={deleting}>Delete</Button>
  {/snippet}
</ResponsiveOverlay>

{#if historyId}
  <QuestionHistoryModal questionId={historyId} open={true} onClose={() => (historyId = null)} />
{/if}
