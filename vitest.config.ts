import { defineConfig } from "vitest/config";

// Test-suite reliability config (GH issue #1, P0-1).
//
// Why these values — verified against the installed vitest 3.2.6 source
// (node_modules/vitest/dist) plus a duplex IPC probe (stderr timestamps on
// both the main process and the worker), not guesswork:
//
// 1. `[vitest-worker]: Timeout calling "onTaskUpdate"` is a birpc worker-RPC
//    timeout, hard-coded to 60s (`DEFAULT_TIMEOUT = 6e4` in
//    dist/chunks/index.B521nVV-.js). It is NOT the same setting as
//    `testTimeout` and it is NOT exposed as any vitest config option:
//    `createRuntimeRpc` (dist/chunks/rpc.-pEldfrD.js) only receives
//    post/on/serialize channel options from the pool workers.
//
//    Measured failure mechanism on the default `forks` pool: worker->main
//    requests and main->worker birpc responses travel over the fork's IPC
//    channel, which serializes with JSON (a v8-serialized Buffer crosses the
//    channel as {"type":"Buffer",...}) and whose writes are flushed by the
//    vitest main process's event loop. During runs dominated by long
//    synchronous tests, that loop parks and pending response writes stall —
//    observed up to 85s — so the worker's 60s timer fires and the whole run
//    exits 1 with an unhandled error even though every test passed. Chunking
//    the heavy test did not eliminate it (verified: 4x250 and 8x125 both
//    still failed on this machine).
//
//    Fixes applied:
//      a. `pool: "threads"` + `singleThread` — the worker runs in a worker
//         thread whose birpc uses an in-process MessagePort with structured
//         clone: no fork IPC pipe, no JSON Buffer mangling, no main-loop
//         write stalls. (better-sqlite3 is worker_threads-capable; the
//         journal/snapshot suites pass.) Verified on this machine: full
//         suite 19 files / 152 tests / exit 0 / ~103s.
//      b. tests/rpc-keepalive-reporter.mjs (registered below) keeps the main
//         event loop cycling during runs — defense in depth so main-side
//         RPC writes can never starve in any pool.
//      c. tests/world.test.ts chunks the 1000-tick endurance run into
//         8 x 125 ticks and yields the worker event loop between chunks, so
//         no single synchronous test blocks a worker for >60s either, and
//         pending RPC round-trips settle at every chunk boundary.
//
// 2. `testTimeout`/`hookTimeout` defaults (5s/10s) are too tight for this
//    simulation suite on loaded machines: bounded 50-200-tick engine runs
//    (phase-d, phase-e, temporal, snapshot) legitimately take tens of seconds
//    under load (they were >=15 spurious timeout failures locally). These
//    budgets are load margins, not functional changes — every test keeps its
//    original assertions.
//
// 3. `teardownTimeout` covers sqlite journal closes in afterAll hooks under
//    load (default 10s -> 30s).

export default defineConfig({
  test: {
    testTimeout: 120_000,
    hookTimeout: 120_000,
    teardownTimeout: 30_000,

    // Load hardening: one worker thread, files run sequentially. Slower on
    // many-core machines but deterministic and starvation-free — the trade
    // P0-2 explicitly asks for. See header note 1a for why threads, not forks.
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },

    // The suite contains stateful sequences (journal/snapshot DB reuse,
    // chunked endurance run) that rely on declaration order.
    sequence: {
      shuffle: false,
    },

    // See the header comment on tests/rpc-keepalive-reporter.mjs: keeps the
    // main event loop awake so worker RPC responses are flushed promptly.
    reporters: ["default", "./tests/rpc-keepalive-reporter.mjs"],
  },
});
