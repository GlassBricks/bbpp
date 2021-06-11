interface String {
  gsub(regex: string, result: string): string

  find(regex: string): LuaMultiReturn<[number, number]> | undefined
}
