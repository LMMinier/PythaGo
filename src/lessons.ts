export type GameAction =
  | { type: 'say'; message: string }
  | { type: 'activate'; target: string }
  | { type: 'recharge'; amount: number }
  | { type: 'unlock'; gate: string };

export type Mission = {
  id: string;
  district: string;
  title: string;
  concept: string;
  briefing: string;
  objective: string;
  hint: string;
  starterCode: string;
  testCode: string;
  xp: number;
};

export type Progress = {
  currentMission: number;
  completed: string[];
  xp: number;
};

export const DEFAULT_PROGRESS: Progress = { currentMission: 0, completed: [], xp: 0 };

export const MISSIONS: Mission[] = [
  {
    id: 'hello-beacon',
    district: 'Transit Plaza',
    title: 'Wake the welcome beacon',
    concept: 'print()',
    briefing: 'The city is dark and Byte needs a clear signal. Print the greeting exactly, then call activate so the beacon can light the plaza.',
    objective: 'Print "Hello, Code Borough!" and activate the beacon.',
    hint: 'Use print("Hello, Code Borough!") on one line and activate("beacon") on another.',
    starterCode: 'print("Hello, Code Borough!")\nactivate("beacon")\n',
    testCode: `assert "Hello, Code Borough!" in _output, "Print the exact welcome message."\nassert any(a.get("type") == "activate" and a.get("target") == "beacon" for a in _actions), "Call activate(\"beacon\")."\n`,
    xp: 100,
  },
  {
    id: 'battery-variable',
    district: 'Power Row',
    title: 'Name the battery charge',
    concept: 'variables',
    briefing: 'Power Row needs a stored value so the grid can stabilize. Create a variable named charge and use it to recharge Byte.',
    objective: 'Set charge to 12 and pass that variable to recharge().',
    hint: 'Variables remember values: charge = 12, then recharge(charge).',
    starterCode: 'charge = 12\nrecharge(charge)\nprint(charge)\n',
    testCode: `assert globals().get("charge") == 12, "Create charge and set it to 12."\nassert any(a.get("type") == "recharge" and a.get("amount") == 12 for a in _actions), "Call recharge(charge)."\n`,
    xp: 125,
  },
  {
    id: 'gate-condition',
    district: 'Logic Lane',
    title: 'Choose the open gate',
    concept: 'if / else',
    briefing: 'Two gates guard the next block. Use a condition to unlock the north gate only when Byte has enough keys.',
    objective: 'With keys = 3, use if/else so unlock("north") runs.',
    hint: 'Check if keys >= 3. Put unlock("north") inside that if block.',
    starterCode: 'keys = 3\nif keys >= 3:\n    unlock("north")\nelse:\n    unlock("south")\n',
    testCode: `assert globals().get("keys") == 3, "Set keys to 3."\nassert any(a.get("type") == "unlock" and a.get("gate") == "north" for a in _actions), "Unlock the north gate."\nassert not any(a.get("type") == "unlock" and a.get("gate") == "south" for a in _actions), "The south gate should stay closed."\n`,
    xp: 150,
  },
  {
    id: 'lamp-loop',
    district: 'Loop Market',
    title: 'Light every market lamp',
    concept: 'loops',
    briefing: 'Loop Market has three lamps in a row. A for loop can activate all of them without repeating the same line by hand.',
    objective: 'Use a loop to activate lamp-0, lamp-1, and lamp-2.',
    hint: 'for index in range(3): activate(f"lamp-{index}")',
    starterCode: 'for index in range(3):\n    activate(f"lamp-{index}")\n',
    testCode: `for lamp in ["lamp-0", "lamp-1", "lamp-2"]:\n    assert any(a.get("type") == "activate" and a.get("target") == lamp for a in _actions), f"Activate {lamp}."\nassert len([a for a in _actions if a.get("type") == "activate" and str(a.get("target", "")).startswith("lamp-")]) == 3, "Activate exactly three lamps."\n`,
    xp: 175,
  },
  {
    id: 'repair-function',
    district: 'Function Foundry',
    title: 'Build a repair routine',
    concept: 'functions',
    briefing: 'The foundry needs reusable code. Define a function that repairs a bot by speaking to it and activating its repair station.',
    objective: 'Define repair_bot(name), then call repair_bot("Byte").',
    hint: 'Use def repair_bot(name):, say("Repairing " + name), and activate("repair-station").',
    starterCode: 'def repair_bot(name):\n    say("Repairing " + name)\n    activate("repair-station")\n\nrepair_bot("Byte")\n',
    testCode: `assert callable(globals().get("repair_bot")), "Define repair_bot(name)."\nassert any(a.get("type") == "say" and "Byte" in a.get("message", "") for a in _actions), "Have the function say Byte's name."\nassert any(a.get("type") == "activate" and a.get("target") == "repair-station" for a in _actions), "Activate the repair station."\n`,
    xp: 225,
  },
];
