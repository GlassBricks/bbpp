import { AnySpec } from "./spec"
import { registerFunc, registerFuncs } from "../funcRef"
import { dlog } from "../logging"

interface ComponentClassInternal {
  protoFunctions: Record<string, Function>
}

export abstract class Component<Props> {
  props!: Props
  parentGuiElement!: LuaGuiElement

  abstract render(): AnySpec

  shouldComponentUpdate(nextProps: Props): boolean {
    return true
  }
}

// for now, components are just fancy collections of functions. I might change in the future if state is supported,
// but for now, it's just this.
const registeredComponents: Record<string, Class<Component<unknown>>> = {}

export function getRegisteredComponent(name: string): Class<Component<unknown>> {
  const clazz = registeredComponents[name]
  if (!clazz) {
    error(`Component class of name ${name} not found. Did you register the class perform migrations properly?`)
  }
  return clazz
}

/**
 * Registers a gui component class. All components must be registered to be used.
 * The _name_ of the class should be persistent through versions/reloads.
 *
 * All _static_ functions on the class will also be registered using {@link registerFunc}.
 * @param componentClass
 */
export function registerComponent(componentClass: Class<Component<unknown>>): void {
  const className = componentClass.name
  if (registeredComponents[className]) {
    error(`A gui component with the name "${className}" is already registered`)
  }
  registerFuncs(componentClass, className + ".")
  registeredComponents[className] = componentClass
  dlog("registered component", componentClass)
}
