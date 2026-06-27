import { createWorld, resumeWorld, step } from "../engine/world.js";
import { createRestServer } from "../api/rest.js";
import { createClock, formatHospitalTime } from "../engine/clock.js";
import { initJournal, loadNearestSnapshot, closeJournal } from "../engine/journal.js";
import fs from "node:fs";

const command = process.argv[2];

function animateBoot() {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  const steps = [
    "Initializing hospital systems...",
    "Generating synthetic patients...",
    "Assigning beds and wards...",
    "Starting clinical clock...",
    "Opening emergency department...",
    "Hospital is live.",
  ];
  let i = 0;
  for (const msg of steps) {
    process.stdout.write(`\r${frames[i % frames.length]} ${msg}`);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
    i++;
  }
  process.stdout.write("\n");
}

async function cmdUp() {
  const port = parseInt(process.env.PORT ?? process.argv[3] ?? "3000", 10);
  const dataDir = process.env.DATA_DIR ?? ".";
  const journalPath = `${dataDir}/world-journal.db`;

  let world: import("../engine/world.js").World;

  if (fs.existsSync(journalPath) && fs.statSync(journalPath).size > 1024) {
    initJournal(journalPath);
    const snap = loadNearestSnapshot(Number.MAX_SAFE_INTEGER);
    if (snap.state) {
      world = resumeWorld(snap.state, snap.tick, journalPath);
    } else {
      process.stdout.write("⚠️ DB exists but no valid snapshot found, starting fresh\n");
      world = createWorld(50, journalPath);
    }
  } else {
    process.stdout.write("📁 No existing database found, starting fresh\n");
    world = createWorld(50, journalPath);
  }

  const server = createRestServer(() => world);
  server.listen(port);

  setInterval(() => {
    world = step(world);
  }, 1000);

  process.stdout.write(`\n🦌 Deer's Rock Hospital is running\n`);
  process.stdout.write(`   Time: ${formatHospitalTime(world.clock)}\n`);
  process.stdout.write(`   API:  http://localhost:${port}/api/status\n`);
  process.stdout.write(`   Tick: ${world.clock.tick}\n`);
}

function cmdStatus() {
  console.log("🦌 Deer's Rock Hospital");
  console.log("   Status: running (simulated)");
  console.log("   Use `deers-rock up` to start the server");
}

function cmdDown() {
  console.log("🦌 Deer's Rock Hospital shutting down...");
  process.exit(0);
}

switch (command) {
  case "up":
    cmdUp();
    break;
  case "status":
    cmdStatus();
    break;
  case "down":
    cmdDown();
    break;
  default:
    console.log("🦌 Deer's Rock — Healthcare Operating Environment");
    console.log("");
    console.log("  Usage:");
    console.log("    deers-rock up [port]    Start the hospital server");
    console.log("    deers-rock status       Show hospital status");
    console.log("    deers-rock down         Shutdown");
    console.log("");
    console.log("  Examples:");
    console.log("    deers-rock up           http://localhost:3000");
    console.log("    deers-rock up 4000      http://localhost:4000");
    process.exit(1);
}
