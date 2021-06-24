import { AnySpec } from "./spec"
import { registerFuncs } from "../funcRef"
import { dlog } from "../logging"
import { registerHandlers } from "../events"

// noinspection JSUnusedLocalSymbols
export abstract class Component<Props = Empty> {
  parentGuiElement!: LuaGuiElement
  private ____props!: DeferProps<Props> | UpdateOnlyProps<Props> | Props

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  create(props: ReadonlyVals<Props>): AnySpec | undefined {
    return undefined
  }

  abstract update(props: Props): AnySpec | undefined

  /**
   * Called before UPDATES to determine if this component should actually update.
   * Does not call on first update (after create).
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  shouldComponentUpdate(prevProps: Props, nextProps: Props): boolean {
    return true
  }
}

export type DeferProps<Props> = {
  deferProps: true
  key: string
} & Pick<Props, ReadonlyKeys<Props>>

export type UpdateOnlyProps<Props> = {
  updateOnly: true
  key: string
} & Partial<Props>

declare const global: {
  componentInstances: LuaTable<any, string>
}

function restoreMetatables() {
  // weak table for defensive programming
  setmetatable(global.componentInstances, { __mode: "k" })
  for (const [instance, componentName] of pairs(global.componentInstances)) {
    const prototype = getRegisteredComponent(componentName).prototype
    setmetatable(instance, prototype)
  }
}

registerHandlers({
  on_init() {
    global.componentInstances = setmetatable(new LuaTable(), { __mode: "k" })
  },
  on_load() {
    restoreMetatables()
  },
})

// for now, components are just fancy collections of functions. I might change in the future if state is supported,
// but for now, it's just this.
const registeredComponents: Record<string, Class<Component<unknown>>> = {}

/**
 * Registers a gui component class. All components must be registered to be used.
 * The _name_ of the class should be persistent through versions/reloads.
 *
 * All _static_ functions of the class will also be registered.
 *
 * @param componentClass
 */
export function registerComponent(componentClass: Class<Component<any>>): void {
  const componentName = componentClass.name
  if (registeredComponents[componentName]) {
    error(`A gui component with the name "${componentName}" is already registered`)
  }
  registeredComponents[componentName] = componentClass
  registerFuncs(componentClass, componentName + ".")
  dlog("registered component", componentName)
}

function getRegisteredComponent(name: string): Class<Component<unknown>> {
  const clazz = registeredComponents[name]
  if (!clazz) {
    error(`Component class of name ${name} not found. Did you register the class and perform migrations properly?`)
  }
  return clazz
}

/**
 * Safely creates a new component from a componentName (the metatable will be restored on_load).
 */
export function componentNew(componentName: string): Component<unknown> {
  const componentClass = getRegisteredComponent(componentName)
  const instance = new componentClass()
  global.componentInstances.set(instance, componentName)
  return instance
}
