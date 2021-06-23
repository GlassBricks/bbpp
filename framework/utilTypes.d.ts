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

type FunctionKeys<T> = {
  [K in keyof T]: T[K] extends Function ? K : never
}[keyof T]

type OptionalKeys<T> = {
  [K in keyof T]: T extends Record<K, T[K]> ? K : never
}[keyof T]

/**
 * Gets only the assignable properties of T (excludes readonly and function keys).
 */
type Writable<T> = Omit<T, ReadonlyKeys<T> | FunctionKeys<T>>

type ModOf<T> = Partial<Writable<T>>

type Empty = Record<any, never>

interface Class<S, A extends any[] = []> {
  prototype: any
  name: string

  new (...args: A): S
}
