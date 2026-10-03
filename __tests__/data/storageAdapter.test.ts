import { InMemoryStorageAdapter } from '@/data/storage/InMemoryStorageAdapter';
import { AsyncStorageAdapter } from '@/data/storage/AsyncStorageAdapter';

describe('InMemoryStorageAdapter', () => {
  let adapter: InMemoryStorageAdapter;

  beforeEach(() => {
    adapter = new InMemoryStorageAdapter();
  });

  it('returns null for missing keys', async () => {
    const val = await adapter.getItem('nonexistent');
    expect(val).toBeNull();
  });

  it('stores and retrieves items correctly', async () => {
    await adapter.setItem('test_key', 'hello_world');
    const val = await adapter.getItem('test_key');
    expect(val).toBe('hello_world');
    expect(adapter.size()).toBe(1);
  });

  it('overwrites existing keys', async () => {
    await adapter.setItem('key_1', 'initial');
    await adapter.setItem('key_1', 'updated');
    const val = await adapter.getItem('key_1');
    expect(val).toBe('updated');
    expect(adapter.size()).toBe(1);
  });

  it('removes keys correctly', async () => {
    await adapter.setItem('key_to_delete', 'value');
    await adapter.removeItem('key_to_delete');
    const val = await adapter.getItem('key_to_delete');
    expect(val).toBeNull();
    expect(adapter.size()).toBe(0);
  });

  it('retrieves all keys', async () => {
    await adapter.setItem('k1', 'v1');
    await adapter.setItem('k2', 'v2');
    const keys = await adapter.getAllKeys();
    expect(keys).toEqual(expect.arrayContaining(['k1', 'k2']));
    expect(keys.length).toBe(2);
  });

  it('clears all entries', async () => {
    await adapter.setItem('k1', 'v1');
    await adapter.setItem('k2', 'v2');
    await adapter.clear();
    expect(adapter.size()).toBe(0);
    expect(await adapter.getAllKeys()).toEqual([]);
  });

  it('provides a snapshot dump of entries', async () => {
    await adapter.setItem('k1', 'v1');
    const dump = adapter.dump();
    expect(dump.get('k1')).toBe('v1');
  });
});

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => store.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: jest.fn(async (key: string) => {
        store.delete(key);
      }),
      getAllKeys: jest.fn(async () => Array.from(store.keys())),
      clear: jest.fn(async () => {
        store.clear();
      }),
    },
  };
});
describe('AsyncStorageAdapter', () => {
  let adapter: AsyncStorageAdapter;

  beforeEach(async () => {
    adapter = new AsyncStorageAdapter();
    await adapter.clear();
  });

  it('delegates getItem, setItem, removeItem, getAllKeys, and clear to AsyncStorage', async () => {
    expect(await adapter.getItem('test')).toBeNull();

    await adapter.setItem('test', 'value1');
    expect(await adapter.getItem('test')).toBe('value1');

    const keys = await adapter.getAllKeys();
    expect(keys).toContain('test');

    await adapter.removeItem('test');
    expect(await adapter.getItem('test')).toBeNull();

    await adapter.setItem('a', '1');
    await adapter.setItem('b', '2');
    await adapter.clear();
    expect(await adapter.getAllKeys()).toEqual([]);
  });
});

