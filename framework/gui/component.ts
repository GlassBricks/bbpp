/** @noSelfInFile */
import { AnySpec } from "./spec"
import { BoundFuncRef, createBoundFunc, FuncRef, getRef, registerFuncs, SimpleFuncRef } from "../funcRef"
import { dlog } from "../logging"
import { registerHandlers } from "../events"
import { isValid } from "../util"

export type Funcs<T> = {
  readonly [K in keyof T]: T[K] extends Function ? FuncRef<T[K]> : never
}

const funcsMeta = {
  __index(this: { __self: any }, name: string): BoundFuncRef<any> {
    return createBoundFunc(this.__self, name)
  },
} as LuaMetatable<{ __self: any }>

const staticFuncsMeta = {
  __index(this: { __self: any }, name: string): SimpleFuncRef<any> {
    return getRef(this.__self[name])
  },
} as LuaMetatable<{ __self: any }>

export type Refs = PRecord<string | number, LuaGuiElement | Component<unknown>>

export abstract class Component<Props> {
  firstGuiElement!: LuaGuiElement
  parentGuiElement!: LuaGuiElement
  private static readonly _staticFuncs: Funcs<any>
  readonly refs: Refs = {}
  private static readonly _applySpec: (this: void, component: Component<unknown>, spec: AnySpec | undefined) => void

  readonly funcs: Funcs<this>
  _internalInstance: unknown
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
    global.componentInstanceTypes.set(this, this.constructor.name)

    this.funcs = setmetatable({ __self: this }, funcsMeta) as any
  }

  static funcs<T extends Function>(this: T): Funcs<T> {
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
  ;(component as any)._staticFuncs = setmetatable({ __self: component }, staticFuncsMeta)
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
  componentInstanceTypes: LuaTable<Component<any>, string>
}

declare const global: ComponentsGlobal

function restoreMetatables() {
  // weak table for defensive programming
  setmetatable(global.componentInstanceTypes, { __mode: "k" })
  for (const [instance, componentName] of pairs(global.componentInstanceTypes)) {
    const prototype = getRegisteredComponent(componentName).prototype
    setmetatable(instance, prototype)
    setmetatable(instance.funcs, funcsMeta as any)
  }
}

registerHandlers({
  on_init() {
    global.componentInstanceTypes = setmetatable(new LuaTable(), { __mode: "k" })
  },
  on_load: restoreMetatables,
})

export function componentNew(componentName: string): Component<unknown> {
  const componentClass = getRegisteredComponent(componentName)
  return new componentClass()
}
