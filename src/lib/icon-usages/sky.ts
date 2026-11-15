import type { IconUsageMeta } from "./types";

/** Usages in the sky editor: sky, cloud, bird and star controls. */
export const SKY_USAGES = {
  "sky.bird-add-kind": {
    where: "Bird controls, add a kind of flock",
    roles: ["add"],
  },
  "sky.bird-bar": {
    where: "Bird controls, top bar tools",
    roles: ["undo", "redo", "tag", "locked"],
  },
  "sky.bird-fold": {
    where: "Bird controls, section fold",
    roles: ["expand", "collapse"],
  },
  "sky.bird-kind-remove": {
    where: "Bird controls, remove a kind of flock",
    roles: ["delete"],
  },
  "sky.cloud-bar": {
    where: "Cloud controls, top bar tools",
    roles: ["undo", "redo", "grab", "tag", "locked"],
  },
  "sky.cloud-fold": {
    where: "Cloud controls, section fold",
    roles: ["expand", "collapse"],
  },
  "sky.cloud-name-roll": {
    where: "Cloud controls, roll a name button",
    roles: ["roll"],
  },
  "sky.cloud-remove": {
    where: "Cloud controls, remove cloud button",
    roles: ["delete"],
  },
  "sky.cloud-remove-confirm": {
    where: "Cloud controls, remove cloud confirm",
    roles: ["confirm"],
  },
  "sky.cloud-roll-again": {
    where: "Cloud controls, roll again button",
    roles: ["roll"],
  },
  "sky.cloud-template-drop": {
    where: "Cloud controls, reset or remove template button",
    roles: ["reset", "delete"],
  },
  "sky.cloud-template-drop-confirm": {
    where: "Cloud controls, reset or remove template confirm",
    roles: ["confirm"],
  },
  "sky.cloud-template-save-over": {
    where: "Cloud controls, save over template button",
    roles: ["confirm"],
  },
  "sky.cloud-template-save-over-confirm": {
    where: "Cloud controls, save over template confirm",
    roles: ["confirm"],
  },
  "sky.cloud-undo-all": {
    where: "Cloud controls, undo all changes button",
    roles: ["undo"],
  },
  "sky.cloud-undo-all-confirm": {
    where: "Cloud controls, undo all changes confirm",
    roles: ["confirm"],
  },
  "sky.colour-add": {
    where: "Colour controls, add a time of day",
    roles: ["add"],
  },
  "sky.colour-arrange": {
    where: "Colour controls, arrange picked things",
    roles: [
      "align-middle",
      "align-center",
      "distribute-vertical",
      "distribute-horizontal",
    ],
  },
  "sky.colour-bar": {
    where: "Colour controls, top bar tools",
    roles: ["undo", "redo"],
  },
  "sky.colour-item-roll": {
    where: "Colour controls, roll picked clouds again",
    roles: ["roll"],
  },
  "sky.colour-layers": {
    where: "Colour controls, layer list tools",
    roles: ["collapse", "expand", "delete"],
  },
  "sky.colour-remove": {
    where: "Colour controls, remove time of day button",
    roles: ["delete"],
  },
  "sky.colour-remove-confirm": {
    where: "Colour controls, remove time of day confirm",
    roles: ["confirm"],
  },
  "sky.colour-stop-reset": {
    where: "Colour controls, reset a stop",
    roles: ["reset"],
  },
  "sky.history-forget": {
    where: "Sky history, forget button",
    roles: ["delete"],
  },
  "sky.history-forget-confirm": {
    where: "Sky history, forget confirm",
    roles: ["confirm"],
  },
  "sky.json-fold": {
    where: "Sky save, saved settings tree fold",
    roles: ["expand", "next"],
  },
  "sky.paint-compare": {
    where: "Cloud paint, compare with the bare cloud",
    roles: ["layers"],
  },
  "sky.paint-history": {
    where: "Cloud paint, undo and redo",
    roles: ["undo", "redo"],
  },
  "sky.paint-mode": {
    where: "Cloud paint, what the brush does",
    roles: ["wand", "add", "erase"],
  },
  "sky.paint-reset-canvas": {
    where: "Cloud paint, reset canvas button",
    roles: ["delete"],
  },
  "sky.paint-reset-canvas-confirm": {
    where: "Cloud paint, reset canvas confirm",
    roles: ["confirm"],
  },
  "sky.paint-shape": {
    where: "Cloud paint, how the brush draws",
    roles: ["brush", "line", "fill"],
  },
  "sky.panel-bar": {
    where: "Sky panel, top bar tools",
    roles: ["revisions", "upload", "dismiss"],
  },
  "sky.reset-all": {
    where: "Sky panel, reset all button",
    roles: ["reset"],
  },
  "sky.reset-all-confirm": {
    where: "Sky panel, reset all confirm",
    roles: ["confirm"],
  },
  "sky.save-reset": {
    where: "Sky save, start over button",
    roles: ["delete"],
  },
  "sky.save-reset-confirm": {
    where: "Sky save, start over confirm",
    roles: ["confirm"],
  },
  "sky.setting-reset": {
    where: "Sky settings, reset one setting",
    roles: ["reset"],
  },
  "sky.star-bar": {
    where: "Star controls, top bar tools",
    roles: ["undo", "redo", "locked"],
  },
  "sky.star-fold": {
    where: "Star controls, section fold",
    roles: ["expand", "collapse"],
  },
} as const satisfies Record<`sky.${string}`, IconUsageMeta>;
