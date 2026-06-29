export type GameAction =
  | { type: 'activate'; target: string }
  | { type: 'recharge'; target: string }
  | { type: 'say'; speaker: string; text: string }
  | { type: 'unlock'; target: string };

export interface Mission {
  id: string;
  title: string;
  district: string;
  concept: string;
  briefing: string;
  objective: string;
  hint: string;
  starterCode: string;
  testCode: string;
  xp: number;
}

export interface Progress {
  currentMission: number;
  completed: string[];
  xp: number;
}

export const DEFAULT_PROGRESS: Progress = { currentMission: 0, completed: [], xp: 0 };

export const MISSIONS: Mission[] = [
  {
    id: 'first-signal', title: 'First Signal', district: 'Workshop District', concept: 'print()', xp: 100,
    briefing: 'The borough emergency display is dark. Send the startup message so the network knows an Architect is online.',
    objective: 'Print the exact words SYSTEM ONLINE.',
    hint: 'Use print("SYSTEM ONLINE")',
    starterCode: `# Send a message to the borough display\nprint("SYSTEM ONLINE")`,
    testCode: `assert "SYSTEM ONLINE" in __output__, "Your program must print SYSTEM ONLINE."\nsay("Byte", "Signal received!")\nactivate("street_display")`,
  },
  {
    id: 'identity-core', title: 'Identity Core', district: 'Workshop District', concept: 'variables', xp: 125,
    briefing: 'The repair bot has no identity or battery reading. Store both values so its diagnostic core can boot.',
    objective: 'Set robot_name to Byte, battery to 75, then activate the robot.',
    hint: 'A variable uses one equals sign: name = value',
    starterCode: `robot_name = "Byte"\nbattery = 75\n\nactivate(robot_name)`,
    testCode: `assert robot_name == "Byte", "robot_name must equal Byte."\nassert battery == 75, "battery must equal 75."\nassert any(a.get("type") == "activate" and a.get("target") == "Byte" for a in __actions__), "Call activate(robot_name)."\nsay("Byte", "Identity core restored.")`,
  },
  {
    id: 'battery-decision', title: 'Battery Decision', district: 'Logic Heights', concept: 'if / else', xp: 150,
    briefing: 'Byte should only enter the tunnel when enough power remains. Make the program choose safely.',
    objective: 'Activate Byte when battery is at least 50; otherwise recharge.',
    hint: 'Use if battery >= 50: and indent the next line.',
    starterCode: `battery = 62\n\nif battery >= 50:\n    activate("Byte")\nelse:\n    recharge("Byte")`,
    testCode: `assert battery == 62, "Keep the battery value at 62."\nassert any(a.get("type") == "activate" and a.get("target") == "Byte" for a in __actions__), "A charged Byte should be activated."\nsay("Byte", "Power check passed.")\nunlock("tunnel_gate")`,
  },
  {
    id: 'drone-loop', title: 'Drone Wake-Up', district: 'Loop Line', concept: 'for loops', xp: 175,
    briefing: 'Three delivery drones are waiting. Automate the fleet instead of repeating commands by hand.',
    objective: 'Use a for loop to activate every drone in the list.',
    hint: 'for drone in drones: then indent activate(drone)',
    starterCode: `drones = ["drone_1", "drone_2", "drone_3"]\n\nfor drone in drones:\n    activate(drone)`,
    testCode: `activated = [a.get("target") for a in __actions__ if a.get("type") == "activate"]\nassert all(drone in activated for drone in drones), "Activate every drone."\nsay("Maya", "Fleet automation confirmed.")`,
  },
  {
    id: 'repair-function', title: 'Reusable Repair', district: 'Function Factory', concept: 'functions', xp: 250,
    briefing: 'Build one reusable repair routine instead of rewriting the same instructions for every machine.',
    objective: 'Write repair_robot(name, battery), recharge below 50, and return the final battery.',
    hint: 'Start with def repair_robot(name, battery): and finish with return battery.',
    starterCode: `def repair_robot(name, battery):\n    if battery < 50:\n        recharge(name)\n        battery = 100\n    else:\n        activate(name)\n    return battery\n\nfinal_battery = repair_robot("Byte", 20)`,
    testCode: `assert callable(repair_robot), "repair_robot must be a function."\nassert final_battery == 100, "A low battery should become 100."\nassert any(a.get("type") == "recharge" and a.get("target") == "Byte" for a in __actions__), "Recharge Byte."\nsay("The Architect", "The first district is restored.")\nunlock("architect_core")`,
  },
];
