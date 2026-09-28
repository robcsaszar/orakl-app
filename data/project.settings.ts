import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
} from "../src/lib/constants/index.js";
import type { IconSettings } from "../src/lib/types/settings.types.js";
/**
 * Settings for icon optimization.
 * @see https://github.com/svg/svgo#configuration for `svgoOptions` configuration.
 */
export const iconSettings: IconSettings = {
  iconDir: "src/assets/icons",
  svgoOptions: {
    plugins: [
      {
        name: "preset-default",
        params: {
          overrides: {
            removeViewBox: false,
          },
        },
      },
      {
        name: "removeAttrs",
        params: {
          attrs: ["class"],
        },
      },
      "removeDimensions",
      "removeTitle",
      "removeComments",
      "sortAttrs",
      "removeStyleElement",
      "removeScriptElement",
      "removeEmptyContainers",
      "convertColors",
      "convertPathData",
    ],
  },
};

/**
 * Metadata for project settings, such as title, description, and other relevant information.
 */
export const meta = {
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  keywords: ["quiz", "trivia", "knowledge", "fun", "challenge"],
  url: SITE_URL,
  supportEmail: "help@from.orakl.quest",
  colors: {
    primary: "oklch(84.746% 0.16058 83.298)",
    secondary: "oklch(0.643 0.141 281.67)",
  },
  legal: {
    vat: "",
    registration: "",
  },
};
