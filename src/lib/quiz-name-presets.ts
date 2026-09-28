type PresetType = "quirky" | "nerdy" | "funny" | "pop-culture" | "mythological";

const QUIZ_PRESETS: Record<
  PresetType,
  { titles: string[]; descriptions: string[] }
> = {
  quirky: {
    titles: [
      "The Audacity of Nope",
      "The Superiority Complex",
      "Educated Guesses Only",
      "Bold Claims & Zero Sources",
      "I Read That Somewhere",
      "Trust Issues: The Game",
      "The Humble Brag Championship",
      "Question Everything (Except These Answers)",
      "The Mansplaining Prevention Quiz",
      "Plausible Deniability Hour",
      "Suspicious Confidence",
      "Absolutely Unverified",
      "Opinions Disguised as Facts",
      "The Unsolicited Expertise Hour",
    ],
    descriptions: [
      "Enter with unearned confidence, leave with a newfound appreciation for how much you actually don't know.",
      "Zero facts, 100% vibes, and the audacity to argue with the host about the phrasing of question four.",
      "A consequence-free zone for people who peaked at being insufferable at dinner parties.",
      "Where gut feelings go to be publicly humiliated by actual facts.",
      "No sources, no citations, no mercy — just raw conviction and questionable recall.",
      "The only arena where being confidently wrong is considered a personality trait.",
      "Bring your strongest opinions and your weakest evidence.",
      "For people who treat uncertainty as a personal insult.",
    ],
  },
  nerdy: {
    titles: [
      "Wikipedia Warriors",
      "The Sassy Encyclopedia",
      "Weaponized Knowledge",
      "The Dunning-Kruger Experience",
      "The Intellectual Thunderdome",
      "The Pedantic Games",
      "The Insufferable Genius Hour",
      "Ctrl+Alt+Defeat",
      "Stack Overflow: The Quiz",
      "Peer Review Required",
      "Technically Correct",
      "The Footnote Appreciation Society",
      "Citation Needed",
      "Correlation vs. Causation",
    ],
    descriptions: [
      "Where being a \"know-it-all\" isn't a character flaw; it's a competitive advantage.",
      "The ultimate test for people whose only hobby is falling down 3 AM Wikipedia rabbit holes.",
      "A controlled experiment in which the hypothesis is that you know things. Results may vary.",
      "For minds that retain obscure facts the way normal people retain song lyrics.",
      "Where pedantry is finally rewarded instead of earning you awkward silences.",
      "The only peer-reviewed quiz experience this side of academia.",
      "Finally, a venue where knowing the Latin name for things is a flex, not a red flag.",
      "Built for people who correct typos in other people's texts unprompted.",
    ],
  },
  funny: {
    titles: [
      "Quiz in My Pants",
      "Quizzly Bears Attack",
      "No Google Here",
      "Confident But Wrong",
      "I Peaked in Pub Quiz",
      "Brains, Booze & Bad Decisions",
      "The Smart-Ass Olympics",
      "My Therapist Recommended This",
      "Anxiety: The Quiz Edition",
      "The Overthinking Olympics",
      "I Swear I Knew This Yesterday",
      "Trust Me, I'm Very Smart",
      "Know-It-All Showdown",
      "The Existential Quiz Crisis",
    ],
    descriptions: [
      "A high-stakes battle of wits where the only prize is temporary bragging rights and a bruised ego.",
      "Think of it as an intellectual Thunderdome, but with more snacks and significantly less fitness.",
      "A safe space for people who treat bar trivia like a blood sport and friendships like collateral damage.",
      "Come for the questions, stay for the slow unraveling of someone's self-esteem.",
      "Where forgetting the answer you definitely knew triggers a minor existential spiral.",
      "Proof that your brain stores jingles from 2003 but not your own phone number.",
      "A group activity that somehow makes everyone worse at being friends.",
      "Therapeutic in the same way that screaming into a pillow is therapeutic.",
    ],
  },
  "pop-culture": {
    titles: [
      "Smarty Pants & the Chamber of Secrets",
      "Trivia Newton John",
      "The Sassy Inquisition",
      "The Answer Is Always Meryl Streep",
      "Um, Actually... The Quiz",
      "Trivia Pursuit: Tokyo Drift",
      "Fact or Cap?",
      "The Multiverse of Wrongness",
      "No Spoilers, Just Questions",
      "Main Character Energy: The Quiz",
      "Choose Your Fighter (It's Trivia)",
      "Plot Twist: You Don't Know",
      "The Lore Drops",
      "Press X to Answer",
    ],
    descriptions: [
      'Specifically designed for the person who physically cannot stop themselves from saying, "Um, actually..."',
      "It's not enough to be right, you have to make sure everyone else feels wrong.",
      "Finally, a use for all that storage space in your brain currently occupied by 90s commercial jingles.",
      "For people whose IMDb history is more detailed than their actual resume.",
      "Test whether your screen time was an education or just a coping mechanism.",
      "Where knowing the name of every side character finally pays off.",
      "A quiz for people who say 'I've seen that' about literally everything.",
      "All those hours of binge-watching were research. This is the exam.",
    ],
  },
  mythological: {
    titles: [
      "The Oracle Speaks",
      "Riddles of the Sphinx",
      "The Forbidden Archive",
      "Trial of the Augur",
      "The Labyrinth Awaits",
      "Whispers from the Vault",
      "The Rune Trials",
      "Rites of the Elder Quiz",
      "The Keeper's Inquisition",
      "Chronicle of the Forgotten",
      "The Sigil Chamber",
      "Echoes of the Ancients",
      "The Threshold of Knowing",
      "Prophecy & Reckoning",
    ],
    descriptions: [
      "Step into the sanctum where knowledge is weighed and the unworthy are gently humbled.",
      "Ancient questions, mortal answers — the fates are watching and they are not impressed.",
      "A trial older than memory, dressed up with a leaderboard and a countdown timer.",
      "The oracle has seen your score. The oracle is not optimistic.",
      "Somewhere between sacred rite and pub quiz, the augur awaits your offering of guesses.",
      "Sealed questions from a forgotten age, now unsealed for your mild inconvenience.",
      "The labyrinth tests the worthy. The timer tests the rest.",
      "Enter the vault, answer the riddles, try not to anger anything eternal.",
    ],
  },
};

export function generateRandomPreset(): { title: string; description: string } {
  const types = Object.keys(QUIZ_PRESETS) as PresetType[];
  const type = types[Math.floor(Math.random() * types.length)];
  const bucket = QUIZ_PRESETS[type];
  return {
    title: bucket.titles[Math.floor(Math.random() * bucket.titles.length)],
    description:
      bucket.descriptions[
        Math.floor(Math.random() * bucket.descriptions.length)
      ],
  };
}
