import http from "node:http";

const HOST = process.argv[2] ?? "http://localhost:3000";
const baseUrl = HOST.replace(/\/+$/, "");

function fetch(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    http.get(`${baseUrl}${path}`, (res) => {
      let data = "";
      res.on("data", (chunk: string) => data += chunk);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

async function poll() {
  for (let tick = 0; tick < 60; tick++) {
    const status = JSON.parse(await fetch("/api/status"));
    console.log(
      `[${status.time}] tick=${status.tick} patients=${status.patients} ` +
      `encounters=${status.activeEncounters} beds=${status.availableBeds} waiting=${status.waitingRoom}`
    );
    await new Promise(r => setTimeout(r, 500));
  }
}

async function main() {
  console.log(`🦌 Deer's Rock — Demo Client`);
  console.log(`   Target: ${baseUrl}\n`);

  console.log("=== Status Polling (30s of hospital time) ===\n");
  await poll();

  console.log("\n=== Patient Snapshot ===\n");
  const patients = JSON.parse(await fetch("/api/patients"));
  for (const p of patients.slice(0, 5)) {
    console.log(`  ${p.id} | ${p.name} | ${p.age}y ${p.gender} | HR=${p.vitals.heartRate} BP=${p.vitals.bloodPressureSystolic}/${p.vitals.bloodPressureDiastolic} SpO2=${p.vitals.oxygenSaturation}%`);
  }
  console.log(`  ... and ${patients.length - 5} more`);

  console.log("\n=== Active Encounters ===\n");
  const encounters = JSON.parse(await fetch("/api/encounters"));
  const active = encounters.filter((e: any) => e.status === "active");
  for (const e of active.slice(0, 8)) {
    console.log(`  ${e.id} | patient=${e.patientId} | ${e.type} | status=${e.status}`);
  }
  console.log(`  ... ${active.length} total active`);

  console.log("\n=== Bed Occupancy ===\n");
  const beds = JSON.parse(await fetch("/api/beds"));
  const occupied = beds.filter((b: any) => b.patientId !== null);
  const byWard: Record<string, number> = {};
  for (const b of occupied) {
    byWard[b.ward] = (byWard[b.ward] ?? 0) + 1;
  }
  for (const [ward, count] of Object.entries(byWard)) {
    console.log(`  ${ward}: ${count} occupied`);
  }

  console.log("\n✅ Demo complete. Hospital is still running at", baseUrl);
}

main().catch(console.error);
