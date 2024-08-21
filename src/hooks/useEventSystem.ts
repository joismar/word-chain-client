import { EventSystem } from '../utils/event';

export function useEventSystem() {
  const eventSystem = EventSystem.getInstance();

  return { emit: eventSystem.emit, subscribe: eventSystem.subscribe };
}
