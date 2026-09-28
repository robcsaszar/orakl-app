// Solo-lobby opponents shown when a player waits alone (SoloOpponentCard.svelte).
// Each entry pairs a src/assets/icons/npcs/*.svg with flavor text nodding to
// the myth (or, for the whimsy entries, to nothing in particular). Markup
// (<strong>, <span class="text-foreground">) is rendered raw by the card,
// used sparingly, not on every entry.

export interface Npc {
  id: string;
  title: string;
  badge: string;
  /** 1-3 paragraphs, rendered as-is (may contain <strong>/<span> markup). */
  description: string[];
}

export const NPCS: Npc[] = [
  {
    id: "zeus",
    title: "Zeus",
    badge: "Throne of Olympus",
    description: [
      "The lobby empties and the sky takes the seat instead. Zeus split the cosmos with his brothers by a coin toss and kept the better half; a quiz is a small thing to a king who once unseated his own father.",
      "He won't gloat over a win, and he won't remember a loss. <strong>Everything here is beneath him, including you.</strong> That's not an insult. It's just how a throne this old sees the room.",
    ],
  },
  {
    id: "hera",
    title: "Hera",
    badge: "Keeper of Vows",
    description: [
      "She spent an age hunting down every rival, every stray demigod, every proof of her husband's wandering eye. Patience was never a virtue to Hera. It was a weapon she sharpened for centuries.",
      'She is watching your answers for the smallest slight, not the score. Give her nothing to hold against you, and she might let you leave with your <span class="text-foreground">dignity</span> intact.',
    ],
  },
  {
    id: "poseidon",
    title: "Poseidon",
    badge: "Lord of the Deep",
    description: [
      "Calm water means nothing to a god who can turn it into a wall in one stroke of the trident, the way he did to sailors who forgot to flatter him. Poseidon drew the sea as his portion of the world and has never once let anyone forget it.",
      "Answer fast and sure, the way a ship reads a tide correctly. Hesitate, and he takes it as a personal offense.",
    ],
  },
  {
    id: "athena",
    title: "Athena",
    badge: "Weaver of Strategy",
    description: [
      "She arrived fully armored, born from her father's skull mid-thought, and has never once been caught unprepared. She beat Poseidon for the naming of a city with a single olive tree, then gave Arachne a permanent lesson in humility for good measure.",
      "This is a contest of wits before it's a contest of scores. <strong>Bring your best or don't bother showing up.</strong>",
    ],
  },
  {
    id: "apollo",
    title: "Apollo",
    badge: "Voice of the Oracle",
    description: [
      "Fitting, maybe, that the god who once spoke through the oracle at Delphi is the one asking questions here. He doesn't guess. He already knows, and has for as long as anyone has been asking.",
      "Answer with conviction. The god of prophecy has no patience for a mortal who hedges.",
    ],
  },
  {
    id: "artemis",
    title: "Artemis",
    badge: "Unerring Huntress",
    description: [
      "No arrow of hers has ever missed. She kept her freedom from every god who came asking for her hand, and she keeps her composure exactly the same way, one clean shot at a time.",
      "Miss a question and she won't gloat about it. She'll just move to the next one, the way she always has.",
    ],
  },
  {
    id: "ares",
    title: "Ares",
    badge: "Herald of the Clash",
    description: [
      "He doesn't care what the questions are about. He cares that it's a contest and that someone is standing across from him to lose it. War rarely needed a good reason, and neither does he.",
    ],
  },
  {
    id: "aphrodite",
    title: "Aphrodite",
    badge: "Unrivaled Desire",
    description: [
      "She rose from the sea already certain of her own worth, and a golden apple once settled an argument among three goddesses squarely in her favor. Aphrodite plays this for charm as much as for score.",
      "She'll compliment your answers whether they're right or wrong, and it isn't kindness. <strong>She still expects to be named the winner.</strong>",
    ],
  },
  {
    id: "hermes",
    title: "Hermes",
    badge: "Swift Messenger",
    description: [
      "By noon on the day he was born, Hermes had already invented the lyre and stolen Apollo's cattle. He answers before you've finished reading the question, and more often than not he's right.",
      "Speed is the whole game to him. Match his pace or watch the round close before you've caught your breath.",
    ],
  },
  {
    id: "hephaestus",
    title: "Hephaestus",
    badge: "Forgemaster",
    description: [
      "Thrown from Olympus once and never quite welcomed all the way back, he built his own throne, his own automatons, and his own reasons not to be underestimated. He plays quietly, like a craftsman fitting one last piece before he'll call the work done.",
      "He won't rush you. Every answer he gives has already been tested twice, in the fire, before you ever see it.",
    ],
  },
  {
    id: "demeter",
    title: "Demeter",
    badge: "Warden of the Harvest",
    description: [
      "She once let the entire world go barren rather than accept her daughter's absence for even one season. A quiz doesn't rattle a will like that.",
      "She'll sit out a slow start without a word of complaint. But there's a season for patience and a season for the harvest, and when the second one comes due, <span class=\"text-foreground\">she collects</span>.",
    ],
  },
  {
    id: "dionysus",
    title: "Dionysus",
    badge: "Lord of Revelry",
    description: [
      "He turned water to wine and a room of strangers into a festival before anyone noticed the shift happening around them. To him this lobby is less a trial and more an excuse for a good night.",
      "He'll laugh off a wrong answer before you've even winced at it. A relaxed god is not the same thing as a beatable one.",
    ],
  },
  {
    id: "hades",
    title: "Hades",
    badge: "Sovereign of the Underworld",
    description: [
      "He drew the shortest straw of the three brothers and built an empire out of it anyway. Nothing in his vault is going anywhere, and neither is he, so he can afford to be patient in a way the others can't.",
      "No theatrics, no rush. He'll simply outlast you, one quiet correct answer at a time.",
    ],
  },
  {
    id: "persephone",
    title: "Persephone",
    badge: "Queen of Two Seasons",
    description: [
      "Half the year a captive, half the year a queen come home, and she learned long ago how to make the most of whatever half she's given. Whatever hand this round deals her, she plays it in full.",
      "Gentler than her husband. Not one bit less sharp.",
    ],
  },
  {
    id: "eros",
    title: "Eros",
    badge: "True Aim",
    description: [
      "Every arrow he has ever loosed has landed exactly where he meant it to land, whether the target wanted it there or not. He treats a question the same way: draw, aim, release, nothing wasted.",
      "The stakes were never really his to begin with, so he plays loose about them. He just likes watching where the shot lands.",
    ],
  },
  {
    id: "pan",
    title: "Pan",
    badge: "Wild Piper",
    description: [
      "His laugh in the underbrush was once enough to send whole armies fleeing in terror, and the word panic still carries his name for it. A quiz, to him, is just another quiet grove worth disturbing.",
      "The questions may wander a little, goat-legged and unhurried. That doesn't mean he's easy to beat. He rarely loses a game he actually chose to play.",
    ],
  },
  {
    id: "cronus",
    title: "Cronus",
    badge: "Devouring Titan",
    description: [
      "He swallowed his own children rather than risk being unseated by one of them, and it bought him nearly an age of unchallenged rule. He takes a contest just as seriously: a threat, ended before it has room to grow.",
      "Give him no opening. He plays to close things out fast, and he has never needed a second chance to do it.",
    ],
  },
  {
    id: "atlas",
    title: "Atlas",
    badge: "Bearer of the Sky",
    description: [
      "He has held the weight of the heavens on his shoulders since the Titans lost their war, so one more contest barely registers against that. He answers steadily and without complaint, the way he's done everything else for longer than anyone can measure.",
    ],
  },
  {
    id: "prometheus",
    title: "Prometheus",
    badge: "Fire-Bringer",
    description: [
      "He stole fire from the gods and handed it to mortals anyway, knowing exactly what it would cost him. Zeus chained him to a rock and sent an eagle to eat his liver every day; it grows back overnight, and the eagle returns each morning regardless.",
      "He gave humanity forbidden knowledge once and clearly has no regrets about doing it again here. Ask him anything. He's had a very long time to think about the answer.",
    ],
  },
  {
    id: "helios",
    title: "Helios",
    badge: "All-Seeing Sun",
    description: [
      "He drives the sun across the sky each day and sees nearly everything that happens beneath it, a slipped answer included. Old, thorough, and rarely surprised by anything a mortal tries.",
      "He plays every round in plain view, nothing hidden on his side of the table. Bring your best; he's already seen what everyone before you has tried.",
    ],
  },
  {
    id: "sol",
    title: "Sol",
    badge: "Radiant Vigil",
    description: [
      "Where Helios is the elder light, Sol is the vigil that never wavers, Rome's answer to a sun that has to rise again tomorrow no matter what. A quiz is just another lap of a duty he's never once skipped.",
    ],
  },
  {
    id: "luna",
    title: "Luna",
    badge: "Silver Watcher",
    description: [
      "She crosses the night sky the way her brother crosses the day, quieter about it but no less constant. Long silences between answers suit her fine. The moon has never been in a hurry.",
      "Don't read the calm as weakness. She's been waxing and waning, unbeaten, since before anyone thought to keep score.",
    ],
  },
  {
    id: "hercules",
    title: "Hercules",
    badge: "Twelve Trials",
    description: [
      "He wrestled a lion barehanded, stole a girdle from an Amazon queen, and mucked out an entire stable in a single afternoon. A quiz is, frankly, one of the easier labors he's ever been handed.",
      "He may not be the cleverest opponent you face tonight, but he will not stop trying. Outlast him and the trial is yours.",
    ],
  },
  {
    id: "perseus",
    title: "Perseus",
    badge: "Slayer of Medusa",
    description: [
      "He beheaded a gorgon by watching her only through the reflection in his shield, since looking straight at her would have killed him. He brings that same sideways thinking here: solve the problem at an angle, not head-on.",
    ],
  },
  {
    id: "medusa",
    title: "Medusa",
    badge: "Gaze Undying",
    description: [
      "Cursed for a wrong that was never hers to answer for, she turned every accuser to stone before they could level a second one. She plays without much warmth, and given the story, it's hard to blame her.",
      "Meet her gaze anyway. A screen keeps you safe from the one thing about her that isn't.",
    ],
  },
  {
    id: "minotaur",
    title: "Minotaur",
    badge: "Labyrinth's Keeper",
    description: [
      "Locked at the center of a maze built specifically to hold him, he's had generations with nothing to do but wait for someone to find their way in. Every question here is just another turn in that same labyrinth.",
      "There's no thread to lead you back out of this one, so answer carefully.",
    ],
  },
  {
    id: "hydra",
    title: "Hydra",
    badge: "Ever-Regrowing",
    description: [
      "Sever one of its heads and two grow back; Hercules only ever beat it by cauterizing each wound the instant he made it. A wrong answer here seems to make it stronger, not weaker.",
      "There is no single blow that ends this fight. Be thorough, not just strong.",
    ],
  },
  {
    id: "chimera",
    title: "Chimera",
    badge: "Three-Formed Terror",
    description: [
      "Lion, goat, and serpent fused into one animal, considered unbeatable until Bellerophon took to the sky on Pegasus to strike from above. On solid ground, it still doesn't lose often.",
      "It comes at every question from three directions at once. Pick one angle and hold it, or you'll be answering for all three heads instead of one.",
    ],
  },
  {
    id: "cyclops",
    title: "Cyclops",
    badge: "One-Eyed Smith",
    description: [
      "The Cyclopes forged Zeus's own thunderbolts in the dark of a volcano, and one of their kind, Polyphemus, very nearly made a meal of Odysseus's whole crew. One eye sees less than two, but this one misses less than you'd expect.",
      "He's slow to anger and slower to forget. Outthink him the way Odysseus did. Speed alone won't do it.",
    ],
  },
  {
    id: "cerberus",
    title: "Cerberus",
    badge: "Threefold Guardian",
    description: [
      "Three heads, three sets of eyes, and nothing has ever gotten past the gate to the underworld that he didn't want getting past. Hercules only managed it with a honey cake and brute force combined.",
      "There's no single moment his attention slips. Satisfy all three heads here, not just whichever one is loudest.",
    ],
  },
  {
    id: "centaur",
    title: "Centaur",
    badge: "Half-Wild Sage",
    description: [
      "Most centaurs were creatures of appetite and little else, but Chiron taught heroes, physicians, and kings before an old wound outlasted even his own cures. This one plays with more patience than his kin ever managed.",
      "Expect a teacher's questions, not a wild charge. He wants to know what you've learned more than he wants to beat you.",
    ],
  },
  {
    id: "sphinx",
    title: "Sphinx",
    badge: "Riddler of Thebes",
    description: [
      "She once devoured every traveler who failed her riddle, right up until Oedipus finally answered it and she threw herself from her perch in defeat. She hasn't found many worth asking since him.",
      "<strong>Every question here is a riddle wearing a plainer costume.</strong> Answer wrong at your own risk. The myth was never subtle about what that costs.",
    ],
  },
  {
    id: "themis",
    title: "Themis",
    badge: "Arbiter of the Scales",
    description: [
      "She is the order the gods themselves answer to, the one who convenes their councils and holds the scale they're all measured against. She plays without favor, and she keeps a better tally of it than you'd like.",
      "There is no appealing a ruling once she's made it, so get the answer right the first time.",
    ],
  },
  {
    id: "pandora",
    title: "Pandora",
    badge: "Bearer of the Box",
    description: [
      "Handed a jar she was told never to open and a curiosity no god thought to warn her about, she let loose every hardship the world now carries. What stayed behind, right at the bottom, was hope.",
      'She plays like someone who already made the worst mistake there is and lived past it. <span class="text-foreground">Nothing about this round frightens her.</span>',
    ],
  },
  {
    id: "donut",
    title: "A donut",
    badge: "Glazed and Ready",
    description: [
      "No myth, no pantheon, no tragedy behind it. Just a donut, sitting across the lobby, glazed and entirely unbothered by the concept of stakes.",
      "It will not get a single answer right. It will, however, taste better in defeat than anyone else on this list.",
    ],
  },
  {
    id: "bear",
    title: "A bear",
    badge: "Ursa Ascendant",
    description: [
      "Callisto was turned into a bear by a jealous goddess and nearly killed by her own son before Zeus swept them both into the sky as Ursa Major and Minor. This one seems entirely at peace with how that story ended.",
      "It answers with the confidence of something that already has a constellation named after it, which is to say: not very carefully.",
    ],
  },
  {
    id: "frog",
    title: "A frog",
    badge: "Croaker of Lycia",
    description: [
      "When a group of Lycian peasants refused an exhausted Leto a drink from their own pond, she turned every one of them into frogs on the spot. This one has apparently made its peace with the arrangement.",
      "It croaks through every answer with equal conviction, right or wrong. It's had a very long time to get used to losing.",
    ],
  },
  {
    id: "salem",
    title: "Salem",
    badge: "Cursed Familiar",
    description: [
      "A warlock once tried to take over the world and got sentenced by the Witches' Council to a century as an ordinary house cat, no powers, for the trouble. Salem has been serving that sentence ever since, and he has not once stopped scheming.",
      "He'll act bored through the whole round, half-asleep, entirely unbothered. <strong>Don't trust it.</strong> A hundred years without magic hasn't dulled the part of him that still wants to win.",
    ],
  },
];

export function getNpcForLobby(seed: string): Npc {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) >>> 0;
  }
  return NPCS[hash % NPCS.length];
}

export function getNpcById(id: string): Npc | undefined {
  return NPCS.find((npc) => npc.id === id);
}
