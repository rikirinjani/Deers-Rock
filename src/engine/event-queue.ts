export interface Event {
  id: string;
  type: string;
  scheduledTick: number;
  data: Record<string, unknown>;
}

/**
 * EventQueue with O(log n) scheduling and O(log n + m) dueEvents.
 *
 * Events are kept sorted by scheduledTick using binary search insertion.
 * dueEvents() uses binary search to find the split point, then splices
 * the prefix (due events) off the array in one operation.
 *
 * This eliminates the O(n) → O(n²) scaling that occurred with the
 * previous flat-array filter approach when the queue grew to 10k+ events.
 */
export class EventQueue {
  private events: Event[] = [];
  private counter = 0;

  schedule(type: string, delayTicks: number, data: Record<string, unknown> = {}): Event {
    this.counter++;
    const scheduledTick = delayTicks < 0 ? 0 : delayTicks;
    const event: Event = {
      id: `EVT-${String(this.counter).padStart(4, "0")}`,
      type,
      scheduledTick,
      data,
    };
    // Binary search for insertion point to maintain sorted order
    let lo = 0, hi = this.events.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.events[mid]!.scheduledTick <= scheduledTick) lo = mid + 1;
      else hi = mid;
    }
    this.events.splice(lo, 0, event);
    return event;
  }

  /**
   * Return and remove all events with scheduledTick <= currentTick.
   * O(log n) to find split point + O(m) to splice m due events off.
   */
  dueEvents(currentTick: number): Event[] {
    // Binary search: find first index where scheduledTick > currentTick
    let lo = 0, hi = this.events.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.events[mid]!.scheduledTick <= currentTick) lo = mid + 1;
      else hi = mid;
    }
    // lo is now the split point: events[0..lo) are due
    if (lo === 0) return [];
    const due = this.events.splice(0, lo);
    return due;
  }

  pending(): number {
    return this.events.length;
  }

  clear(): void {
    this.events = [];
  }
}
