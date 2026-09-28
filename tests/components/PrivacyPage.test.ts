import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { anchorFor, CONTACT, LEDGER } from "../../src/lib/legal/ledger.js";
import PrivacyPage from "../../src/routes/(app)/legal/privacy/+page.svelte";

describe("/legal/privacy renders the ledger (map #840, decision #12)", () => {
  it("renders every ledger row under its use-<id> anchor", () => {
    const { container } = render(PrivacyPage);
    for (const row of LEDGER) {
      const section = container.querySelector(`#${anchorFor(row.id)}`);
      expect(section, `missing anchor for ${row.id}`).not.toBeNull();
      expect(section?.textContent).toContain(row.element);
      expect(section?.textContent).toContain(row.sentence);
    }
  });

  it("states the named contact, the mailbox and the 15-day window", () => {
    const { getByText, container } = render(PrivacyPage);
    expect(container.textContent).toContain(CONTACT.name);
    expect(container.textContent).toContain(CONTACT.company);
    expect(getByText(CONTACT.email)).toHaveAttribute(
      "href",
      `mailto:${CONTACT.email}`,
    );
    expect(container.textContent).toContain("15 days");
  });

  it("names the Turso DPA gap, the processors, and the public dashboard link", () => {
    const { container, getByText } = render(PrivacyPage);
    expect(container.textContent).toMatch(/no data-processing agreement/i);
    for (const name of ["Turso", "Cloudflare", "Fly.io", "Resend", "GitHub"]) {
      expect(container.textContent).toContain(name);
    }
    expect(
      getByText("https://visitors.nhg.app/share/q2DHFPuApVOJjWhX"),
    ).toHaveAttribute(
      "href",
      "https://visitors.nhg.app/share/q2DHFPuApVOJjWhX",
    );
  });

  it("carries an effective date and a changelog", () => {
    const { container } = render(PrivacyPage);
    expect(container.textContent).toMatch(/Effective 20\d\d-\d\d-\d\d/);
    expect(container.querySelector("#changes")).not.toBeNull();
  });
});
