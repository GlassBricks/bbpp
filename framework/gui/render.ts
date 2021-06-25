import { registerHandlers } from "../events"
import { AnySpec, ComponentSpec, ElementSpec, NonNilSpec } from "./spec"
import { Component, componentNew } from "./component"
import { destroyIfValid } from "../util"

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
  key: string | number
}

interface ElementInstance extends BaseInstance {
  type: GuiElementType
  guiElement: LuaGuiElement
  childSpecs: AnySpec[]
  childInstances: NonNilInstance[]
  keyToLuaIndex?: PRecord<string | number, number>
  elementMod: ModOf<LuaGuiElement>
  styleMod: ModOf<LuaStyle>
}

interface ComponentInstance extends BaseInstance {
  type: string
  guiElement: LuaGuiElement
  publicInstance: Component<unknown>
  childInstance: AnyInstance
  props: unknown
  wasDeferProps?: boolean
}

// for use in components that return nil on update/create.
type NilInstance = {
  type?: undefined
  guiElement: EmptyWidgetGuiElement
}

type NonNilInstance = ElementInstance | ComponentInstance
type AnyInstance = NonNilInstance | NilInstance

// </editor-fold>
// <editor-fold desc="Global">
interface ReactorioGlobal {
  reactorio: {
    rootInstances: Record<number, AnyInstance | undefined>
    referencedGuiElements: Record<number, LuaGuiElement | undefined>
  }
}

declare const global: ReactorioGlobal

function cleanGlobal() {
  // clean rootInstances table
  const reactorio = global.reactorio
  for (const [index, element] of pairs(reactorio.referencedGuiElements)) {
    if (!element.valid) {
      const instance = reactorio.rootInstances[index]
      if (instance) destroyInstance(instance)
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

function getCreationSpec(element: ElementSpec, index?: number): GuiSpec {
  const spec: Partial<GuiSpec> = element.creationSpec || {}
  spec.type = element.type
  spec.index = index
  return spec as GuiSpec
}

function instantiateElement(parent: LuaGuiElement, indexInParent: number, spec: ElementSpec): ElementInstance {
  const guiElement = parent.add(getCreationSpec(spec, indexInParent))

  if (spec.onCreated) spec.onCreated(guiElement as any)
  const childSpecs = spec.children || []
  const childInstances: NonNilInstance[] = []
  const newInstance: ElementInstance = {
    type: spec.type,
    key: spec.key || indexInParent,
    childSpecs,
    guiElement,
    childInstances,
    elementMod: {}, // will be set in updateElement
    styleMod: {},
  }

  updateElement(guiElement, newInstance, spec, false)
  let childIndexInParent = 1
  for (const child of childSpecs) {
    const childInstance = instantiate(guiElement, childIndexInParent, child)
    childInstances[childInstances.length] = childInstance
    if (childInstance.guiElement) childIndexInParent++
  }
  return newInstance
}

function instantiateComponent(
  parent: LuaGuiElement,
  indexInParent: number,
  spec: ComponentSpec<any>
): ComponentInstance {
  if (spec.updateOnly) {
    error(
      "Update only is only allowed to update exising components (an element is trying to be created). Spec:" +
        serpent.block(spec)
    )
  }
  const publicInstance = componentNew(spec.type)
  publicInstance.parentGuiElement = parent
  const rendered = publicInstance.create(spec.props)
  const childInstance = instantiate(parent, indexInParent, rendered)
  const newInstance: ComponentInstance = {
    guiElement: childInstance.guiElement,
    publicInstance,
    childInstance,
    key: spec.key || indexInParent,
    type: spec.type,
    props: spec.props,
    wasDeferProps: spec.deferProps,
  }
  publicInstance.firstGuiElement = childInstance.guiElement
  if (!spec.deferProps) {
    reconcileComponent(parent, indexInParent, newInstance, spec, true)
  }
  return newInstance
}

function instantiateEmpty(parent: LuaGuiElement, indexInParent: number): NilInstance {
  const guiElement = parent.add({ type: "empty-widget", index: indexInParent })
  return { guiElement }
}

// this overload just for type fun
function instantiate(parent: LuaGuiElement, indexInParent: number, spec: NonNilSpec): NonNilInstance
function instantiate(parent: LuaGuiElement, indexInParent: number, spec: AnySpec): AnyInstance
function instantiate(parent: LuaGuiElement, indexInParent: number, spec: AnySpec): AnyInstance {
  if (!spec) {
    return instantiateEmpty(parent, indexInParent)
  } else if (isGuiElementType[spec.type]) {
    return instantiateElement(parent, indexInParent, spec as ElementSpec)
  } else {
    return instantiateComponent(parent, indexInParent, spec as ComponentSpec<any>)
  }
}

/**
 * Only _creates_ a new gui element from a ElementSpec. Does not support updating.
 *
 * Unlike {@link renderIn}, no special cleanup is required.
 *
 * @return LuaGuiElement the topmost created lua gui element, or nil if is an empty component.
 */
export function createIn(parent: LuaGuiElement, spec: AnySpec): LuaGuiElement | undefined {
  if (!spec) return undefined
  return instantiate(parent, 0, spec).guiElement
}

// </editor-fold>
// <editor-fold desc="Destroy and cleanup">
function destroyInstance(instance: AnyInstance): void {
  destroyIfValid(instance.guiElement)
}

/**
 * Properly disposes of a gui rendered using {@link renderIn}.
 */
export function destroyIn(parent: LuaGuiElement, name: string): void {
  const element = parent.get(name)
  if (!element) return
  const reactorio = global.reactorio
  const index = element.index
  const rootInstance = reactorio.rootInstances[index]
  if (rootInstance) destroyInstance(rootInstance)
  reactorio.rootInstances[index] = undefined
  reactorio.referencedGuiElements[index] = undefined
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

function updateElement(guiElement: LuaGuiElement, instance: ElementInstance, spec: ElementSpec, updateOnly: boolean) {
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
  if (spec.onUpdate) spec.onUpdate(guiElement as any)
}

function getKeyToLuaIndex(childSpecs1: AnySpec[]) {
  const keyToLuaIndex: PRecord<string | number, number> = {}
  for (const [luaIndex, childComponent] of ipairs(childSpecs1)) {
    const key = childComponent.key || luaIndex // indexInParent
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
 * The reconciliation algorithm matches by key. If no keyed elements are _rearranged_ (only added or deleted), then this
 * is most optimal; else it may delete some other keyed elements to reuse a keyed element.
 *
 * This definitely has room for (constant time) optimization.
 */
// same key, same type, updateOnly = false, mutates instance
function reconcileChildren(instance: ElementInstance, spec: ElementSpec): ElementInstance {
  // update children
  const guiElement = instance.guiElement
  const oldChildInstances = instance.childInstances || []
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
  for (const [luaNewIndex, newSpec] of ipairs(newChildSpecs)) {
    const key = newSpec.key || luaNewIndex

    const existingLuaIndex = oldKeyToLuaIndex[key]
    // element with matching key?
    if (existingLuaIndex && oldLuaIndex <= existingLuaIndex) {
      // delete everything from here to the matching element.
      // If this includes keyed elements, treat them as if they didn't exist (re-instantiate them later).
      while (oldLuaIndex !== existingLuaIndex) {
        const deletingInstance = oldChildInstances[oldLuaIndex - 1]
        oldKeyToLuaIndex[deletingInstance.key] = undefined // don't match deleted elements for future keyed children
        destroyInstance(deletingInstance)
        oldLuaIndex++
      }
      // update the instance.
      newChildInstances[luaNewIndex - 1] = reconcile(
        guiElement,
        luaNewIndex,
        oldChildInstances[existingLuaIndex],
        newSpec,
        false
      )
      oldLuaIndex++
    } else {
      // delete everything from the old elements that don't match a current element key.
      for (; oldLuaIndex < oldChildrenLength; oldLuaIndex++) {
        const oldInstance = oldChildInstances[oldLuaIndex - 1]
        if (newKeyToLuaIndex[oldInstance.key]) break
        destroyInstance(oldInstance)
      }
      // add the element.
      newChildInstances[luaNewIndex - 1] = instantiate(guiElement, luaNewIndex, newSpec)
    }
  }
  // delete remaining elements, if any.
  for (; oldLuaIndex < oldChildrenLength; oldLuaIndex++) {
    const oldInstance = oldChildInstances[oldLuaIndex - 1]
    destroyInstance(oldInstance)
  }

  // reuse past instance
  instance.childInstances = newChildInstances
  instance.keyToLuaIndex = newKeyToLuaIndex
  instance.childSpecs = newChildSpecs
  return instance
}

// same key, same type, updateOnly = true, mutates instance
function updateOnlyOnChildren(instance: ElementInstance, spec: ElementSpec): ElementInstance {
  const newChildElements = spec.children
  if (!newChildElements) return instance

  const guiElement = instance.guiElement
  const oldChildInstances = instance.childInstances || []
  const oldKeyToIndex = instance.keyToLuaIndex || getKeyToLuaIndex(instance.childSpecs)
  for (const [luaNewIndex, newSpec] of ipairs(newChildElements)) {
    const key = newSpec.key || luaNewIndex
    const oldLuaIndex = oldKeyToIndex[key]
    if (oldLuaIndex === undefined) {
      error(`In updateOnly mode: cannot find element with key ${oldLuaIndex}`)
    }
    const oldInstance = oldChildInstances[oldLuaIndex - 1]
    oldChildInstances[oldLuaIndex - 1] = reconcile(guiElement, oldLuaIndex, oldInstance, newSpec, true)
  }

  instance.keyToLuaIndex = oldKeyToIndex
  return instance
}

// same key, same type, mutates instance
function reconcileElement(instance: ElementInstance, spec: ElementSpec, updateOnly: boolean): ElementInstance {
  // update this element
  updateElement(instance.guiElement, instance, spec, updateOnly)
  if (updateOnly) {
    return updateOnlyOnChildren(instance, spec)
  } else {
    return reconcileChildren(instance, spec)
  }
}

// same key, same type
function reconcileComponent(
  parent: LuaGuiElement,
  indexInParent: number,
  instance: ComponentInstance,
  spec: ComponentSpec<unknown>,
  forceUpdate: boolean
): ComponentInstance {
  if (spec.deferProps) {
    error("deferProps is only allowed in create(), and full props should be given in update().")
  }
  const publicInstance = instance.publicInstance
  const newProps = spec.updateOnly ? { ...(instance.props as any), ...spec.props } : spec.props
  const shouldUpdate =
    forceUpdate || instance.wasDeferProps || publicInstance.shouldComponentUpdate(instance.props, newProps)
  // publicInstance.parentGuiElement = parent
  if (!shouldUpdate) return instance

  const rendered = publicInstance.update(newProps)
  if (!rendered) return instance

  const oldChildInstance = instance.childInstance
  const childInstance = reconcile(parent, indexInParent, oldChildInstance, rendered, false)
  publicInstance.firstGuiElement = childInstance.guiElement
  instance.guiElement = childInstance.guiElement
  instance.childInstance = childInstance
  instance.props = newProps
  instance.wasDeferProps = false
  return instance
}

// same key, not null

function reconcile(
  parent: LuaGuiElement,
  indexInParent: number,
  oldInstance: NonNilInstance | undefined,
  spec: NonNilSpec,
  parentIsUpdateOnly: boolean
): NonNilInstance
function reconcile(
  parent: LuaGuiElement,
  indexInParent: number,
  oldInstance: AnyInstance | undefined,
  spec: AnySpec,
  parentIsUpdateOnly: boolean
): AnyInstance
function reconcile(
  parent: LuaGuiElement,
  indexInParent: number,
  oldInstance: AnyInstance | undefined,
  spec: AnySpec,
  parentIsUpdateOnly: boolean
): AnyInstance {
  let thisIsUpdateOnly: boolean // using ?: creates a local functions
  if (spec && spec.updateOnly !== undefined) {
    thisIsUpdateOnly = spec.updateOnly
  } else {
    thisIsUpdateOnly = parentIsUpdateOnly
  }
  const specType = spec && spec.type
  if (oldInstance === undefined) {
    // new
    if (parentIsUpdateOnly) {
      error(`Creating new children is not allowed in update only mode. Spec: ${serpent.block(spec)} `)
    }
    return instantiate(parent, indexInParent, spec)
  } else if (oldInstance.type !== specType) {
    // replace
    if (thisIsUpdateOnly) {
      error(
        `Types much match in update only mode. If parent is update only and you want to change type of child
        element, set the child element to updateOnly=false. Old type: ${oldInstance.type}, New type: ${specType}`
      )
    }
    destroyInstance(oldInstance)
    return instantiate(parent, indexInParent, spec)
  }
  // update
  if (!specType) {
    return oldInstance as NilInstance
  } else if (isGuiElementType[specType]) {
    return reconcileElement(oldInstance as ElementInstance, spec as ElementSpec, thisIsUpdateOnly)
  } else {
    return reconcileComponent(
      parent,
      indexInParent,
      oldInstance as ComponentInstance,
      spec as ComponentSpec<unknown>,
      false
    )
  }
}

// </editor-fold>

// <editor-fold desc="Render">

/**
 * Renders elements a container.
 *
 * If the component is completely empty (results in no gui elements), then this has the same effect as destroying
 * the component.
 *
 * NOTE: the given `name` will override the name of the topmost lua gui element, always, in order to
 * refer to it for future updates.
 *
 * In order to destroy the element (with proper cleanup), use {@link destroyIn}.
 *
 * If the element is destroyed in some other way, cleanup may not happen properly, and you may have a memory leak.
 *
 * If you only want to create something but don't need to update it, you can use {@link createIn} instead. Create does
 * not require any special cleanup.
 */
export function renderIn(parent: LuaGuiElement, name: string, spec: AnySpec): void {
  const reactorio = global.reactorio
  const existing = parent.get(name)
  const existingIndex = existing && existing.index

  const prevInstance = existingIndex ? reactorio.rootInstances[existingIndex] : undefined
  const nextInstance = reconcile(parent, 0, prevInstance, spec, false)
  if (prevInstance) {
    reactorio.rootInstances[existingIndex!] = undefined
    reactorio.referencedGuiElements[existingIndex!] = undefined
  }
  const guiElement = nextInstance.guiElement
  if (guiElement) {
    reactorio.rootInstances[guiElement.index] = nextInstance
    reactorio.referencedGuiElements[guiElement.index] = guiElement
    guiElement.name = name
  }
}

/**
 * Renders elements, but only updates if the gui is already present.
 * @see renderIn
 */
export function renderIfPresentIn(parent: LuaGuiElement, name: string, spec: AnySpec): void {
  const existing = parent.get(name)
  if (!existing) return
  renderIn(parent, name, spec)
}

/**
 * If element is present, destroys it; if element is not present, creates it.
 * @see renderIn
 */
export function renderToggleIn(parent: LuaGuiElement, name: string, spec: AnySpec): void {
  const existing = parent.get(name)
  if (!existing) renderIn(parent, name, spec)
  else destroyIn(parent, name)
}

// </editor-fold>
