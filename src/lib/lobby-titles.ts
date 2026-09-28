type TitleEntry =
  | { kind: "prefix"; text: string }
  | { kind: "suffix"; text: string };

const TITLES: TitleEntry[] = [
  { kind: "suffix", text: ", the Unyielding" },
  { kind: "suffix", text: ", the Forsaken" },
  { kind: "suffix", text: ", the Eternal" },
  { kind: "suffix", text: ", the Wrathful" },
  { kind: "suffix", text: ", the Unbroken" },
  { kind: "suffix", text: ", the Harbinger" },
  { kind: "suffix", text: ", the Boundless" },
  { kind: "prefix", text: "Khan " },
  { kind: "prefix", text: "Oracle " },
  { kind: "prefix", text: "Warden " },
  { kind: "prefix", text: "Specter " },
  { kind: "prefix", text: "Titan " },
  { kind: "prefix", text: "Shade " },
  { kind: "prefix", text: "Relic " },
  { kind: "prefix", text: "Augur " },
  { kind: "prefix", text: "Cipher " },
  { kind: "prefix", text: "Zealot " },
  { kind: "prefix", text: "Archon " },
  { kind: "prefix", text: "Revenant " },
  { kind: "prefix", text: "Vex " },
  { kind: "prefix", text: "Enigma " },
  { kind: "suffix", text: ", the Silent" },
  { kind: "suffix", text: ", the Cunning" },
  { kind: "suffix", text: ", the Vengeful" },
  { kind: "suffix", text: ", the Merciless" },
  { kind: "suffix", text: ", the Deceiver" },
  { kind: "prefix", text: "Blessed with forbidden insight," },
  { kind: "prefix", text: "Whispering ancient secrets," },
  { kind: "prefix", text: "Holding the oracle's key," },
  { kind: "prefix", text: "Schooled by the fates," },
  { kind: "prefix", text: "Guided by starlight," },
  { kind: "prefix", text: "Tested in the labyrinth," },
  { kind: "prefix", text: "Challenged by the gods," },
  { kind: "prefix", text: "Escaped from the underworld," },
  { kind: "prefix", text: "Fed on forgotten lore," },
  { kind: "prefix", text: "Cursed to know all," },
  { kind: "prefix", text: "Grand archivist of myths," },
  { kind: "prefix", text: "First herald of dawn," },
  { kind: "prefix", text: "Keeper of the final crossroads," },
  { kind: "prefix", text: "Chosen voice of the heavens," },
  { kind: "prefix", text: "High priest of lost stars," },
  { kind: "suffix", text: ", who answered the riddle" },
  { kind: "suffix", text: ", who outsmarted a god" },
  { kind: "suffix", text: ", whose mind spans aeons" },
  { kind: "suffix", text: ", who stole the fire" },
  { kind: "suffix", text: ", who remembers the beginning" },
  { kind: "suffix", text: ", unbothered by the sirens" },
  { kind: "suffix", text: ", deaf to mortal lies" },
  { kind: "suffix", text: ", forged in the crucible" },
  { kind: "suffix", text: ", holding the eternal flame" },
  { kind: "suffix", text: ", blinded by divine truth" },
  { kind: "suffix", text: ", architect of the labyrinth" },
  { kind: "suffix", text: ", speaker for the dead" },
  { kind: "suffix", text: ", standard-bearer of the sun" },
  { kind: "suffix", text: ", guardian of the threshold" },
  { kind: "suffix", text: ", bane of the immortal" },
];

export function getLobbyTitle(nickname: string): {
  prefix: string;
  suffix: string;
} {
  let hash = 0;
  for (let i = 0; i < nickname.length; i++) {
    hash = ((hash << 5) - hash + nickname.charCodeAt(i)) >>> 0;
  }
  const entry = TITLES[hash % TITLES.length];
  return entry.kind === "prefix"
    ? { prefix: entry.text, suffix: "" }
    : { prefix: "", suffix: entry.text };
}
