/** @noSelfInFile */
import { AnySpec } from "./spec"
import { derefFuncOrNil, FuncRef, registerFuncs } from "../funcRef"
import { registerHandlers } from "../events"
import { vlog } from "../logging"

interface ComponentsGlobal {
  componentInstances: Record<number, Component<any>>
  nextInstanceId: number
}

declare const global: ComponentsGlobal

registerHandlers({
  on_init() {
    global.componentInstances = setmetatable({}, { __mode: "v" })
    global.nextInstanceId = 1
  },
  on_load() {
    setmetatable(global.componentInstances, { __mode: "v" })
    for (const [, instance] of pairs(global.componentInstances)) {
      const prototype = getRegisteredComponent(instance.__componentName).prototype
      setmetatable(instance, prototype)
    }
  },
})

export type Refs = PRecord<string | number, LuaGuiElement | Component<unknown>>

export abstract class Component<Props> {
  static __componentName: string
  static __funcNames?: LuaTable<Function, keyof any | undefined>

  parentGuiElement!: LuaGuiElement
  firstGuiElement!: LuaGuiElement
  refs: Refs = {}
  public readonly __id: number
  __componentName!: string
  __internalInstance!: unknown
  props!: Props

  constructor() {
    this.__id = global.nextInstanceId
    global.nextInstanceId = this.__id + 1
    global.componentInstances[this.__id] = this
  }

  static __applySpec?(this: void, component: Component<unknown>, spec: AnySpec | undefined): void

  static __isValid?(this: void, component: Component<unknown>): boolean

  protected abstract create(): AnySpec | undefined

  onCreated?(): void

  createWith(props: Props): AnySpec | undefined {
    this.props = props
    return this.create()
  }

  protected rerender(): void {
    this.applySpec(this.create())
    if (this.onCreated) this.onCreated()
  }

  updateProps(props: Props): void {
    this.mergeProps(props)
  }

  abstract mergeProps(props: Partial<Props>): void

  protected applySpec(spec: AnySpec | undefined): void {
    Component.__applySpec!(this, spec)
  }

  protected getPlayer(): LuaPlayer {
    return game.get_player(this.parentGuiElement.player_index)
  }

  protected getPlayerIndex(): number {
    return this.parentGuiElement.player_index
  }

  protected r<F extends (this: this, ...args: any) => any>(func: F): ComponentBoundFunc<F>
  protected r<T, K extends keyof T>(this: T, key: K): T[K] extends Function ? ComponentBoundFunc<T[K]> : never
  protected r(func: Function | string): ComponentBoundFunc<any> {
    const name = typeof func === "string" ? func : (this.constructor as typeof Component).__funcNames!.get(func)
    if (!name) error("The function given was not bindable (not part of prototype):" + func)
    return {
      componentId: this.__id,
      funcName: name,
    } as Partial<ComponentBoundFunc<any>> as ComponentBoundFunc<any>
  }
}

export abstract class NoPropComponent extends Component<{}> {
  mergeProps(): void {
    // noop
  }
}

export abstract class ManualReactiveComponent<Props> extends Component<Props> {
  mergeProps(props: Partial<Props>): void {
    Object.assign(this.props, props)
    this.propsChanged(props)
  }

  protected abstract propsChanged(change: Partial<Props>): void
}

/**
 * A component that behaves like normal react. This comes with a performance warning.
 */
export abstract class ReactiveComponent<Props> extends Component<Props> {
  updateProps(props: Props): void {
    const prevProps = this.props
    this.props = props
    if (this.shouldComponentUpdate(prevProps)) this.applySpec(this.create())
  }

  mergeProps(props: Partial<Props>): void {
    this.updateProps({ ...this.props, ...props })
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected shouldComponentUpdate(prevProps: Props): boolean {
    return true
  }
}

// function binding
export type ComponentBoundFunc<F extends Function> = {
  componentId: number
  funcName: keyof any
  "#funcType": F
}

export type GuiFunc<F extends Function> = ComponentBoundFunc<F> | FuncRef<F>

export function callGuiFunc<F extends (this: any, ...a: any) => any>(
  ref: GuiFunc<F> | undefined,
  ...args: Parameters<F>
): ReturnType<F>
export function callGuiFunc<F extends (this: any, ...a: any) => any>(
  ref: GuiFunc<F>,
  ...args: Parameters<F>
): ReturnType<F> | undefined
export function callGuiFunc<F extends (this: any, ...a: any) => any>(
  ref: GuiFunc<F> | undefined,
  ...args: Parameters<F>
): ReturnType<F> | undefined {
  if (!ref) return
  if (typeof ref === "string") {
    const f = derefFuncOrNil(ref)
    if (!f) error(`Could not find function ref with name ${ref}. Did you register the function/do migrations properly?`)
    // eslint-disable-next-line no-useless-call
    return f(...(args as any[]))
  } else {
    const instance = getComponentInstance(ref.componentId) as any
    return (instance[ref.funcName] as (this: any, ...a: any) => any).call(instance, ...(args as any[]))
  }
}

const registeredComponents: Record<string, Class<Component<unknown>>> = {}

/**
 * Registers a gui component class. All components must be registered to be used.
 * The _name_ of the class should be persistent through versions/reloads.
 *
 * All _static_ functions of the class will also be registered.
 */
export function registerComponent<C extends Component<any>>(asName?: string) {
  return function (this: unknown, component: Class<C>): void {
    const componentClass = component as unknown as typeof Component
    const componentName = asName ?? componentClass.name
    if (registeredComponents[componentName]) {
      error(`A gui component with the name "${componentName}" is already registered`)
    }
    registeredComponents[componentName] = component
    componentClass.__componentName = componentName
    registerFuncs(componentClass, componentName)

    const binds = new LuaTable<Function, keyof any | undefined>()
    for (const [key, value] of pairs(componentClass.prototype)) {
      if (typeof value === "function") {
        binds.set(value, key)
      }
    }
    componentClass.__funcNames = binds

    vlog("registered class1", componentName)
  }
}

function getRegisteredComponent(name: string): Class<Component<unknown>> {
  const componentClass = registeredComponents[name]
  if (!componentClass) {
    error(
      `Component class with name ${tostring(
        name
      )} not found. Did you register the class and perform migrations properly?`
    )
  }
  return componentClass
}

export function getRegisteredComponentName<C extends Component<unknown>>(componentClass: Class<C>): string | undefined {
  return (componentClass as unknown as typeof Component).__componentName
}

export function componentNew(componentName: string): Component<unknown> {
  const componentClass = getRegisteredComponent(componentName)
  const instance = new componentClass()
  instance.__componentName = componentName
  return instance
}

export function getComponentInstance(id: number): Component<unknown> {
  const instance = global.componentInstances[id]
  if (!instance) {
    error(`Could not find instance with id ${id}. Could it have been gc'ed?`)
  }
  if (!Component.__isValid!(instance)) {
    error(
      "Tried to reference an invalid component (destroyed or not yet ready)." +
        `id ${id}, type "${instance.__componentName}"`
    )
  }
  return instance
}
