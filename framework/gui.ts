import { EventHandlerContainer, PayloadOf, registerHandlers } from "./events"
import { getFuncName, getFuncOrNil } from "./funcRef"
import { dlog, userWarning } from "./logging"

/*
Terminology:
LuaElement = LuaGuiElement (to disambiguate from "Element", below)
Spec = GuiSpec; the table that is passed to LuaGuiElement::add.
LuaElementSpec = LuaGui element spec
FC = functional component
Element = LuaElementSpec or functional component (returned by JSX, given to render)
ElementInstance = virtual dom instance of an Element
 */

// <editor-fold desc="Component Spec">
// element
type GuiEventHandlers<Element extends BaseGuiElement> = {
  [N in GuiEventName]?: (element: Element, payload: PayloadOf<typeof guiEventNameMapping[N]>) => void
}
// This type is separate from LuaElementSpecOfType as it is used by jsx.ts
export type LuaElementSpecProps<Element extends BaseGuiElement> = GuiEventHandlers<Element> & {
  onCreated?: (element: Element) => void
  onUpdate?: (element: Element) => void
  onAction?: (element: Element, payload: AnyGuiEventPayload) => void

  styleMod?: ModOf<LuaStyle>
  key?: string
}

export type LuaElementSpecOfType<Type extends GuiElementType> = LuaElementSpecProps<GuiElementOfType<Type>> & {
  creationSpec: Omit<GuiSpecOfType<Type>, "type" | "index">
  elementMod?: ModOf<GuiElementOfType<Type>>
  children?: ElementSpec[]
  type: Type
}

export type LuaElementSpec = {
  [T in GuiElementType]: LuaElementSpecOfType<T>
}[GuiElementType]

// FC
export type FC<Props = Record<string, never>> = (props: Props) => ElementSpec

export type FCSpec<Props> = {
  type: FC<Props>
  props: Props
  shouldUpdate?: boolean
  key?: string
}

export type ElementSpec = LuaElementSpec | FCSpec<any>
// </editor-fold>
// <editor-fold desc="Rendering">
// <editor-fold desc="Instance">
interface BaseInstance {
  luaElement: LuaGuiElement
  key: string | number
}

interface LuaElementInstance extends BaseInstance {
  element: LuaElementSpec
  childInstances: ElementInstance[]
  keyToIndex?: PRecord<string | number, number>
}

interface FCInstance extends BaseInstance {
  element: FCSpec<unknown>
  childInstance: ElementInstance
}

type ElementInstance = LuaElementInstance | FCInstance
// </editor-fold>

// <editor-fold desc="Instantiate">
function instantiateLuaElement(
  parent: LuaGuiElement,
  indexInParent: number,
  element: LuaElementSpec
): LuaElementInstance {
  const luaElement = parent.add(getSpec(element, indexInParent))

  if (element.onCreated) element.onCreated(luaElement as any)
  updateInstance(luaElement, {} as LuaElementSpec, element)

  const children = element.children || []
  const childInstances: ElementInstance[] = []
  for (const [, child] of ipairs(children)) {
    childInstances[childInstances.length] = instantiate(luaElement, indexInParent, child)
  }
  return {
    element,
    luaElement,
    childInstances,
    key: element.key || indexInParent,
  }
}

// empty components not supported yet
function instantiateFC(parent: LuaGuiElement, indexInParent: number, element: FCSpec<unknown>): FCInstance {
  const rendered = element.type(element.props)
  const childInstance = instantiate(parent, indexInParent, rendered)
  const luaElement = childInstance.luaElement

  return {
    luaElement,
    element,
    childInstance,
    key: element.key || indexInParent,
  }
}

function instantiate(parent: LuaGuiElement, indexInParent: number, element: ElementSpec): ElementInstance {
  const type = element.type
  if (typeof type === "string") {
    return instantiateLuaElement(parent, indexInParent, element as LuaElementSpec)
  } else {
    return instantiateFC(parent, indexInParent, element as FCSpec<unknown>)
  }
}

/**
 * Only _creates_ a new gui element from a ElementSpec. Does not support updating.
 *
 * You do NOT need to use {@link destroy} on the returned element for proper cleanup.
 *
 * @return LuaGuiElement the topmost created lua gui element.
 */
export function create(parent: LuaGuiElement, component: ElementSpec): LuaGuiElement {
  return instantiate(parent, 0, component).luaElement
}

// </editor-fold>
// <editor-fold desc="Update and reconcile">
function applyMod<T>(target: T, prevMod: ModOf<T>, nextMod: ModOf<T>) {
  // in nextMod, different from prevMod
  for (const [key, value] of pairs(nextMod)) {
    if (value !== prevMod[key]) {
      target[key] = value
    }
  }
  // in prevMod but not in nextMod (should set to nil)
  for (const [key] of pairs(prevMod)) {
    if (nextMod[key] === undefined) {
      target[key] = undefined as any
    }
  }
}

function updateInstance(luaElement: LuaGuiElement, oldElement: LuaElementSpec, newElement: LuaElementSpec) {
  applyMod(luaElement, oldElement.elementMod || {}, newElement.elementMod || {})
  applyMod(luaElement.style, oldElement.styleMod || {}, newElement.styleMod || {})
  luaElement.tags = getTags(newElement)
  if (newElement.onUpdate) newElement.onUpdate(luaElement as any)
}

function getKeyToIndex(element: LuaElementSpec) {
  const childComponents = element.children || []
  const keyToIndex: PRecord<string | number, number> = {}
  for (let i = 0; i < childComponents.length; i++) {
    const childComponent = childComponents[i]
    const key = childComponent.key || i + 1 // indexInParent
    if (keyToIndex[key]) {
      dlog(`Children with same key ${key} found, this may cause issues`)
    }
    keyToIndex[key] = i
  }
  return keyToIndex
}

/**
 * This includes children reconciliation.
 *
 * The only available operations are to delete and add at index, no rearranging elements.
 * The reconciliation algorithm matches by key. If no keyed elements are _rearranged_ (only added or deleted), then this
 * is most optimal; else it may delete some other keyed elements to reuse a keyed element.
 *
 * This definitely has room for (constant time) optimization.
 */
function reconcileTemplate(instance: LuaElementInstance, template: LuaElementSpec): LuaElementInstance {
  // update this instance
  updateInstance(instance.luaElement, instance.element, template)

  // update children
  const luaElement = instance.luaElement
  const oldChildInstances = instance.childInstances || []
  const newChildInstances: ElementInstance[] = []
  const newChildElements: ElementSpec[] = template.children || []
  const oldKeyToIndex = instance.keyToIndex || getKeyToIndex(instance.element)
  const nextKeyToIndex = getKeyToIndex(template)

  // iterate through both the old elements and the new instances at once. Try to match new elements
  // with old elements in order, deleting and adding as needed.
  // If elements are REARRANGED, then existing elements between the old position and new position are deleted, regardless
  // of any matching keyed elements that already existed there (those elements are re-instantiated).
  // Otherwise, every keyed element is reused.
  let oldIndex = 0
  for (let newIndex = 0; newIndex < newChildElements.length; newIndex++) {
    const newElement = newChildElements[newIndex]
    const key = newElement.key || newIndex + 1

    const existingIndex = oldKeyToIndex[key]
    // element with matching key?
    if (existingIndex && oldIndex <= existingIndex) {
      // delete everything from here to the matching element.
      // If this includes keyed elements, treat them as if they didn't exist (re-instantiate them later).
      while (oldIndex !== existingIndex) {
        const deletingInstance = oldChildInstances[oldIndex]
        oldKeyToIndex[deletingInstance.key] = undefined // don't match deleted elements for future keyed children
        deletingInstance.luaElement.destroy()
        oldIndex++
      }
      // update the instance.
      newChildInstances[newIndex] = reconcile(luaElement, newIndex + 1, oldChildInstances[existingIndex], newElement)
      oldIndex++
    } else {
      // delete everything from the old elements that don't match a current element key.
      while (oldIndex < oldChildInstances.length) {
        const oldInstance = oldChildInstances[oldIndex]
        if (nextKeyToIndex[oldInstance.key]) break
        oldInstance.luaElement.destroy()
        oldIndex++
      }
      // add the element.
      newChildInstances[newIndex] = instantiate(luaElement, newIndex + 1, newElement)
    }
  }
  // delete remaining elements, if any.
  for (; oldIndex < oldChildInstances.length; oldIndex++) {
    const oldInstance = oldChildInstances[oldIndex]
    oldInstance.luaElement.destroy()
  }

  // reuse past instance
  instance.childInstances = newChildInstances
  instance.keyToIndex = nextKeyToIndex
  instance.element = template
  return instance
}

function reconcileFC(
  instance: FCInstance,
  element: FCSpec<unknown>,
  parent: LuaGuiElement,
  indexInParent: number
): FCInstance {
  // TODO: better should update
  const shouldUpdate = element.shouldUpdate !== false
  if (!shouldUpdate) return instance
  const rendered = element.type(element.props)
  const oldChildInstance = instance.childInstance
  const childInstance = reconcile(parent, indexInParent, oldChildInstance, rendered)!
  instance.luaElement = childInstance.luaElement
  instance.childInstance = childInstance
  instance.element = element
  return instance
}

// elements should already have same key (or be root element).
function reconcile(
  parent: LuaGuiElement,
  indexInParent: number,
  oldInstance: ElementInstance | undefined,
  element: ElementSpec
): ElementInstance {
  if (oldInstance === undefined) {
    // new
    return instantiate(parent, indexInParent, element)
  } else if (oldInstance.element.type !== element.type) {
    // replace
    oldInstance.luaElement.destroy()
    return instantiate(parent, indexInParent, element)
  } else if (typeof element.type === "string") {
    // update template
    return reconcileTemplate(oldInstance as LuaElementInstance, element as LuaElementSpec)
  } else {
    // update FC
    return reconcileFC(oldInstance as FCInstance, element as FCSpec<unknown>, parent, indexInParent)
  }
}

// </editor-fold>

// <editor-fold desc="Render">
declare const global: {
  rootInstances: Record<number, ElementInstance | undefined>
  referencedElements: Record<number, LuaGuiElement | undefined>
}

function cleanGlobal() {
  // clean rootInstances table
  // if things are handled properly this wouldn't be necessary, but defensive programming
  // also, size of this table is not expected to be too large
  for (const [index, element] of pairs(global.referencedElements)) {
    if (!element.valid) {
      global.referencedElements[index] = undefined
      global.rootInstances[index] = undefined
    }
  }
}

registerHandlers({
  on_init() {
    global.rootInstances = {}
    global.referencedElements = {}
  },
  on_load: cleanGlobal,
  on_player_removed: cleanGlobal,
})

function render(parent: LuaGuiElement, existing: LuaGuiElement | undefined, element: ElementSpec): ElementInstance {
  const prevInstance = existing && global.rootInstances[existing.index]
  const nextInstance = reconcile(parent, 0, prevInstance, element)
  if (prevInstance) {
    global.rootInstances[existing!.index] = undefined
    global.referencedElements[existing!.index] = undefined
  }
  const luaElement = existing || nextInstance.luaElement
  global.rootInstances[luaElement.index] = nextInstance
  global.referencedElements[luaElement.index] = luaElement
  return nextInstance
}

/**
 * Renders an element inside a container.
 *
 * In order to destroy properly, use the {@link destroy} function on the returned LuaGuiElement.
 *
 * If you only want to create something but don't need to update it, you can use {@link create} instead.
 *
 *
 * @return GuiElement the first lua gui element. You can use {@link rerenderSelf} on this element for future updates.
 *  You should pass this into {@link destroy} to destroy properly.
 *
 */
export function renderIn(parent: LuaGuiElement, name: string, component: ElementSpec): LuaGuiElement {
  const instance = render(parent, parent.get(name), component)
  const element = instance.luaElement
  element.name = name // todo: this causes problems. Do better stuff?
  return element
}

/**
 * Updates rendering on an existing rendered element, obtained from {@link renderIn}
 */
export function rerenderSelf(existingElement: LuaGuiElement, component: ElementSpec): void {
  render(existingElement.parent, existingElement, component)
}

/**
 * Properly disposes of a gui element tree created using {@link renderIn}.
 */
export function destroy(existingElement: LuaGuiElement): void {
  global.rootInstances[existingElement.index] = undefined
  global.referencedElements[existingElement.index] = undefined
  existingElement.destroy()
}

// </editor-fold>

// <editor-fold desc="Extract Spec">

function getSpec(template: LuaElementSpec, index?: number): GuiSpec {
  const spec: Partial<GuiSpec> = template.creationSpec
  spec.type = template.type
  spec.index = index
  return spec as GuiSpec
}

const guiEventHandlersTag = "#guiEventHandlers"

// adds guiEventHandlers tags
function getTags(template: LuaElementSpec): Tags {
  const handlers: Record<string, string> = {}

  let name: GuiEventName
  for (name in guiEventNameMapping) {
    const handler = template[name] as AnyFunction
    if (handler) {
      handlers[name] = getFuncName(handler) ?? error(`The function for ${name} was not a registered function ref`)
    }
  }
  if (template.onAction) {
    const funcName =
      getFuncName(template.onAction) ?? error("The function for onAction was not a registered function ref")
    const eventName = onActionEvents[template.type]
    if (!eventName) {
      throw `GUI element of type ${template.type} does not have an onAction event.
      Tried to register function "${funcName}".`
    }
    if (handlers[eventName]) {
      throw `Cannot register 'onAction' handler "${funcName}" because
      this element already has an event handler for ${eventName} ("${handlers[eventName]}").`
    }
    handlers[eventName] = funcName
  }
  const tags = (template.elementMod && template.elementMod.tags) || {}
  tags[guiEventHandlersTag] = handlers
  return tags
}

// </editor-fold>

// </editor-fold>
// <editor-fold desc="Gui events">
// some events have more fields
export interface AnyGuiEventPayload {
  element: LuaGuiElement
  player_index: number
}

export const guiEventNameMapping = {
  onCheckedStateChanged: "on_gui_checked_state_changed",
  onClick: "on_gui_click",
  onClosed: "on_gui_closed",
  onConfirmed: "on_gui_confirmed",
  onElemChanged: "on_gui_elem_changed",
  onLocationChanged: "on_gui_location_changed",
  onOpened: "on_gui_opened",
  onSelectedTabChanged: "on_gui_selected_tab_changed",
  onSelectionStateChanged: "on_gui_selection_state_changed",
  onSwitchStateChanged: "on_gui_switch_state_changed",
  onTextChanged: "on_gui_text_changed",
  onValueChanged: "on_gui_value_changed",
} as const
export type GuiEventName = keyof typeof guiEventNameMapping

const onActionEvents: PRecord<GuiElementType, GuiEventName> = {
  checkbox: "onCheckedStateChanged",
  "choose-elem-button": "onElemChanged",
  button: "onClick",
  "sprite-button": "onClick",
  "drop-down": "onSelectionStateChanged",
  textfield: "onTextChanged",
  "text-box": "onTextChanged",
  slider: "onValueChanged",
  switch: "onSwitchStateChanged",
}

function handleGuiEvent(eventName: GuiEventName, event: AnyGuiEventPayload) {
  // I want optional chaining!
  const element = event.element
  if (!element) return
  const handlers = element.tags[guiEventHandlersTag] as PRecord<string, string>
  if (!handlers) return
  const handlerName = handlers[eventName]
  if (!handlerName) return
  const ref = getFuncOrNil(handlerName)
  if (!ref) {
    userWarning(`There is no gui handler function named ${handlerName}.
    The mod author probably forgot to migrate something. If error persists, please report to the mod author.
    Event name: ${eventName}, event: ${serpent.dump(event)}`)
  } else {
    ref(element, event)
  }
}

const handlers: EventHandlerContainer = {}
for (const [name, gameName] of pairs(guiEventNameMapping)) {
  handlers[gameName] = (payload: any) => {
    handleGuiEvent(name, payload)
  }
}
registerHandlers(handlers)
// </editor-fold>
