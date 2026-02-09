import { describe, it, expect, vi } from 'vitest';
import { EventBusImpl, createCapturingEventBus } from '../../src/events/index.js';

describe('EventBusImpl', () => {
  it('on() + emit(): handler receives correct payload', () => {
    const bus = new EventBusImpl();
    const handler = vi.fn();

    bus.on('sdk:initialized', handler);
    bus.emit('sdk:initialized', { configHash: 'abc123' });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ configHash: 'abc123' });
  });

  it('multiple handlers: both called in registration order', () => {
    const bus = new EventBusImpl();
    const calls: number[] = [];
    const handler1 = () => calls.push(1);
    const handler2 = () => calls.push(2);

    bus.on('sdk:initialized', handler1);
    bus.on('sdk:initialized', handler2);
    bus.emit('sdk:initialized', { configHash: 'x' });

    expect(calls).toEqual([1, 2]);
  });

  it('once(): fires exactly once', () => {
    const bus = new EventBusImpl();
    const handler = vi.fn();

    bus.once('sdk:initialized', handler);
    bus.emit('sdk:initialized', { configHash: 'a' });
    bus.emit('sdk:initialized', { configHash: 'b' });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ configHash: 'a' });
  });

  it('unsubscribe removes handler', () => {
    const bus = new EventBusImpl();
    const handler = vi.fn();

    const unsub = bus.on('sdk:initialized', handler);
    unsub();
    bus.emit('sdk:initialized', { configHash: 'z' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('emitting event with no handlers does not throw', () => {
    const bus = new EventBusImpl();
    expect(() => {
      bus.emit('sdk:initialized', { configHash: 'noop' });
    }).not.toThrow();
  });
});

describe('createCapturingEventBus()', () => {
  it('records events in order', () => {
    const bus = createCapturingEventBus();

    bus.emit('sdk:initialized', { configHash: 'first' });
    bus.emit('lock:read', { path: '/tmp/lock.json' });

    expect(bus.events).toHaveLength(2);
    expect(bus.events[0]).toEqual({ event: 'sdk:initialized', payload: { configHash: 'first' } });
    expect(bus.events[1]).toEqual({ event: 'lock:read', payload: { path: '/tmp/lock.json' } });
  });

  it('still invokes registered handlers', () => {
    const bus = createCapturingEventBus();
    const handler = vi.fn();

    bus.on('sdk:initialized', handler);
    bus.emit('sdk:initialized', { configHash: 'test' });

    expect(handler).toHaveBeenCalledOnce();
    expect(bus.events).toHaveLength(1);
  });
});
