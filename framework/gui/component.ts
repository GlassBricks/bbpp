/** @noSelfInFile */
import { AnySpec } from "./spec"
import { FuncRef, getRef, registerFuncs } from "../funcRef"
import { dlog, userWarning } from "../logging"
import { registerHandlers } from "../events"
import { isValid } from "../util"

export interface ComponentBoundFunc<F extends Function> {
  componentId: number
  funcName: string
  "#funcType"?: F
}

export type ComponentFunc<F extends Function> = FuncRef<F> | ComponentBoundFunc<F>

export type Funcs<T> = {
  readonly [K in keyof T]: T[K] extends Function ? ComponentBoundFunc<T[K]> : never
}

const funcsMeta = {
  __index(this: { id: number }, name: string): ComponentBoundFunc<any> {
    return {
      componentId: this.id,
      funcName: name,
    }
  },
} as LuaMetatable<{ id: number }>

const staticFuncsMeta = {
  __index(this: { self: any }, name: string): FuncRef<any> {
    return getRef(this.self[name])
  },
} as LuaMetatable<{ self: any }>

export type Refs = PRecord<string | number, LuaGuiElement | Component<unknown>>

export abstract class Component<Props> {
  private static readonly _staticFuncs: Funcs<any>
  private static readonly _applySpec: (this: void, component: Component<unknown>, spec: AnySpec | undefined) => void
  firstGuiElement!: LuaGuiElement
  parentGuiElement!: LuaGuiElement
  readonly id: number
  readonly refs: Refs = {}
  readonly funcs: Funcs<this>
  _internalInstance: any
  protected props!: Props
  private isFirstUpdate: boolean = true
  // noinspection JSUnusedLocalSymbols
  private ____props!:
    | Props
    | ({
        updateOnly: true
        name: string
      } & Partial<Props>)

  constructor() {
    const g = global
    this.id = g.nextComponentInstanceId++
    g.componentInstanceTypes.set(this, this.constructor.name)
    g.componentInstanceById[this.id] = this

    this.funcs = setmetatable({ id: this.id }, funcsMeta) as any
  }

  static funcs<T extends Class<Component<any>>>(this: T): Funcs<T> {
    return (this as unknown as typeof Component)._staticFuncs
  }

  createWith(props: Props): AnySpec | undefined {
    this.props = props
    return this.create()
  }

  updateWith(props: Props): void {
    const prevProps = this.props
    this.props = props
    this.update(prevProps, this.isFirstUpdate)
    this.isFirstUpdate = false
  }

  updateMerge(props?: Partial<Props>): void {
    const newProps = { ...this.props, ...props }
    this.updateWith(newProps)
  }

  isValid(): boolean {
    return isValid(this.firstGuiElement)
  }

  protected abstract create(): AnySpec | undefined

  protected applySpec(spec: AnySpec | undefined): void {
    Component._applySpec(this, spec)
  }

  protected abstract update(prevProps: Props, firstUpdate: boolean): void
}

/**
 * A component where you handle creation/updates manually in the `update` function
 */
export abstract class ManagedComponent<Props> extends Component<Props> {
  create(): AnySpec | undefined {
    return undefined
  }
}

/**
 * A component which is the same every time; i.e. only `create`, nothing on `update`
 */
export abstract class StaticComponent extends Component<Empty> {
  update(): void {
    // noop
  }
}

/**
 * A component that behaves like normal react. This comes with a performance warning.
 */
export abstract class ReactiveComponent<Props> extends Component<Props> {
  update(): void {
    this.applySpec(this.create())
  }
}

const registeredComponents: Record<string, Class<Component<unknown>>> = {}

export type PropsOf<C extends Component<any>> = C extends Component<infer P> ? P : never

/**
 * Registers a gui component class. All components must be registered to be used.
 * The _name_ of the class should be persistent through versions/reloads.
 *
 * All _static_ functions of the class will also be registered.
 */
export function registerComponent<C extends Component<any>>(this: unknown, component: Class<C>): void {
  const componentName = component.name
  if (registeredComponents[componentName]) {
    error(`A gui component with the name "${componentName}" is already registered`)
  }
  registeredComponents[componentName] = component
  registerFuncs(component, componentName)
  ;(component as any)._staticFuncs = setmetatable({ self: component }, staticFuncsMeta)
  dlog("registered component", componentName)
}

function getRegisteredComponent(name: string): Class<Component<unknown>> {
  const componentClass = registeredComponents[name]
  if (!componentClass) {
    error(`Component class with name ${name} not found. Did you register the class and perform migrations properly?`)
  }
  return componentClass as any
}

export function isRegisteredComponent<C extends Component<any>>(component: Class<C>): boolean {
  return component.name in registeredComponents
}

interface ComponentsGlobal {
  nextComponentInstanceId: number
  componentInstanceById: Record<number, Component<any>>
  componentInstanceTypes: LuaTable<Component<any>, string>
}

declare const global: ComponentsGlobal

function restoreMetatables() {
  // weak table for defensive programming
  setmetatable(global.componentInstanceTypes, { __mode: "k" })
  setmetatable(global.componentInstanceById, { __mode: "v" })
  for (const [instance, componentName] of pairs(global.componentInstanceTypes)) {
    const prototype = getRegisteredComponent(componentName).prototype
    setmetatable(instance, prototype)
    setmetatable(instance.funcs, funcsMeta)
  }
}

registerHandlers({
  on_init() {
    global.nextComponentInstanceId = 1
    global.componentInstanceById = setmetatable({}, { __mode: "v" })
    global.componentInstanceTypes = setmetatable(new LuaTable(), { __mode: "k" })
  },
  on_load: restoreMetatables,
})

export function componentNew(componentName: string): Component<unknown> {
  const componentClass = getRegisteredComponent(componentName)
  return new componentClass()
}

function getComponentById(id: number): Component<unknown> | undefined {
  const component = global.componentInstanceById[id]
  if (!component || !isValid(component.firstGuiElement)) {
    return undefined
  }
  return component
}

export function callBoundFunc<A extends any[]>(boundFunc: ComponentBoundFunc<(args: A) => void>, ...args: A): void {
  const instance = getComponentById(boundFunc.componentId)
  if (!instance) {
    userWarning(
      `Tried to call a bound function ("${boundFunc.funcName}") on a gui component that no longer exists.
      Also check that migrations are working. Please report this to the mod author.`
    )
    return
  }
  const func = (instance as any)[boundFunc.funcName]
  if (!func) {
    userWarning(`There is no bound function named "${func}" on component of type ${instance.constructor.name}.
      Check that the correct name is used and/or migrations are working properly.
      Please report this to the mod author.`)
    return
  }
  ;(func as (this: Component<unknown>, ...arg: A) => void).call(instance, ...args)
}
