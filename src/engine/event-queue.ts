export interface Event {
  id: string;
  type: string;
  scheduledTick: number;
  data: Record<string, unknown>;
}

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
    this.events.push(event);
    return event;
  }

  dueEvents(currentTick: number): Event[] {
    const due = this.events.filter(e => e.scheduledTick <= currentTick);
    this.events = this.events.filter(e => e.scheduledTick > currentTick);
    return due;
  }

  pending(): number {
    return this.events.length;
  }

  clear(): void {
    this.events = [];
  }
}
