/** @noSelfInFile */
import { AnySpec } from "./spec"
import { Funcs, funcsMeta, makeBindingFuncs, makeStaticFuncs, registerFuncs } from "../funcRef"
import { dlog } from "../logging"
import { registerHandlers } from "../events"
import { isValid } from "../util"
import { WithIsValid } from "../instanceRef"

export type Refs = PRecord<string | number, LuaGuiElement | Component<unknown>>

export abstract class Component<Props> implements WithIsValid {
  parentGuiElement!: LuaGuiElement
  private static readonly _staticFuncs: Funcs<unknown>
  firstGuiElement!: LuaGuiElement
  readonly refs: Refs = {}
  private static readonly _applySpec: (this: void, component: Component<unknown>, spec: AnySpec | undefined) => void

  readonly funcs: Funcs<this>
  _internalInstance: unknown
  protected props!: Props
  private isFirstUpdate: boolean = true

  constructor() {
    global.componentInstanceTypes.set(this, this.constructor.name)
    this.funcs = makeBindingFuncs(this)
  }

  static funcs<T extends Function>(this: T): Funcs<T> {
    return (this as unknown as typeof Component)._staticFuncs as Funcs<T>
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
    // see render.ts
    return this._internalInstance !== undefined && isValid((this._internalInstance as any).guiElement)
  }

  protected abstract create(): AnySpec | undefined

  protected applySpec(spec: AnySpec | undefined): void {
    Component._applySpec(this, spec)
  }

  protected abstract update(prevProps: Props, firstUpdate: boolean): void

  protected getPlayer(): LuaPlayer {
    return game.get_player(this.parentGuiElement.player_index)
  }
}

/**
 * A component where you handle creation/updates manually in the `updateAllPlayers` function
 */
export abstract class ManagedComponent<Props> extends Component<Props> {
  create(): AnySpec | undefined {
    return undefined
  }
}

/**
 * A component which is the same every time; i.e. only `create`, nothing on `updateAllPlayers`
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
const componentNames: LuaTable<Class<Component<unknown>>, string | undefined> = new LuaTable()

export type PropsOf<C extends Component<any>> = C extends Component<infer P> ? P : never

/**
 * Registers a gui component class. All components must be registered to be used.
 * The _name_ of the class should be persistent through versions/reloads.
 *
 * All _static_ functions of the class will also be registered.
 */
export function registerComponent<C extends Component<any>>(asName?: string) {
  return function (this: unknown, component: Class<C>): void {
    const componentName = asName ?? component.name
    if (registeredComponents[componentName]) {
      error(`A gui component with the name "${componentName}" is already registered`)
    }
    registeredComponents[componentName] = component
    componentNames.set(component, componentName)
    registerFuncs(component, componentName)
    ;(component as any)._staticFuncs = makeStaticFuncs(component)
    dlog("registered component", componentName)
  }
}

function getRegisteredComponent(name: string): Class<Component<unknown>> {
  const componentClass = registeredComponents[name]
  if (!componentClass) {
    error(`Component class with name ${name} not found. Did you register the class and perform migrations properly?`)
  }
  return componentClass as any
}

export function getComponentName<C extends Component<unknown>>(component: Class<C>): string | undefined {
  return componentNames.get(component)
}

interface ComponentsGlobal {
  componentInstanceTypes: LuaTable<Component<unknown>, string>
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
    global.componentInstanceTypes = setmetatable(new LuaTable(), {
      __mode: "k",
    })
  },
  on_load: restoreMetatables,
})

export function componentNew(componentName: string): Component<unknown> {
  const componentClass = getRegisteredComponent(componentName)
  return new componentClass()
}
