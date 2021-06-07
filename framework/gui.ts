import { deepAssign, isFunction } from "./util"
import { EventHandler, EventName, registerHandlers } from "./events"
import { FuncRef, getFuncRef } from "./funcRef"
import { wlog } from "./logging"

// -- Template

export type GuiTemplate<Props = any> = GuiSpec & BaseGuiTemplate<Props>

export interface BaseGuiTemplate<Props> extends BaseGuiSpec, GuiEventHandlers {
  elementMod?: ModOf<BareGuiElementOfType<this["type"]>, Props>
  styleMod?: ModOf<LuaStyle, Props>

  onCreated?: (this: unknown, element: GuiElementOfType<this["type"]>) => void
  onUpdate?: (this: unknown, element: GuiElementOfType<this["type"]>, props: Props) => void
  readonly children?: readonly GuiTemplate<Props>[]
}

// This has to be an interface to get access to "this" type
interface GuiEventHandlers {
  readonly type: GuiElementType
  onAction?: FuncRef<[element: GuiElementOfType<this["type"]>, event: GuiEventPayload]>
  onCheckedStateChanged?: FuncRef<[element: GuiElementOfType<this["type"]>, event: OnGuiCheckedStateChangedPayload]>
  onClick?: FuncRef<[element: GuiElementOfType<this["type"]>, event: OnGuiClickPayload]>
  onClosed?: FuncRef<[element: GuiElementOfType<this["type"]>, event: OnGuiClosedPayload]>
  onConfirmed?: FuncRef<[element: GuiElementOfType<this["type"]>, event: OnGuiConfirmedPayload]>
  onElemChanged?: FuncRef<[element: GuiElementOfType<this["type"]>, event: OnGuiElemChangedPayload]>
  onLocationChanged?: FuncRef<[element: GuiElementOfType<this["type"]>, event: OnGuiLocationChangedPayload]>
  onOpened?: FuncRef<[element: GuiElementOfType<this["type"]>, event: OnGuiOpenedPayload]>
  onSelectedTabChanged?: FuncRef<[element: GuiElementOfType<this["type"]>, event: OnGuiSelectedTabChangedPayload]>
  onSelectionStateChanged?: FuncRef<[element: GuiElementOfType<this["type"]>, event: OnGuiSelectionStateChangedPayload]>
  onSwitchStateChanged?: FuncRef<[element: GuiElementOfType<this["type"]>, event: OnGuiSwitchStateChangedPayload]>
  onTextChanged?: FuncRef<[element: GuiElementOfType<this["type"]>, event: OnGuiTextChangedPayload]>
  onValueChanged?: FuncRef<[element: GuiElementOfType<this["type"]>, event: OnGuiValueChangedPayload]>
}

// typescript will complain if a method is missing or shouldn't be there
/* eslint-disable @typescript-eslint/no-unused-vars */
// noinspection JSUnusedLocalSymbols
const completenessCheck: Record<GuiEventName, unknown> = {} as Required<GuiEventHandlers>

// noinspection JSUnusedLocalSymbols
const limitedCheck: Required<GuiEventHandlers> = {} as Record<GuiEventName, any> & { type: any; onAction: any }

/* eslint-enable @typescript-eslint/no-unused-vars */
type PropFunction<T, Props> = (this: void, props: Props, element: LuaGuiElement) => T

type ModOf<T, Props> = ValueOrFunction<Writable<T>, Props>

type ValueOrFunction<T, Props> = {
  [P in keyof T]?: T[P] | PropFunction<T[P], Props>
}

export function create<T extends GuiTemplate<Props>, Props>(
  parent: BareGuiElement,
  template: T,
  props: Props
): GuiElementOfType<T["type"]>
export function create<T extends GuiTemplate>(parent: BareGuiElement, template: T): GuiElementOfType<T["type"]>

export function create<Props>(parent: BareGuiElement, template: GuiTemplate<Props>, props?: Props): GuiElement {
  const element = createRecursive(parent, template, props!)
  updateFuncOnly(element, template, props!)
  return element
}

function createRecursive<Props>(parent: BareGuiElement, template: GuiTemplate<Props>, props: Props): GuiElement {
  const spec: GuiSpec = extractSpec(template)
  const element = parent.add(spec)
  if (template.elementMod) assignMod(element, template.elementMod as any, props, element)
  if (template.styleMod) assignMod(element.style, template.styleMod, props, element)
  if (template.onCreated) {
    template.onCreated(element as any)
  }
  if (template.children) {
    for (const childTemplate of template.children) {
      create(element, childTemplate, props)
    }
  }
  return element
}

export function update(element: LuaGuiElement, template: GuiTemplate): GuiElement
export function update<Props>(element: LuaGuiElement, template: GuiTemplate<Props>, props: Props): GuiElement
export function update<Props>(element: LuaGuiElement, template: GuiTemplate<Props>, props?: Props): GuiElement {
  if (template.elementMod) assignMod(element, template.elementMod as any, props, element, true)
  if (template.styleMod) assignMod(element.style, template.styleMod, props!, element, true)
  if (template.onUpdate) {
    template.onUpdate(element as any, props!)
  }
  if (template.children) {
    for (const [i, child] of ipairs(element.children)) {
      // ipairs has different indexing
      if (child) update(child, template.children[i - 1], props!)
    }
  }
  return element
}

function updateFuncOnly<Props>(element: LuaGuiElement, template: GuiTemplate<Props>, props: Props) {
  if (template.onUpdate) {
    template.onUpdate(element as any, props)
  }
  if (template.children) {
    for (const [i, child] of ipairs(element.children)) {
      // ipairs has different indexing
      if (child && template.children[i - 1]) updateFuncOnly(child, template.children[i - 1], props)
    }
  }
  return element
}

const specialFields: Record<Exclude<keyof BaseGuiTemplate<unknown>, keyof BaseGuiSpec>, true> = {
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

function assignMod<T, Props>(
  target: T,
  mod: ModOf<T, Props>,
  props: Props,
  element: LuaGuiElement,
  functionsOnly = false
) {
  for (const [key, value] of pairs(mod)) {
    let newValue: any
    if (isFunction(value)) {
      newValue = (value as PropFunction<any, Props>)(props, element)
    } else if (!functionsOnly) {
      newValue = value
    } else continue
    if (key === "tags") {
      mergeTags(target as any, newValue as Tags)
    } else {
      target[key] = newValue as any
    }
  }
}

export function mergeTags(element: LuaGuiElement, tags: Tags): void {
  const oldTags = element.tags
  deepAssign(oldTags, tags)
  element.tags = oldTags
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
    const handler = template[name] as FuncRef<[GuiElement, GuiEventPayload]>
    if (handler) {
      handlers[name] = handler["#name"]
    }
  }
  if (template.onAction) {
    const eventName = onActionEvents[template.type]
    if (!eventName) {
      throw `GUI element of type ${template.type} does not have an onAction event.
      Tried to register "${template.onAction["#name"]}".`
    }
    if (handlers[eventName])
      throw `Cannot register 'onAction' handler ("${template.onAction["#name"]}") because
      this element already has an event handler for ${eventName} ("${handlers[eventName]}").`
    handlers[eventName] = template.onAction["#name"]
  }
  result.tags = result.tags || {}
  ;(result.tags as Tags)["#guiEventHandlers"] = handlers

  return result as any
}

// some events have more fields
export interface GuiEventPayload {
  element: LuaGuiElement
  player_index: number
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
  if (!handlerName) return
  const ref = getFuncRef(handlerName)
  if (ref) {
    ref.func(element, event)
  } else {
    wlog(`There is no gui handler function named ${handlerName}.
    Try refreshing the UI; If error persists, please report to the mod author.
    Event name ${eventName}, event: ${serpent.dump(event)}`)
  }
}

const handlers: PRecord<EventName, EventHandler> = {}
for (const [name, scriptName] of pairs(guiEvents)) {
  handlers[scriptName] = function (payload) {
    handleGuiEvent(name, payload)
  }
}
registerHandlers(handlers)
