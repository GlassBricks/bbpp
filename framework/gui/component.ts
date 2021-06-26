import { AnySpec } from "./spec"
import { FuncRef, registerFuncs } from "../funcRef"
import { dlog, userWarning } from "../logging"
import { registerHandlers } from "../events"
import { isValid } from "../util"

type DeferProps<Props> = {
  deferProps: true
  key: string
} & Pick<Props, ReadonlyKeys<Props>>

type UpdateOnlyProps<Props> = {
  updateOnly: true
  key: string
} & Partial<Props>

export interface ComponentBoundFunc<F extends Function> {
  componentId: number
  funcName: string
  "#funcType"?: F
}

export type ComponentFunc<F extends Function> = FuncRef<F> | ComponentBoundFunc<F>

const binderMeta = {
  __index(this: { id: number }, name: string): ComponentBoundFunc<any> {
    return {
      componentId: this.id,
      funcName: name,
    }
  },
} as LuaMetatable<{ id: number }>

function createBinder(id: number): Binder<any> {
  return setmetatable({ id }, binderMeta) as any
}

export type Binder<T> = {
  readonly [K in keyof T]: T[K] extends Function ? ComponentBoundFunc<T[K]> : never
}

export abstract class Component<Props> {
  props!: Props
  firstGuiElement!: LuaGuiElement
  parentGuiElement!: LuaGuiElement

  readonly id: number
  readonly refs: Binder<this>

  // noinspection JSUnusedLocalSymbols
  private ____props!: DeferProps<Props> | UpdateOnlyProps<Props> | Props

  constructor() {
    const g = global
    this.id = g.nextComponentInstanceId
    g.nextComponentInstanceId++
    g.componentInstanceTypes.set(this, this.constructor.name)
    g.componentInstanceById[this.id] = this

    this.refs = createBinder(this.id)
  }

  abstract update(): AnySpec | undefined

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  create(props: ReadonlyVals<Props>): AnySpec | undefined {
    return undefined
  }

  /**
   * Called before UPDATES to determine if this component should actually update.
   * Does not call on first update (after create).
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  shouldComponentUpdate(nextProps: Props): boolean {
    return true
  }
}

export abstract class StaticComponent extends Component<Empty> {
  abstract create(): AnySpec | undefined

  update(): AnySpec | undefined {
    return undefined
  }

  shouldComponentUpdate(): boolean {
    return false
  }
}

const registeredComponents: Record<string, Class<Component<unknown>>> = {}

/**
 * Registers a gui component class. All components must be registered to be used.
 * The _name_ of the class should be persistent through versions/reloads.
 *
 * All _static_ functions of the class will also be registered.
 */
export function registerComponent<T extends Component<any>>(component: Class<T>): void {
  const componentName = component.name
  if (registeredComponents[componentName]) {
    error(`A gui component with the name "${componentName}" is already registered`)
  }
  registeredComponents[componentName] = component
  registerFuncs(component, componentName)
  // noinspection JSUnusedGlobalSymbols
  dlog("registered component", componentName)
}

function getRegisteredComponent(name: string): Class<Component<unknown>> {
  const clazz = registeredComponents[name]
  if (!clazz) {
    error(`Component class of name ${name} not found. Did you register the class and perform migrations properly?`)
  }
  return clazz
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
    setmetatable(instance.refs, binderMeta)
  }
}

registerHandlers({
  on_init() {
    global.nextComponentInstanceId = 0
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
      Make sure migrations are working and/or 'this' is not leaked except to element children. 
      Please report this to the mod author.`
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
  ;(func as (...arg: A) => void).call(instance, ...args)
}
