import { createWorld, step } from "../engine/world.js";
import { createRestServer } from "../api/rest.js";
import { formatHospitalTime } from "../engine/clock.js";

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
  animateBoot();

  const port = parseInt(process.argv[3] ?? "3000", 10);
  let world = createWorld(50, "world-journal.db");

  const server = createRestServer(() => world);
  server.listen(port);

  setInterval(() => {
    world = step(world);
  }, 1000);

  console.log(`\n🦌 Deer's Rock Hospital is running`);
  console.log(`   Time: ${formatHospitalTime(world.clock)}`);
  console.log(`   API:  http://localhost:${port}/api/status`);
  console.log(`   Tick: ${world.clock.tick}`);
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
