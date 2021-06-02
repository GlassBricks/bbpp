// equivalent to Partial<Record<K,V>>
type PRecord<K extends keyof any, V> = {
  [k in K]?: V
}
