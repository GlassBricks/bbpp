/** @noSelfInFile */
import { registerHandlers } from "../events"
import { AnySpec, ComponentSpec, ElementSpec } from "./spec"
import { Component, componentNew, Refs } from "./component"
import { destroyIfValid, isEmpty, isValid } from "../util"

const isGuiElementType: Record<GuiElementType, true> & Record<any, boolean> = {
  "choose-elem-button": true,
  "drop-down": true,
  "empty-widget": true,
  "entity-preview": true,
  "list-box": true,
  "scroll-pane": true,
  "sprite-button": true,
  "tabbed-pane": true,
  "text-box": true,
  button: true,
  camera: true,
  checkbox: true,
  flow: true,
  frame: true,
  label: true,
  line: true,
  minimap: true,
  progressbar: true,
  radiobutton: true,
  slider: true,
  sprite: true,
  switch: true,
  tab: true,
  table: true,
  textfield: true,
}

// <editor-fold desc="Instance">
interface BaseInstance {
  type: string | undefined
  name: string | number
  guiElement: LuaGuiElement
  ref: string | number | undefined
}

interface ElementInstance extends BaseInstance {
  type: GuiElementType
  childSpecs: AnySpec[]
  childInstances: NonNilInstance[]
  keyToLuaIndex?: PRecord<string | number, number>
  elementMod: ModOf<LuaGuiElement>
  styleMod: ModOf<LuaStyle>
}

interface ComponentInstance extends BaseInstance {
  type: string
  publicInstance: Component<unknown>

  parentGuiElement: LuaGuiElement
  indexInParent: number

  childInstance: AnyInstance
}

// for use in components that return nil on update/create.
interface NilInstance {
  type?: undefined
  guiElement: EmptyWidgetGuiElement
  ref?: undefined
}

type NonNilInstance = ElementInstance | ComponentInstance
type AnyInstance = NonNilInstance | NilInstance

// </editor-fold>
// <editor-fold desc="Global">
interface ReactorioGlobal {
  reactorio: {
    rootInstances: PRecord<number, PRecord<string, NonNilInstance>>
    referencedGuiElements: PRecord<number, LuaGuiElement>
  }
}

declare const global: ReactorioGlobal

function cleanGlobal() {
  // clean rootInstances table
  const reactorio = global.reactorio
  for (const [index, element] of pairs(reactorio.referencedGuiElements)) {
    if (!element.valid) {
      reactorio.referencedGuiElements[index] = undefined
      reactorio.rootInstances[index] = undefined
    }
  }
}

registerHandlers({
  on_init() {
    global.reactorio = {
      rootInstances: {},
      referencedGuiElements: {},
    }
  },
  on_player_removed: cleanGlobal,
})

// </editor-fold>
// <editor-fold desc="Instantiate">

function getCreationSpec(element: ElementSpec, index?: number): AddSpec {
  const spec: Partial<AddSpec> = element.creationSpec || {}
  spec.type = element.type
  spec.index = index
  return spec as any
}

function instantiateElement(
  parent: LuaGuiElement,
  indexInParent: number,
  spec: ElementSpec,
  currentRefs: Refs
): ElementInstance {
  const guiElement = parent.add(getCreationSpec(spec, indexInParent))

  if (spec.onCreated) spec.onCreated(guiElement as any)
  const childSpecs = spec.children || []
  const childInstances: NonNilInstance[] = []
  const newInstance: ElementInstance = {
    type: spec.type,
    name: spec.name || indexInParent,
    childSpecs,
    guiElement,
    childInstances,
    ref: undefined, // will be set in updateElement
    elementMod: {}, // will be set in updateElement
    styleMod: {},
  }

  updateElement(guiElement, newInstance, spec, false, currentRefs)
  for (const [luaIndexInParent, child] of ipairs(childSpecs)) {
    childInstances[childInstances.length] = instantiate(guiElement, luaIndexInParent, child, currentRefs)
  }
  if (spec.onLateCreated) spec.onLateCreated(guiElement as any)
  if (spec.onLateUpdate) spec.onLateUpdate(guiElement as any)
  return newInstance
}

function instantiateComponent(
  parent: LuaGuiElement,
  indexInParent: number,
  spec: ComponentSpec<any>,
  currentRefs: Refs
): ComponentInstance {
  const publicInstance = componentNew(spec.type)
  publicInstance.parentGuiElement = parent
  if (spec.ref) {
    currentRefs[spec.ref] = publicInstance
  }

  const childRefs = publicInstance.refs
  const rendered = publicInstance.createWith(spec.props)
  const childInstance = instantiate(parent, indexInParent, rendered, childRefs)

  const newInstance: ComponentInstance = {
    publicInstance,
    childInstance,

    name: spec.name || indexInParent,
    type: spec.type,
    guiElement: childInstance.guiElement,
    parentGuiElement: parent,
    indexInParent: indexInParent,
    ref: spec.ref,
  }
  publicInstance.__internalInstance = newInstance

  updateComponent(parent, indexInParent, newInstance, spec, currentRefs)
  if (publicInstance.onCreated) publicInstance.onCreated()

  return newInstance
}

function instantiateEmpty(parent: LuaGuiElement, indexInParent: number): NilInstance {
  const guiElement = parent.add({ type: "empty-widget", index: indexInParent })
  return { guiElement }
}

// this overload just for type fun
function instantiate(parent: LuaGuiElement, indexInParent: number, spec: AnySpec, currentRefs: Refs): NonNilInstance
function instantiate(
  parent: LuaGuiElement,
  indexInParent: number,
  spec: AnySpec | undefined,
  currentRefs: Refs
): AnyInstance
function instantiate(
  parent: LuaGuiElement,
  indexInParent: number,
  spec: AnySpec | undefined,
  currentRefs: Refs
): AnyInstance {
  if (!spec || spec.type === "blank") {
    return instantiateEmpty(parent, indexInParent)
  } else if (isGuiElementType[spec.type]) {
    return instantiateElement(parent, indexInParent, spec as ElementSpec, currentRefs)
  } else {
    return instantiateComponent(parent, indexInParent, spec as ComponentSpec<any>, currentRefs)
  }
}

// </editor-fold>
// <editor-fold desc="Destroy and cleanup">
function destroyInstance(instance: AnyInstance, currentRefs: Refs | undefined): void {
  destroyIfValid(instance.guiElement)
  if (currentRefs) clearRefs(instance, currentRefs)
}

function clearRefs(instance: AnyInstance, refs: Refs): void {
  if (instance.ref) {
    refs[instance.ref] = undefined
  }
  if (instance.type && isGuiElementType[instance.type]) {
    for (const childInstance of (instance as ElementInstance).childInstances) {
      clearRefs(childInstance, refs)
    }
  }
}

// </editor-fold>
// <editor-fold desc="Update and reconcile">

// For updateOnly. prevMod is mutated.
function mergeMod<T>(target: T, prevMod: ModOf<T>, nextMod: ModOf<T>) {
  for (const [key, value] of pairs(nextMod)) {
    if (value !== prevMod[key]) {
      target[key] = value
      prevMod[key] = value
    }
  }
}

// For full reconcile. prevMod is only read, not updated.
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

function updateElement(
  guiElement: LuaGuiElement,
  instance: ElementInstance,
  spec: ElementSpec,
  updateOnly: boolean,
  currentRefs: Refs
) {
  if (updateOnly) {
    if (spec.elementMod) mergeMod(guiElement, instance.elementMod, spec.elementMod)
    if (spec.styleMod) mergeMod(guiElement.style, instance.styleMod, spec.styleMod)
  } else {
    const nextElementMod = spec.elementMod || {}
    const nextStyleMod = spec.styleMod || {}
    applyMod(guiElement, instance.elementMod, nextElementMod)
    applyMod(guiElement.style, instance.styleMod, nextStyleMod)
    instance.elementMod = nextElementMod
    instance.styleMod = nextStyleMod
  }
  if (instance.ref) currentRefs[instance.ref] = undefined
  if (spec.ref) currentRefs[spec.ref] = guiElement
  instance.ref = spec.ref

  if (spec.onUpdate) spec.onUpdate(guiElement as any)
}

function getKeyToLuaIndex(childSpecs: AnySpec[]) {
  const keyToLuaIndex: PRecord<string | number, number> = {}
  for (const [luaIndex, childComponent] of ipairs(childSpecs)) {
    const key = childComponent.name || luaIndex // indexInParent
    if (keyToLuaIndex[key]) {
      error(`Multiple children with same key ${key} found.`)
    }
    keyToLuaIndex[key] = luaIndex
  }
  return keyToLuaIndex
}

/**
 * This includes children reconciliation.
 *
 * The only available operations are to delete and add at index, no rearranging elements.
 * The reconciliation algorithm matches by name. If no keyed elements are _rearranged_ (only added or deleted),
 * then this is most optimal; else it may delete some other keyed elements to reuse a keyed element.
 *
 * This definitely has room for (constant time) optimization.
 */
// same name, same type, updateOnly = false, mutates instance
function reconcileChildren(instance: ElementInstance, spec: ElementSpec, currentRefs: Refs): ElementInstance {
  // update children
  const guiElement = instance.guiElement
  const oldChildInstances = instance.childInstances
  const newChildInstances: NonNilInstance[] = []
  const newChildSpecs = spec.children || []
  const oldKeyToLuaIndex = instance.keyToLuaIndex || getKeyToLuaIndex(instance.childSpecs)
  const newKeyToLuaIndex = getKeyToLuaIndex(newChildSpecs)
  const oldChildrenLength = oldChildInstances.length

  // iterate through both the old elements and the new instances at once. Try to match new elements
  // with old elements in order, deleting and adding as needed.
  // If elements are REARRANGED, then existing elements between the old position and new position of the earliest
  // appearing element (in new elements) are deleted, regardless of any matching keyed elements that already existed
  // there (those elements are re-instantiated). Otherwise, every keyed element is reused.
  let oldLuaIndex = 1
  for (const [newLuaIndex, newSpec] of ipairs(newChildSpecs)) {
    // blank spec is not allowed in full update; only updateOnly
    if (newSpec.type === "blank") error("Blank element is only allowed in updateOnly mode, not in full-update.")
    const key = newSpec.name || newLuaIndex

    const existingLuaIndex = oldKeyToLuaIndex[key]
    // element with matching name?
    if (existingLuaIndex && oldLuaIndex <= existingLuaIndex) {
      // delete everything from here to the matching element.
      // If this includes keyed elements, treat them as if they didn't exist (re-instantiate them later).
      while (oldLuaIndex !== existingLuaIndex) {
        const deletingInstance = oldChildInstances[oldLuaIndex - 1]
        oldKeyToLuaIndex[deletingInstance.name] = undefined // don't match deleted elements for future keyed children
        destroyInstance(deletingInstance, currentRefs)
        oldLuaIndex++
      }
      // update the instance.
      newChildInstances[newLuaIndex - 1] = reconcile(
        guiElement,
        newLuaIndex,
        oldChildInstances[existingLuaIndex - 1],
        newSpec,
        currentRefs
      )
      oldLuaIndex++
    } else {
      // delete everything from the old elements that don't match a current element name.
      for (; oldLuaIndex <= oldChildrenLength; oldLuaIndex++) {
        const oldInstance = oldChildInstances[oldLuaIndex - 1]
        if (newKeyToLuaIndex[oldInstance.name]) break
        destroyInstance(oldInstance, currentRefs)
      }
      // add the element.
      newChildInstances[newLuaIndex - 1] = instantiate(guiElement, newLuaIndex, newSpec, currentRefs)
    }
  }
  // delete remaining elements, if any.
  for (; oldLuaIndex <= oldChildrenLength; oldLuaIndex++) {
    const oldInstance = oldChildInstances[oldLuaIndex - 1]
    destroyInstance(oldInstance, currentRefs)
  }

  // reuse past instance
  instance.childInstances = newChildInstances
  instance.keyToLuaIndex = newKeyToLuaIndex
  instance.childSpecs = newChildSpecs
  return instance
}

// same name, same type, updateOnly = true, mutates instance
function updateOnlyOnChildren(instance: ElementInstance, spec: ElementSpec, currentRefs: Refs): ElementInstance {
  const newChildElements = spec.children
  if (!newChildElements) return instance

  const guiElement = instance.guiElement
  const oldChildInstances = instance.childInstances
  const oldKeyToIndex = instance.keyToLuaIndex || getKeyToLuaIndex(instance.childSpecs)
  for (const [newLuaIndex, newSpec] of ipairs(newChildElements)) {
    // "blank" spec is allowed
    const key = newSpec.name || newLuaIndex
    const oldLuaIndex = oldKeyToIndex[key]
    if (oldLuaIndex === undefined) {
      error(`In updateOnly mode: cannot find element with key ${key}`)
    }
    const oldInstance = oldChildInstances[oldLuaIndex - 1]
    oldChildInstances[oldLuaIndex - 1] = reconcile(guiElement, oldLuaIndex, oldInstance, newSpec, currentRefs)
  }

  instance.keyToLuaIndex = oldKeyToIndex // keyToIndex should remain the same
  return instance
}

// same name, same type, mutates instance
function reconcileElement(
  instance: ElementInstance,
  spec: ElementSpec,
  updateOnly: boolean,
  currentRefs: Refs
): ElementInstance {
  // update this element
  updateElement(instance.guiElement, instance, spec, updateOnly, currentRefs)
  const nextInstance = updateOnly
    ? updateOnlyOnChildren(instance, spec, currentRefs)
    : reconcileChildren(instance, spec, currentRefs)
  if (spec.onLateUpdate) spec.onLateUpdate(instance.guiElement as any)
  return nextInstance
}

function updateComponent(
  parent: LuaGuiElement,
  indexInParent: number,
  instance: ComponentInstance,
  spec: ComponentSpec<any>,
  currentRefs: Refs
): void {
  instance.indexInParent = indexInParent

  const publicInstance = instance.publicInstance
  publicInstance.firstGuiElement = instance.guiElement

  if (instance.ref) currentRefs[instance.ref] = undefined
  if (spec.ref) currentRefs[spec.ref] = publicInstance
  instance.ref = spec.ref
}

// same name, same type
function reconcileComponent(
  parent: LuaGuiElement,
  indexInParent: number,
  instance: ComponentInstance,
  spec: ComponentSpec<any>,
  currentRefs: Refs
): ComponentInstance {
  updateComponent(parent, indexInParent, instance, spec, currentRefs)

  instance.publicInstance.updateProps(spec.props)

  return instance
}

Component.__applySpec = function (this: void, component: Component<unknown>, spec: AnySpec | undefined) {
  const instance = component.__internalInstance as ComponentInstance
  const oldChildInstance = instance.childInstance
  const refs = instance.publicInstance.refs
  const childInstance = reconcile(instance.parentGuiElement, instance.indexInParent, oldChildInstance, spec, refs)
  component.firstGuiElement = childInstance.guiElement
  instance.guiElement = childInstance.guiElement
  instance.childInstance = childInstance
}

Component.__isValid = function (this: void, component: Component<unknown>) {
  const internalInstance = component.__internalInstance as ComponentInstance
  return internalInstance && isValid(internalInstance.guiElement)
}

// same name, not null

function reconcile(
  parent: LuaGuiElement,
  indexInParent: number,
  oldInstance: NonNilInstance,
  spec: AnySpec,
  currentRefs: Refs
): NonNilInstance
function reconcile(
  parent: LuaGuiElement,
  indexInParent: number,
  oldInstance: AnyInstance,
  spec: AnySpec | undefined,
  currentRefs: Refs
): AnyInstance
function reconcile(
  parent: LuaGuiElement,
  indexInParent: number,
  oldInstance: AnyInstance,
  spec: AnySpec | undefined,
  currentRefs: Refs
): AnyInstance {
  const isUpdateOnly = spec !== undefined && (spec.type === "blank" || (spec as any).updateOnly)
  const specType = spec && (spec.type === "blank" ? oldInstance.type : spec.type)
  if (oldInstance === undefined) {
    // new
    return instantiate(parent, indexInParent, spec, currentRefs)
  } else if (oldInstance.type !== specType) {
    // replace
    if (isUpdateOnly) {
      error(`Types much match in update only mode. Old type: ${oldInstance.type}, New type: ${specType}`)
    }
    destroyInstance(oldInstance, currentRefs)
    return instantiate(parent, indexInParent, spec, currentRefs)
  }
  // update
  if (specType === undefined) {
    return oldInstance as NilInstance
  } else {
    if (spec && isGuiElementType[specType]) {
      return reconcileElement(oldInstance as ElementInstance, spec as ElementSpec, isUpdateOnly, currentRefs)
    } else {
      return reconcileComponent(
        parent,
        indexInParent,
        oldInstance as ComponentInstance,
        spec as ComponentSpec<unknown>,
        currentRefs
      )
    }
  }
}

// </editor-fold>

// <editor-fold desc="Render">

/**
 * Renders elements a container.
 *
 * A `id` must be given to refer for future updates.
 *
 * To destroy the element with proper cleanup, or if the elements were destroyed externally, use {@link destroyIn}.
 *
 * For a more managed way of handling dialogues and windows, see `Window`.
 *
 * @return Refs refs from the given spec
 */
export function renderIn(parent: LuaGuiElement, id: string, spec: AnySpec, refs: Refs = {}): Refs {
  const reactorio = global.reactorio
  let existingSet = reactorio.rootInstances[parent.index]
  const prevInstance = existingSet && existingSet[id]
  const nextInstance = prevInstance
    ? reconcile(parent, 0, prevInstance, spec, refs)
    : instantiate(parent, 0, spec, refs)
  if (!existingSet) {
    existingSet = {}
    reactorio.rootInstances[parent.index] = existingSet
    reactorio.referencedGuiElements[parent.index] = parent
  }
  existingSet[id] = nextInstance

  return refs
}

/**
 * Renders elements a container, and stores no information for future updates. **Future updates, and component functions
 * from components created this way will not work unless the component instance is stored externally (using refs).**
 *
 * @return Refs refs from the given spec
 */
export function simpleCreateIn(parent: LuaGuiElement, specs: AnySpec[], refs: Refs = {}): Refs {
  for (const spec of specs) {
    instantiate(parent, 0, spec, refs)
  }
  return refs
}

/**
 * Properly disposes of a gui rendered using {@link renderIn}.
 *
 * @return boolean if the element was present and successfully destroyed
 */
export function destroyIn(parent: LuaGuiElement, id: string): boolean {
  const reactorio = global.reactorio
  const existingSet = reactorio.rootInstances[parent.index]
  if (existingSet && existingSet[id]) {
    destroyInstance(existingSet[id]!, undefined)
    existingSet[id] = undefined
    if (isEmpty(existingSet)) {
      reactorio.rootInstances[parent.index] = undefined
      reactorio.referencedGuiElements[parent.index] = undefined
    }
    return true
  }
  return false
}

export function exists(parent: LuaGuiElement, id: string): boolean {
  const reactorio = global.reactorio
  const existingSet = reactorio.rootInstances[parent.index]
  return !!(existingSet && existingSet[id])
}

// </editor-fold>
