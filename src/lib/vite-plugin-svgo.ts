import { readFileSync } from "node:fs";
import { type Config, optimize, type PluginConfig } from "svgo";
import type { Plugin } from "vite";

export default function svgoPlugin(): Plugin {
  return {
    name: "vite-plugin-svgo",
    enforce: "pre",
    load(id) {
      const qIdx = id.indexOf("?");
      if (qIdx === -1) return null;
      const filePath = id.slice(0, qIdx);
      const query = id.slice(qIdx + 1);
      if (!filePath.endsWith(".svg") || query !== "raw") return null;

      let svg: string;
      try {
        svg = readFileSync(filePath, "utf-8");
      } catch {
        return null;
      }

      const config: Config = {
        plugins: [
          {
            name: "preset-default",
          } as PluginConfig,
          // Remove viewBox attribute — we don't want to allow scaling of SVGs, only CSS size-* classes
          "removeViewBox",
          // Strip hardcoded width/height — CSS size-* classes control dimensions
          "removeDimensions",
          // Strip fill/color from child elements so currentColor cascades from root
          {
            name: "strip-child-fills",
            fn: () => ({
              element: {
                enter(node: {
                  name: string;
                  attributes: Record<string, string>;
                }) {
                  if (node.name === "svg") return;
                  delete node.attributes.fill;
                  delete node.attributes.color;
                  if (node.attributes.style) {
                    const cleaned = node.attributes.style
                      .split(";")
                      .filter((decl) => {
                        const prop = decl.split(":")[0].trim();
                        return prop !== "fill" && prop !== "color";
                      })
                      .join(";")
                      .replace(/;+/g, ";")
                      .replace(/^;|;$/g, "");
                    if (cleaned) {
                      node.attributes.style = cleaned;
                    } else {
                      delete node.attributes.style;
                    }
                  }
                },
              },
            }),
          },
          // Add fill="currentColor" to root <svg> if no fill is set
          {
            name: "add-current-color",
            fn: () => ({
              element: {
                enter(node: {
                  name: string;
                  attributes: Record<string, string>;
                }) {
                  if (node.name === "svg" && !("fill" in node.attributes)) {
                    node.attributes.fill = "currentColor";
                  }
                },
              },
            }),
          },
        ],
      };

      const { data } = optimize(svg, config);

      return `export default ${JSON.stringify(data)};`;
    },
  };
}
