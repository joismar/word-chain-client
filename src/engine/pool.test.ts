import { describe, expect, it, vi } from 'vitest';
import { Pool } from './pool';

describe('Pool', () => {
  it('reuses released items before creating new ones', () => {
    let made = 0;
    const pool = new Pool(() => ({ id: ++made }), vi.fn());
    const a = pool.acquire();
    pool.release(a);
    expect(pool.acquire()).toBe(a);
    expect(pool.acquire().id).toBe(2);
  });

  it('resets items on release and destroys everything on drain', () => {
    const reset = vi.fn();
    const destroy = vi.fn();
    const pool = new Pool(() => ({}), reset, destroy);
    const a = pool.acquire();
    pool.release(a);
    expect(reset).toHaveBeenCalledWith(a);
    pool.drain();
    expect(destroy).toHaveBeenCalledWith(a);
    expect(pool.size).toBe(0);
  });

  it('destroys instead of keeping items over its capacity', () => {
    const destroy = vi.fn();
    const pool = new Pool(() => ({}), () => {}, destroy, 1);
    const [a, b] = [pool.acquire(), pool.acquire()];
    pool.release(a);
    pool.release(b);
    expect(pool.size).toBe(1);
    expect(destroy).toHaveBeenCalledWith(b);
  });
});
