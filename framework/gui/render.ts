import { registerHandlers } from "../events"
import { dlog } from "../logging"
import { AnySpec, ComponentSpec, ElementSpec, FCSpec } from "./spec"
import { Component, getRegisteredComponent } from "./component"

// <editor-fold desc="Instance">
interface BaseInstance {
  guiElement: LuaGuiElement
  key: string | number
}

interface ElementInstance extends BaseInstance {
  spec: ElementSpec
  childInstances: Instance[]
  keyToIndex?: PRecord<string | number, number>
}

interface FCInstance extends BaseInstance {
  spec: FCSpec<unknown>
  childInstance: Instance
}

interface ComponentInstance extends BaseInstance {
  publicInstance: Component<unknown>
  spec: ComponentSpec<unknown>
  childInstance: Instance
}

type Instance = ElementInstance | FCInstance | ComponentInstance
// </editor-fold>
// <editor-fold desc="Global">
declare const global: {
  reactorio: {
    rootInstances: Record<number, Instance | undefined>
    referencedGuiElements: Record<number, LuaGuiElement | undefined>

    componentInstances: LuaTable<Component<unknown>, string | undefined>
  }
}

function cleanGlobal() {
  // clean rootInstances table
  // if things are handled properly this wouldn't be necessary (unless player removed), but defensive programming
  // also, size of this table is not expected to be too large
  const reactorio = global.reactorio
  for (const [index, element] of pairs(reactorio.referencedGuiElements)) {
    if (!element.valid) {
      reactorio.referencedGuiElements[index] = undefined
      reactorio.rootInstances[index] = undefined
    }
  }
}

function restoreMetatables() {
  // weak table for defensive programming
  setmetatable(global.reactorio.componentInstances, { __mode: "k" })
  // collectgarbage()
  for (const [component, className] of pairs(global.reactorio.componentInstances)) {
    const componentClass = getRegisteredComponent(className!)
    setmetatable(component, componentClass.prototype)
  }
}

registerHandlers({
  on_init() {
    global.reactorio = {
      rootInstances: {},
      referencedGuiElements: {},
      componentInstances: new LuaTable(),
    }
  },
  on_load() {
    cleanGlobal()
    restoreMetatables()
  },
  on_player_removed: cleanGlobal,
})
// </editor-fold>
// <editor-fold desc="Instantiate">

function getCreationSpec(element: ElementSpec, index?: number): GuiSpec {
  const spec: Partial<GuiSpec> = element.creationSpec
  spec.type = element.type
  spec.index = index
  return spec as GuiSpec
}

function instantiateElement(parent: LuaGuiElement, indexInParent: number, spec: ElementSpec): ElementInstance {
  const guiElement = parent.add(getCreationSpec(spec, indexInParent))

  if (spec.onCreated) spec.onCreated(guiElement as any)
  updateElement(guiElement, {} as ElementSpec, spec)

  const children = spec.children || []
  const childInstances: Instance[] = []
  for (const [luaIndex, child] of ipairs(children)) {
    childInstances[childInstances.length] = instantiate(guiElement, luaIndex, child)
  }
  return {
    spec,
    guiElement,
    childInstances,
    key: spec.key || indexInParent,
  }
}

// empty components not supported yet
function instantiateFC(parent: LuaGuiElement, indexInParent: number, spec: FCSpec<unknown>): FCInstance {
  const rendered = spec.type(spec.props)
  const childInstance = instantiate(parent, indexInParent, rendered)
  const guiElement = childInstance.guiElement

  return {
    guiElement,
    spec,
    childInstance,
    key: spec.key || indexInParent,
  }
}

function instantiateComponent(
  parent: LuaGuiElement,
  indexInParent: number,
  spec: ComponentSpec<unknown>
): ComponentInstance {
  const publicInstance = new spec.type()
  getRegisteredComponent(spec.type.name)
  publicInstance.props = spec.props
  publicInstance.parentGuiElement = parent
  const rendered = publicInstance.render()
  const childInstance = instantiate(parent, indexInParent, rendered)
  const guiElement = childInstance.guiElement
  return {
    guiElement,
    spec,
    publicInstance,
    childInstance,
    key: spec.key || indexInParent,
  }
}

function instantiate(parent: LuaGuiElement, indexInParent: number, spec: AnySpec): Instance {
  const elementType = spec.type
  const typeofType = type(elementType)
  if (typeofType === "string") {
    return instantiateElement(parent, indexInParent, spec as ElementSpec)
  } else if (typeofType === "function") {
    return instantiateFC(parent, indexInParent, spec as FCSpec<unknown>)
  } else if (typeofType === "table") {
    return instantiateComponent(parent, indexInParent, spec as ComponentSpec<unknown>)
  } else {
    error(`unrecognized element type ${elementType}`)
  }
}

/**
 * Only _creates_ a new gui element from a ElementSpec. Does not support updating.
 *
 * You do NOT need to use {@link destroySelf} on the returned element for proper cleanup.
 *
 * @return LuaGuiElement the topmost created lua gui element.
 */
export function create(parent: LuaGuiElement, spec: AnySpec): LuaGuiElement {
  return instantiate(parent, 0, spec).guiElement
}

// </editor-fold>
// <editor-fold desc="Destroy and cleanup">
function destroyInstance(instance: Instance): void {
  instance.guiElement.destroy() // doesn't matter what type, don't want guiElement
  cleanup(instance)
}

function cleanup(instance: Instance): void {
  const theElement = instance.spec
  const elementType = theElement.type
  const typeofType = type(elementType)
  if (typeofType === "string") {
    for (const childInstance of (instance as ElementInstance).childInstances) {
      cleanup(childInstance)
    }
  } else if (typeofType === "function") {
    cleanup((instance as FCInstance).childInstance)
  } else if (typeofType === "table") {
    const componentInstance = instance as ComponentInstance
    global.reactorio.componentInstances.set(componentInstance.publicInstance, undefined)
    cleanup(componentInstance.childInstance)
  } else {
    error(`unrecognized element type ${elementType}`)
  }
}

/**
 * Properly disposes of a gui created using {@link renderIn}, given parent and instance name.
 */
export function destroyIn(parent: LuaGuiElement, name: string): void {
  const element = parent.get(name)
  if (element) destroySelf(element)
}

/**
 * Properly disposes of a gui created using {@link renderIn}.
 */
export function destroySelf(existingElement: LuaGuiElement): void {
  const reactorio = global.reactorio
  const index = existingElement.index
  const rootInstance = reactorio.rootInstances[index]
  if (rootInstance) destroyInstance(rootInstance)
  reactorio.rootInstances[index] = undefined
  reactorio.referencedGuiElements[index] = undefined
  existingElement.destroy()
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

function updateElement(guiElement: LuaGuiElement, oldSpec: ElementSpec, newSpec: ElementSpec) {
  applyMod(guiElement, oldSpec.elementMod || {}, newSpec.elementMod || {})
  applyMod(guiElement.style, oldSpec.styleMod || {}, newSpec.styleMod || {})
  if (newSpec.onUpdate) newSpec.onUpdate(guiElement as any)
}

function getKeyToIndex(spec: ElementSpec) {
  const childSpecs = spec.children || []
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
function reconcileElement(instance: ElementInstance, spec: ElementSpec): ElementInstance {
  // update this instance
  updateElement(instance.guiElement, instance.spec, spec)

  // update children
  const guiElement = instance.guiElement
  const oldChildInstances = instance.childInstances || []
  const newChildInstances: Instance[] = []
  const newChildElements = spec.children || []
  const oldKeyToIndex = instance.keyToIndex || getKeyToIndex(instance.spec)
  const nextKeyToIndex = getKeyToIndex(spec)

  // iterate through both the old elements and the new instances at once. Try to match new elements
  // with old elements in order, deleting and adding as needed.
  // If elements are REARRANGED, then existing elements between the old position and new position of the earliest
  // appearing element (in new elements) are deleted, regardless of any matching keyed elements that already existed
  // there (those elements are re-instantiated). Otherwise, every keyed element is reused.
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
        destroyInstance(deletingInstance)
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
        destroyInstance(oldInstance)
        oldIndex++
      }
      // add the element.
      newChildInstances[newIndex] = instantiate(guiElement, newIndex + 1, newElement)
    }
  }
  // delete remaining elements, if any.
  for (; oldIndex < oldChildInstances.length; oldIndex++) {
    const oldInstance = oldChildInstances[oldIndex]
    destroyInstance(oldInstance)
  }

  // reuse past instance
  instance.childInstances = newChildInstances
  instance.keyToIndex = nextKeyToIndex
  instance.spec = spec
  return instance
}

function reconcileFC(
  parent: LuaGuiElement,
  indexInParent: number,
  instance: FCInstance,
  spec: FCSpec<unknown>
): FCInstance {
  // TODO: better should update
  const rendered = spec.type(spec.props)
  const oldChildInstance = instance.childInstance
  const childInstance = reconcile(parent, indexInParent, oldChildInstance, rendered)
  instance.guiElement = childInstance.guiElement
  instance.childInstance = childInstance
  instance.spec = spec
  return instance
}

function reconcileComponent(
  parent: LuaGuiElement,
  indexInParent: number,
  instance: ComponentInstance,
  spec: ComponentSpec<unknown>
): ComponentInstance {
  const publicInstance = instance.publicInstance
  const shouldUpdate = publicInstance.shouldComponentUpdate(spec.props)
  publicInstance.props = spec.props
  publicInstance.parentGuiElement = parent
  if (!shouldUpdate) return instance

  const rendered = publicInstance.render()
  const oldChildInstance = instance.childInstance
  const childInstance = reconcile(parent, indexInParent, oldChildInstance, rendered)
  instance.guiElement = childInstance.guiElement
  instance.childInstance = childInstance
  instance.spec = spec
  return instance
}

// elements should already have same key (or be root element).
function reconcile(
  parent: LuaGuiElement,
  indexInParent: number,
  oldInstance: Instance | undefined,
  spec: AnySpec
): Instance {
  if (oldInstance === undefined) {
    // new
    return instantiate(parent, indexInParent, spec)
  } else if (oldInstance.spec.type !== spec.type) {
    // replace
    destroyInstance(oldInstance)
    return instantiate(parent, indexInParent, spec)
  }
  const elementType = spec.type
  const typeofType = type(elementType)
  if (typeofType === "string") {
    return reconcileElement(oldInstance as ElementInstance, spec as ElementSpec)
  } else if (typeofType === "function") {
    return reconcileFC(parent, indexInParent, oldInstance as FCInstance, spec as FCSpec<unknown>)
  } else if (typeofType === "table") {
    return reconcileComponent(parent, indexInParent, oldInstance as ComponentInstance, spec as ComponentSpec<unknown>)
  } else {
    error("Unrecognized type")
  }
}

// </editor-fold>

// <editor-fold desc="Render">

function render(parent: LuaGuiElement, existing: LuaGuiElement | undefined, element: AnySpec): Instance {
  const reactorio = global.reactorio
  const prevInstance = existing && reactorio.rootInstances[existing.index]
  const nextInstance = reconcile(parent, 0, prevInstance, element)
  if (prevInstance) {
    reactorio.rootInstances[existing!.index] = undefined
    reactorio.referencedGuiElements[existing!.index] = undefined
  }
  const guiElement = existing || nextInstance.guiElement
  reactorio.rootInstances[guiElement.index] = nextInstance
  reactorio.referencedGuiElements[guiElement.index] = guiElement
  return nextInstance
}

/**
 * Renders elements a container.
 *
 * NOTE: the given `name` will override the name of the topmost lua gui element, always, in order to
 * refer to it for future updates.
 *
 * In order to destroy properly, use the {@link destroySelf} function on the returned LuaGuiElement.
 *
 * If you only want to create something but don't need to update it, you can use {@link create} instead.
 *
 * @return GuiElement the first lua gui element. You can use {@link rerenderSelf} on this element for future updates.
 *  You should pass this into {@link destroySelf} to destroy properly.
 */
export function renderIn(parent: LuaGuiElement, name: string, spec: AnySpec): LuaGuiElement {
  const instance = render(parent, parent.get(name), spec)
  const element = instance.guiElement
  element.name = name
  return element
}

/**
 * Renders elements a container, but only updates it if the element is already present.
 */
export function rerenderIfPresentIn(parent: LuaGuiElement, name: string, spec: AnySpec): void {
  const existing = parent.get(name)
  if (!existing) return
  renderIn(parent, name, spec)
}

/**
 * If element is present, destroys it. If is not present rerenders it like {@link renderIn}.
 */
export function renderToggleIn(parent: LuaGuiElement, name: string, spec: AnySpec): void {
  const existing = parent.get(name)
  if (!existing) renderIn(parent, name, spec)
  else destroyIn(parent, name)
}

/**
 * Updates rendering on an existing rendered element, obtained from {@link renderIn}
 */
export function rerenderSelf(existingElement: LuaGuiElement, spec: AnySpec): void {
  render(existingElement.parent, existingElement, spec)
}

// </editor-fold>
