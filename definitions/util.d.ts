// partial record
type PRecord<K extends keyof any, V> = {
  [k in K]?: V
}
