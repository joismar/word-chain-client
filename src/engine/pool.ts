/** Free list of reusable objects, so tiles are not rebuilt on every screen change. */
export class Pool<T> {
  private free: T[] = [];

  constructor(
    private readonly create: () => T,
    private readonly reset: (item: T) => void,
    private readonly destroy: (item: T) => void = () => {},
    private readonly capacity = 256,
  ) {}

  get size() {
    return this.free.length;
  }

  acquire(): T {
    return this.free.pop() ?? this.create();
  }

  release(item: T) {
    if (this.free.length >= this.capacity) {
      this.destroy(item);
      return;
    }
    this.reset(item);
    this.free.push(item);
  }

  /** Destroys an item that will not come back to the pool. */
  discard(item: T) {
    this.destroy(item);
  }

  drain() {
    this.free.forEach((item) => this.destroy(item));
    this.free = [];
  }
}
