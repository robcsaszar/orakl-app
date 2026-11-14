import { Schema } from "effect";

/** Body of `PUT /api/admin/icons/drafts/:role`. */
export const IconDraftSchema = Schema.Struct({
  source: Schema.Literal("solar"),
  name: Schema.String.pipe(Schema.pattern(/^[a-z0-9-]{1,80}$/)),
});

/** Body of `PUT /api/admin/icons/drafts/:role/upload`. */
export const IconUploadSchema = Schema.Struct({ svg: Schema.String });

const strict = { parseOptions: { onExcessProperty: "error" as const } };
const Px = Schema.Int.pipe(Schema.between(8, 256));
const Stroke = Schema.Number.pipe(
  Schema.between(0.5, 4),
  Schema.multipleOf(0.25),
);
const Steps = <A, I>(step: Schema.Schema<A, I>) =>
  Schema.Struct({
    xs: step,
    sm: step,
    md: step,
    lg: step,
    xl: step,
  }).annotations(strict);
const SizeStep = Schema.Struct({ px: Px }).annotations(strict);
const ControlStep = Schema.Struct({ px: Px, stroke: Stroke }).annotations(
  strict,
);

/**
 * Body of `PUT /api/admin/icons/scale`: every tier and step, no more. Only
 * control steps carry a stroke.
 */
export const IconScaleSchema = Schema.Struct({
  control: Steps(ControlStep),
  emblem: Steps(SizeStep),
  art: Steps(SizeStep),
}).annotations(strict);
