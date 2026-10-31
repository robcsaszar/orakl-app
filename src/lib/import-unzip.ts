import { unzipSync } from "fflate";

const MAX_ENTRIES = 500;
const MAX_TOTAL_BYTES = 60 * 1024 * 1024;

/**
 * Unzips an import pack in the browser into path → bytes. The entry count and
 * total inflated size are checked from the archive headers before any entry
 * inflates, so a zip bomb is refused rather than expanded.
 */
export function unzipPack(buffer: ArrayBuffer): Map<string, Uint8Array> {
  let count = 0;
  let total = 0;
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(new Uint8Array(buffer), {
      filter(file) {
        if (file.name.endsWith("/")) return false;
        count += 1;
        total += file.originalSize;
        if (count > MAX_ENTRIES) throw new Error("more than 500 files");
        if (total > MAX_TOTAL_BYTES) throw new Error("larger than 60 MB");
        return true;
      },
    });
  } catch (err) {
    const message = (err as Error).message;
    if (message === "more than 500 files" || message === "larger than 60 MB") {
      throw new Error(`The zip is ${message} once unpacked`);
    }
    throw new Error("The file is not a readable zip");
  }
  return new Map(Object.entries(files));
}
