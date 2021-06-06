import { deepAssign, isFunction } from "./util"
import { EventHandlerContainer, registerHandlers } from "./events"

// -- Template

export type GuiTemplate<Props = undefined> = GuiSpec & BaseGuiTemplate<Props>

export interface BaseGuiTemplate<Props> extends BaseGuiSpec, GuiEventHandlers {
  elementMod?: ModOf<BareGuiElementOfType<this["type"]>, Props>
  styleMod?: ModOf<LuaStyle, Props>

  onCreated?: (this: GuiElementOfType<this["type"]>) => void
  onUpdate?: (this: GuiElementOfType<this["type"]>, props: Props) => void
  readonly children?: readonly GuiTemplate<Props>[]
}

// This has to be an interface to get access to "this" type
interface GuiEventHandlers {
  readonly type: GuiElementType
  // special one
  onAction?: GuiFuncRef
  onCheckedStateChanged?: GuiFuncRef
  onClick?: GuiFuncRef
  onClosed?: GuiFuncRef
  onConfirmed?: GuiFuncRef
  onElemChanged?: GuiFuncRef
  onLocationChanged?: GuiFuncRef
  onOpened?: GuiFuncRef
  onSelectedTabChanged?: GuiFuncRef
  onSelectionStateChanged?: GuiFuncRef
  onSwitchStateChanged?: GuiFuncRef
  onTextChanged?: GuiFuncRef
  onValueChanged?: GuiFuncRef
}

// typescript will complain if a method is missing or shouldn't be there
/* eslint-disable @typescript-eslint/no-unused-vars */
// noinspection JSUnusedLocalSymbols
const completenessCheck: Record<GuiEventName, unknown> =
  {} as Required<GuiEventHandlers>

// noinspection JSUnusedLocalSymbols
const limitedCheck: Required<GuiEventHandlers> = {} as Record<
  GuiEventName,
  any
> & { type: any; onAction: any }

/* eslint-enable @typescript-eslint/no-unused-vars */

type ModOf<T, Props> = ValueOrFunction<Writable<T>, Props>

type ValueOrFunction<T, Props> = {
  [P in keyof T]?: T[P] | ((this: void, props: Props) => T[P])
}

export function create<T extends GuiTemplate<Props>, Props>(
  parent: BareGuiElement,
  template: T,
  props: Props
): GuiElementOfType<T["type"]>
export function create<T extends GuiTemplate>(
  parent: BareGuiElement,
  template: T
): GuiElementOfType<T["type"]>

export function create<Props>(
  parent: BareGuiElement,
  template: GuiTemplate<Props>,
  props?: Props
): GuiElement {
  const element = createRecursive(parent, template, props!)
  updateFuncOnly(element, template, props!)
  return element
}

function createRecursive<Props>(
  parent: BareGuiElement,
  template: GuiTemplate<Props>,
  props: Props
): GuiElement {
  const spec: GuiSpec = extractSpec(template)
  const element = parent.add(spec)
  if (template.elementMod) assignMod(element, template.elementMod as any, props)
  if (template.styleMod) assignMod(element.style, template.styleMod, props)
  if (template.onCreated) {
    ;(template.onCreated as (this: GuiElement) => void).call(element)
  }
  if (template.children) {
    for (const childTemplate of template.children) {
      create(element, childTemplate, props)
    }
  }
  return element
}

export function update<Props>(
  element: LuaGuiElement,
  template: GuiTemplate<Props>,
  props: Props
): GuiElement {
  if (template.elementMod)
    assignMod(element, template.elementMod as any, props, true)
  if (template.styleMod)
    assignMod(element.style, template.styleMod, props, true)
  if (template.onUpdate) {
    ;(template.onUpdate as (this: GuiElement, props: Props) => void).call(
      element,
      props
    )
  }
  if (template.children) {
    for (const [i, child] of ipairs(element.children)) {
      // ipairs has different indexing
      if (child) update(child, template.children[i - 1], props)
    }
  }
  return element
}

function updateFuncOnly<Props>(
  element: LuaGuiElement,
  template: GuiTemplate<Props>,
  props: Props
) {
  if (template.onUpdate) {
    ;(template.onUpdate as (this: GuiElement, props: Props) => void).call(
      element,
      props
    )
  }
  if (template.children) {
    for (const [i, child] of ipairs(element.children)) {
      // ipairs has different indexing
      if (child) updateFuncOnly(child, template.children[i - 1], props)
    }
  }
  return element
}

const specialFields: Record<
  Exclude<keyof BaseGuiTemplate<unknown>, keyof BaseGuiSpec>,
  true
> = {
  elementMod: true,
  styleMod: true,
  onCreated: true,
  onAction: true,
  onUpdate: true,
  onCheckedStateChanged: true,
  onClick: true,
  onClosed: true,
  onConfirmed: true,
  onElemChanged: true,
  onLocationChanged: true,
  onOpened: true,
  onSelectedTabChanged: true,
  onSelectionStateChanged: true,
  onSwitchStateChanged: true,
  onTextChanged: true,
  onValueChanged: true,
  children: true,
}
declare global {
  interface Tags {
    "#guiEventHandlers"?: PRecord<GuiEventName, string>
  }
}

function extractSpec<Props>(template: GuiTemplate<Props>): GuiSpec {
  const result: Record<string, unknown> = {}

  // copy GuiSpec fields
  for (const [key, value] of pairs(template)) {
    if (!(specialFields as any)[key]) result[key] = value
  }

  // extract handlers
  const handlers: Tags["#guiEventHandlers"] = {}

  let name: GuiEventName
  for (name in guiEvents) {
    const handler = template[name] as GuiFuncRef
    if (handler) {
      handlers[name] = handler["#funcName"]
    }
  }
  if (template.onAction) {
    const eventName = onActionEvents[template.type]
    if (!eventName) {
      throw `GUI element of type ${template.type} does not have an onAction event.
      Tried to register "${template.onAction["#funcName"]}".`
    }
    if (handlers[eventName])
      throw `Cannot register 'onAction' handler ("${template.onAction["#funcName"]}") because
      this element already has an event handler for ${eventName} ("${handlers[eventName]}").`
    handlers[eventName] = template.onAction["#funcName"]
  }
  result.tags = result.tags || {}
  ;(result.tags as Tags)["#guiEventHandlers"] = handlers

  return result as any
}

function assignMod<T, Props>(
  target: T,
  mod: ModOf<T, Props>,
  props: Props,
  functionsOnly = false
) {
  for (const [key, value] of pairs(mod)) {
    let newValue: any
    if (isFunction(value)) {
      newValue = (value as (p: Props) => any)(props)
    } else if (!functionsOnly) {
      newValue = value
    }
    if (key === "tags") {
      // merge tags instead of overwrite
      const tags = (target[key] || {}) as Tags
      deepAssign(tags, newValue as Record<string, unknown>)
      newValue = tags
    }
    target[key] = newValue as any
  }
}

// -- GuiFunc

export type GuiFunc = (this: any, event: GuiEventPayload) => void

export interface GuiFuncRef {
  "#funcName": string
}

// some events have more fields
export interface GuiEventPayload {
  element: LuaGuiElement
  // eslint-disable-next-line camelcase
  player_index: number
}

const allGuiFuncs: Record<string, GuiFunc> = {}

export function guiFunc(uniqueName: string, func: GuiFunc): GuiFuncRef {
  if (allGuiFuncs[uniqueName]) {
    throw `a GUI func with name "${uniqueName}" already exists`
  }
  allGuiFuncs[uniqueName] = func as GuiFunc
  return { "#funcName": uniqueName }
}

export function guiFuncs<T extends Record<string, GuiFunc>>(
  groupName: string,
  funcs: T
): {
  [P in keyof T]: GuiFuncRef
} {
  const result: PRecord<keyof T, GuiFuncRef> = {}
  for (const [name, func] of pairs(funcs)) {
    result[name] = guiFunc(groupName + ":" + name, func)
  }
  return result as any
}

// -- GUI events

const guiEvents = {
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
export type GuiEventName = keyof typeof guiEvents

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

function handleGuiEvent(eventName: GuiEventName, event: GuiEventPayload) {
  const element = event.element
  if (!element) return
  const handlers = element.tags["#guiEventHandlers"]
  if (!handlers) return
  const handlerName = handlers[eventName]
  if (handlerName) {
    allGuiFuncs[handlerName].call(element, event)
  }
}

const handlers: EventHandlerContainer = {}
for (const [name, scriptName] of pairs(guiEvents)) {
  handlers[scriptName] = (payload) => {
    handleGuiEvent(name, payload)
  }
}
registerHandlers(handlers)
