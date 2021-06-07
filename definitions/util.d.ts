// equivalent to Partial<Record<K,V>>
type PRecord<K extends keyof any, V> = {
  [k in K]?: V
}

type IfEquals<X, Y, A = X, B = never> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? A : B

type WritableKeys<T> = {
  [P in keyof T]-?: IfEquals<{ [Q in P]: T[P] }, { -readonly [Q in P]: T[P] }, P>
}[keyof T]

type ReadonlyKeys<T> = {
  [P in keyof T]-?: IfEquals<{ [Q in P]: T[P] }, { -readonly [Q in P]: T[P] }, never, P>
}[keyof T]

type NonFunctionKeys<T> = {
  [K in keyof T]: T[K] extends Function ? never : K
}[keyof T]

/**
 * Gets only the assignable properties of T (excludes readonly and function keys).
 */
type Writable<T> = Pick<T, WritableKeys<T> & NonFunctionKeys<T>>
