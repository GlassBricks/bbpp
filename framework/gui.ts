import { EventHandlerContainer, PayloadOf, registerHandlers } from "./events"
import { getFunc, getFuncName, registerFunc } from "./funcRef"
import { dlog, userWarning } from "./logging"
import { isFunction } from "./util"

/*
Terminology:
GuiElement = LuaGuiElement (to disambiguate from "Element", below)
CreationSpec = GuiSpec; the table that is passed to LuaGuiElement::add.
ElementSpec = Actual DomElement spec
FC = functional component
AnySpec = Element or functional component spec (returned by JSX, given to render)
Instance = virtual dom instance of an Element
 */

// <editor-fold desc="Component Spec">
// element
type GuiEventHandlers<Element extends BaseGuiElement> = {
  [N in GuiEventName]?: (element: Element, payload: PayloadOf<typeof guiEventNameMapping[N]>) => void
}

// This type is separate from LuaElementSpecOfType as it is used by jsx.ts
export interface ElementSpecProps<Element extends BaseGuiElement> extends GuiEventHandlers<Element> {
  onCreated?: (element: Element) => void
  onUpdate?: (element: Element) => void
  onAction?: (element: Element, payload: AnyGuiEventPayload) => void

  styleMod?: ModOf<LuaStyle>
  key?: string
}

export interface ElementSpecOfType<Type extends GuiElementType> extends ElementSpecProps<GuiElementOfType<Type>> {
  creationSpec: Omit<GuiSpecOfType<Type>, "type" | "index">
  elementMod?: ModOf<GuiElementOfType<Type>>
  children?: AnySpec[]
  type: Type
}

export type ElementSpec = {
  [T in GuiElementType]: ElementSpecOfType<T>
}[GuiElementType]

// FC
export type FC<Props = Record<string, never>> = (props: Props) => AnySpec

export type FCSpec<Props> = {
  type: FC<Props>
  props: Props
  shouldUpdate?: boolean
  key?: string
}

export type AnySpec = ElementSpec | FCSpec<any>
// </editor-fold>
// <editor-fold desc="Rendering">
// <editor-fold desc="Instance">
interface BaseInstance {
  guiElement: LuaGuiElement
  key: string | number
}

interface ElementInstance extends BaseInstance {
  element: ElementSpec
  childInstances: Instance[]
  keyToIndex?: PRecord<string | number, number>
}

interface FCInstance extends BaseInstance {
  element: FCSpec<unknown>
  childInstance: Instance
}

type Instance = ElementInstance | FCInstance
// </editor-fold>

// <editor-fold desc="Instantiate">
function instantiateElement(parent: LuaGuiElement, indexInParent: number, element: ElementSpec): ElementInstance {
  const guiElement = parent.add(getCreationSpec(element, indexInParent))

  if (element.onCreated) element.onCreated(guiElement as any)
  updateElement(guiElement, {} as ElementSpec, element)

  const children = element.children || []
  const childInstances: Instance[] = []
  for (const [, child] of ipairs(children)) {
    childInstances[childInstances.length] = instantiate(guiElement, indexInParent, child)
  }
  return {
    element,
    guiElement,
    childInstances,
    key: element.key || indexInParent,
  }
}

// empty components not supported yet
function instantiateFC(parent: LuaGuiElement, indexInParent: number, element: FCSpec<unknown>): FCInstance {
  const rendered = element.type(element.props)
  const childInstance = instantiate(parent, indexInParent, rendered)
  const guiElement = childInstance.guiElement

  return {
    guiElement,
    element,
    childInstance,
    key: element.key || indexInParent,
  }
}

function instantiate(parent: LuaGuiElement, indexInParent: number, element: AnySpec): Instance {
  const type = element.type
  if (typeof type === "string") {
    return instantiateElement(parent, indexInParent, element as ElementSpec)
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
export function create(parent: LuaGuiElement, spec: AnySpec): LuaGuiElement {
  return instantiate(parent, 0, spec).guiElement
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

function updateElement(guiElement: LuaGuiElement, oldElement: ElementSpec, newElement: ElementSpec) {
  applyMod(guiElement, oldElement.elementMod || {}, newElement.elementMod || {})
  applyMod(guiElement.style, oldElement.styleMod || {}, newElement.styleMod || {})
  guiElement.tags = getTags(newElement)
  if (newElement.onUpdate) newElement.onUpdate(guiElement as any)
}

function getKeyToIndex(element: ElementSpec) {
  const childSpecs = element.children || []
  const keyToIndex: PRecord<string | number, number> = {}
  for (let i = 0; i < childSpecs.length; i++) {
    const childComponent = childSpecs[i]
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
function reconcileElement(instance: ElementInstance, element: ElementSpec): ElementInstance {
  // update this instance
  updateElement(instance.guiElement, instance.element, element)

  // update children
  const guiElement = instance.guiElement
  const oldChildInstances = instance.childInstances || []
  const newChildInstances: Instance[] = []
  const newChildElements: AnySpec[] = element.children || []
  const oldKeyToIndex = instance.keyToIndex || getKeyToIndex(instance.element)
  const nextKeyToIndex = getKeyToIndex(element)

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
        deletingInstance.guiElement.destroy()
        oldIndex++
      }
      // update the instance.
      newChildInstances[newIndex] = reconcile(guiElement, newIndex + 1, oldChildInstances[existingIndex], newElement)
      oldIndex++
    } else {
      // delete everything from the old elements that don't match a current element key.
      while (oldIndex < oldChildInstances.length) {
        const oldInstance = oldChildInstances[oldIndex]
        if (nextKeyToIndex[oldInstance.key]) break
        oldInstance.guiElement.destroy()
        oldIndex++
      }
      // add the element.
      newChildInstances[newIndex] = instantiate(guiElement, newIndex + 1, newElement)
    }
  }
  // delete remaining elements, if any.
  for (; oldIndex < oldChildInstances.length; oldIndex++) {
    const oldInstance = oldChildInstances[oldIndex]
    oldInstance.guiElement.destroy()
  }

  // reuse past instance
  instance.childInstances = newChildInstances
  instance.keyToIndex = nextKeyToIndex
  instance.element = element
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
  instance.guiElement = childInstance.guiElement
  instance.childInstance = childInstance
  instance.element = element
  return instance
}

// elements should already have same key (or be root element).
function reconcile(
  parent: LuaGuiElement,
  indexInParent: number,
  oldInstance: Instance | undefined,
  element: AnySpec
): Instance {
  if (oldInstance === undefined) {
    // new
    return instantiate(parent, indexInParent, element)
  } else if (oldInstance.element.type !== element.type) {
    // replace
    oldInstance.guiElement.destroy()
    return instantiate(parent, indexInParent, element)
  } else if (typeof element.type === "string") {
    // update element
    return reconcileElement(oldInstance as ElementInstance, element as ElementSpec)
  } else {
    // update FC
    return reconcileFC(oldInstance as FCInstance, element as FCSpec<unknown>, parent, indexInParent)
  }
}

// </editor-fold>

// <editor-fold desc="Render">
declare const global: {
  rootInstances: Record<number, Instance | undefined>
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

function render(parent: LuaGuiElement, existing: LuaGuiElement | undefined, element: AnySpec): Instance {
  const prevInstance = existing && global.rootInstances[existing.index]
  const nextInstance = reconcile(parent, 0, prevInstance, element)
  if (prevInstance) {
    global.rootInstances[existing!.index] = undefined
    global.referencedElements[existing!.index] = undefined
  }
  const guiElement = existing || nextInstance.guiElement
  global.rootInstances[guiElement.index] = nextInstance
  global.referencedElements[guiElement.index] = guiElement
  return nextInstance
}

/**
 * Renders elements a container.
 *
 * NOTE: the given `name` will override the name of the topmost lua gui element, always, in order to
 * refer to it for future updates.
 *
 * In order to destroy properly, use the {@link destroy} function on the returned LuaGuiElement.
 *
 * If you only want to create something but don't need to update it, you can use {@link create} instead.
 *
 * @return GuiElement the first lua gui element. You can use {@link rerenderSelf} on this element for future updates.
 *  You should pass this into {@link destroy} to destroy properly.
 */
// TODO: name better?
export function renderIn(parent: LuaGuiElement, name: string, spec: AnySpec): LuaGuiElement {
  const instance = render(parent, parent.get(name), spec)
  const element = instance.guiElement
  element.name = name
  return element
}

/**
 * Updates rendering on an existing rendered element, obtained from {@link renderIn}
 */
export function rerenderSelf(existingElement: LuaGuiElement, spec: AnySpec): void {
  render(existingElement.parent, existingElement, spec)
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

function getCreationSpec(element: ElementSpec, index?: number): GuiSpec {
  const spec: Partial<GuiSpec> = element.creationSpec
  spec.type = element.type
  spec.index = index
  return spec as GuiSpec
}

const guiEventHandlersTag = "#guiEventHandlers"

// adds guiEventHandlers tags
function getTags(element: ElementSpec): Tags {
  const handlers: Record<string, string> = {}

  let name: GuiEventName
  for (name in guiEventNameMapping) {
    const handler = element[name] as AnyFunction
    if (handler) {
      handlers[name] = getFuncName(handler) ?? error(`The function for ${name} was not a registered function ref`)
    }
  }
  if (element.onAction) {
    const funcName =
      getFuncName(element.onAction) ?? error("The function for onAction was not a registered function ref")
    const eventName = onActionEvents[element.type]
    if (!eventName) {
      throw `GUI element of type ${element.type} does not have an onAction event.
      Tried to register function "${funcName}".`
    }
    if (handlers[eventName]) {
      throw `Cannot register 'onAction' handler "${funcName}" because
      this element already has an event handler for ${eventName} ("${handlers[eventName]}").`
    }
    handlers[eventName] = funcName
  }
  const tags = (element.elementMod && element.elementMod.tags) || {}
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
  const ref = getFunc(handlerName)
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
