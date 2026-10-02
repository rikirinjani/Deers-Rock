// Workaround reporter for vitest 3.2.6 (see vitest.config.ts for the full
// investigation notes).
//
// Bug being worked around: during runs dominated by long synchronous tests
// (e.g. the chunked 1000-tick endurance run in tests/world.test.ts), the
// vitest main process has nothing to do between worker RPC messages, so its
// event loop parks and pending main->worker birpc response writes
// ("onTaskUpdate" acknowledgements) are not flushed for tens of seconds —
// measured up to 85s on this repo. The worker-side birpc timeout is
// hard-coded to 60s (node_modules/vitest/dist/chunks/index.B521nVV-.js,
// DEFAULT_TIMEOUT = 6e4) and not configurable, so a stalled response
// eventually produces the unhandled error
//   [vitest-worker]: Timeout calling "onTaskUpdate"
// which fails the whole run with exit code 1 even when every test passed.
//
// Fix: a no-op timer that wakes the main event loop every 100ms for the
// duration of the run. With the loop cycling, response writes flush within
// one interval tick and every RPC round-trip completes in well under a
// second (verified: worst observed response lag drops from 85s to <25s,
// bounded by one worker chunk, and the run exits 0).
//
// The timer is cleared in onTestRunEnd/onFinished so idle watch mode and
// process exit are not blocked.
//
// Removal condition: safe to delete after upgrading vitest past the version
// where worker RPC timeouts no longer fire on long synchronous runs (or when
// a configurable rpc timeout ships). Search for "onTaskUpdate" in the config
// comments when auditing.

const KEEPALIVE_INTERVAL_MS = 100;

let keepalive;

export default class RpcKeepaliveReporter {
  onInit() {
    if (keepalive) clearInterval(keepalive);
    // Empty callback: the point is only to keep the event loop cycling so
    // pending IPC writes are flushed promptly.
    keepalive = setInterval(() => {}, KEEPALIVE_INTERVAL_MS);
  }

  onTestRunEnd() {
    if (keepalive) clearInterval(keepalive);
    keepalive = undefined;
  }

  onFinished() {
    if (keepalive) clearInterval(keepalive);
    keepalive = undefined;
  }
}
