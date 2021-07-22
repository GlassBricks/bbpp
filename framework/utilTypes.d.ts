// equivalent to Partial<Record<K,V>>
type PRecord<K extends keyof any, V> = {
  [P in K]?: V
}
type ReadonlyRecord<K extends keyof any, V> = {
  readonly [P in K]: V
}

type Mutable<T> = {
  -readonly [P in keyof T]: T[P]
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

type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends { [P in K]: T[K] } ? never : K
}[keyof T]

/**
 * Gets only the assignable properties of T (excludes readonly and function keys).
 */
type ModableKeys<T> = WritableKeys<T> & NonFunctionKeys<T>
type Modable<T> = Pick<T, ModableKeys<T>>

type ModOf<T> = Partial<Modable<T>>

type Empty = Record<any, never>

interface Class<T> extends Function {
  new (...args: any): T
}
