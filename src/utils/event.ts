import { EventMap } from './types';

export class EventSystem {
  private static instance: EventSystem;
  private eventTarget: EventTarget;

  private constructor() {
    this.eventTarget = new EventTarget();
  }

  public static getInstance(): EventSystem {
    if (!EventSystem.instance) {
      EventSystem.instance = new EventSystem();
    }
    // console.log(EventSystem.instance);
    return EventSystem.instance;
  }

  public emit(
    eventName: keyof EventMap,
    detail: EventMap[keyof EventMap]
  ): void {
    const event = new CustomEvent(eventName, { detail });
    EventSystem.instance.eventTarget.dispatchEvent(event);
  }

  public subscribe<K extends keyof EventMap>(
    eventName: K,
    callback: (detail: EventMap[K]) => void
  ): () => void {
    const handler = (event: Event) => {
      callback((event as CustomEvent<EventMap[K]>).detail);
    };

    EventSystem.instance.eventTarget.addEventListener(
      eventName as string,
      handler
    );

    // Return a function to unsubscribe the event
    return () => {
      EventSystem.instance.eventTarget.removeEventListener(
        eventName as string,
        handler
      );
    };
  }
}
