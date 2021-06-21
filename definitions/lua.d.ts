interface String {
  gsub(regex: string, result: string): string

  find(regex: string): LuaMultiReturn<[number, number]> | undefined
}

interface LuaReadonlyIndexing<Key, Value> {
  readonly get: LuaTableGetMethod<Key, Value>
  readonly has: LuaTableGetMethod<Key, Value>
}
