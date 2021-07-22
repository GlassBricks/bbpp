/** @noSelfInFile */
import { isEmpty } from "./util"

export type VectorTable<V> = {
  [x: number]: PRecord<number, V> | undefined
}

export function put<V>(table: VectorTable<V>, x: number, y: number, value: V | undefined): void {
  if (value === undefined) return remove(table, x, y)
  let xs = table[x]
  if (!xs) {
    xs = {}
    table[x] = xs
  }
  xs[y] = value
}

export function remove<V>(table: VectorTable<V>, x: number, y: number): void {
  const xs = table[x]
  if (!xs) return
  xs[y] = undefined
  if (isEmpty(xs)) {
    table[x] = undefined
  }
}

export function get<V>(table: VectorTable<V>, x: number, y: number): V | undefined {
  const xs = table[x]
  return xs && xs[y]
}

export function vectorTableRemoveValue<V>(table: VectorTable<V>, value: V): void {
  for (const [x, xs] of pairs(table)) {
    for (const [y, val] of pairs(xs)) {
      if (val !== value) continue
      xs[y] = undefined
      if (isEmpty(xs)) {
        table[x] = undefined
      }
      return
    }
  }
}
