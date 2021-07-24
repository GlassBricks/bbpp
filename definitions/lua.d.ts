// noinspection JSUnusedGlobalSymbols
interface String {
  gsub(regex: string, result: string): string

  find(regex: string): LuaMultiReturn<[number, number]> | undefined
}

interface LuaReadonlyIndexing<Key, Value> {
  readonly get: LuaTableGetMethod<Key, Value>
  readonly has: LuaTableHasMethod<Key>
}

type ArrayAndTable<T, K, V> = Array<T> & LuaTable<K, V>
