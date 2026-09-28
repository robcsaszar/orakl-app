import { describe, expect, it } from "vitest";
import { renderNoteHtml } from "../src/lib/note-format.js";

const ALLOWED_TAGS = new Set(["<strong>", "</strong>", "<em>", "</em>"]);

/** Every literal tag-shaped substring in the output must be one of the four
 *  emphasis tags the parser is allowed to emit — anything else (including an
 *  anchor) would mean escaping missed a `<`. */
function assertOnlyAllowedTags(output: string) {
  const tags = output.match(/<[^>]*>/g) ?? [];
  for (const tag of tags) {
    expect(ALLOWED_TAGS.has(tag)).toBe(true);
  }
}

const CASES: Array<[string, string, string]> = [
  // [label, input, expected output]
  ["empty string", "", ""],
  ["whitespace only", "   ", "   "],
  ["plain text", "no markup here", "no markup here"],
  ["bold with asterisks", "**bold**", "<strong>bold</strong>"],
  ["bold with underscores", "__bold__", "<strong>bold</strong>"],
  ["italic with asterisks", "*italic*", "<em>italic</em>"],
  ["italic with underscores", "_italic_", "<em>italic</em>"],
  [
    "mixed bold and italic",
    "**bold** and *italic*",
    "<strong>bold</strong> and <em>italic</em>",
  ],
  [
    "nested italic inside bold (star)",
    "**bold with *italic* inside**",
    "<strong>bold with <em>italic</em> inside</strong>",
  ],
  [
    "nested italic inside bold (underscore)",
    "__bold with _italic_ inside__",
    "<strong>bold with <em>italic</em> inside</strong>",
  ],
  ["unmatched single asterisk", "a * b", "a * b"],
  ["unclosed bold", "**unclosed", "**unclosed"],
  ["unclosed italic", "*unclosed", "*unclosed"],
  ["unmatched underscore", "a _ b", "a _ b"],
  [
    "raw script tag",
    "<script>alert(1)</script>",
    "&lt;script&gt;alert(1)&lt;/script&gt;",
  ],
  [
    "raw img with onerror",
    "<img src=x onerror=1>",
    "&lt;img src=x onerror=1&gt;",
  ],
  ["raw bold tag", "<b>x</b>", "&lt;b&gt;x&lt;/b&gt;"],
  [
    "markdown link syntax",
    "[text](https://evil.com)",
    "[text](https://evil.com)",
  ],
  ["bare https url", "https://evil.com", "https://evil.com"],
  ["bare www url", "www.evil.com", "www.evil.com"],
  ["html entity lt", "&lt;", "&amp;lt;"],
  ["html entity amp", "&amp;", "&amp;amp;"],
  ["ampersand literal", "a & b", "a &amp; b"],
  ["quotes escaped", `say "hi"`, "say &quot;hi&quot;"],
  ["apostrophe escaped", "it's fine", "it&#39;s fine"],
  [
    "emphasis around escaped html",
    "**<script>**",
    "<strong>&lt;script&gt;</strong>",
  ],
  [
    "asterisk-fenced markdown link",
    "*[text](https://evil.com)*",
    "<em>[text](https://evil.com)</em>",
  ],
  ["double asterisk with no content", "****", "<em>*</em>*"],
  ["single trailing asterisk", "note*", "note*"],
  ["several unmatched delimiters", "* _ ** __ text", "* _ ** __ text"],
  [
    "arithmetic keeps its asterisks",
    "2 * 2 = 4 and 3 * 3 = 9",
    "2 * 2 = 4 and 3 * 3 = 9",
  ],
  [
    "an identifier keeps its underscores",
    "the snake_case_name field",
    "the snake_case_name field",
  ],
  ["a footnote asterisk stays literal", "Rome * see note", "Rome * see note"],
  [
    "emphasis still works mid-sentence",
    "it is *truly* old",
    "it is <em>truly</em> old",
  ],
];

describe("renderNoteHtml", () => {
  for (const [label, input, expected] of CASES) {
    it(`${label}`, () => {
      expect(renderNoteHtml(input)).toBe(expected);
    });
  }

  it("never emits a live anchor, href attribute, javascript: scheme, or onerror handler for any case above", () => {
    for (const [, input] of CASES) {
      assertOnlyAllowedTags(renderNoteHtml(input));
    }
  });

  it("only ever emits strong, em, and escaped text (no other tags) for adversarial input", () => {
    const adversarial = [
      '<a href="javascript:alert(1)">click</a>',
      '**<a href="x">y</a>**',
      "*<img onerror=alert(1)>*",
    ];
    for (const input of adversarial) {
      assertOnlyAllowedTags(renderNoteHtml(input));
    }
  });
});
