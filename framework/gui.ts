import { EventHandlerContainer, registerHandlers } from "./events"

export type GuiTemplate<TData> = GuiElementSpec & GuiTemplateExtra<TData>

interface GuiTemplateExtra<TData> {
  children?: GuiTemplate<TData>[]

  onCreated?: (this: LuaGuiElement) => void
  onDataUpdate?: (this: LuaGuiElement, data: TData) => void

  onAction?: GuiActionHandler
}

const templateExtraFields: Record<string, true | undefined> = {
  children: true,
  onAction: true,
  onCreated: true,
  onDataUpdate: true,
}

// some events may have more fields
export interface GuiActionEvent {
  element: LuaGuiElement
  player_index: number
}

export type GuiActionHandler = (
  this: LuaGuiElement,
  event: GuiActionEvent
) => void

const guiEvents = [
  "on_gui_checked_state_changed",
  "on_gui_click",
  "on_gui_elem_changed",
  "on_gui_selection_state_changed",
  "on_gui_text_changed",
  "on_gui_value_changed",
] as const

type GuiEventName = typeof guiEvents[number]

const onActionEvents: PRecord<GuiElementType, GuiEventName> = {
  checkbox: "on_gui_checked_state_changed",
  "choose-elem-button": "on_gui_elem_changed",
  button: "on_gui_click",
  "sprite-button": "on_gui_click",
  "drop-down": "on_gui_selection_state_changed",
  textfield: "on_gui_text_changed",
  "text-box": "on_gui_text_changed",
  slider: "on_gui_value_changed",
}

// TODO: less delicate id to function mapping
const guiHandlerToId = new LuaTable<GuiActionHandler, number>()
const guiHandlers: GuiActionHandler[] = []
declare global {
  interface Tags {
    __actionHandlerId?: number
  }
}

function extractSpec(t: GuiTemplate<any>): GuiElementSpec {
  const template = t as GuiTemplate<any> & { __extractedSpec?: GuiElementSpec }
  if (template.__extractedSpec) {
    return template.__extractedSpec as GuiElementSpec
  }

  const result: Record<string, any> = {}
  for (const [key, value] of pairs(template)) {
    if (!templateExtraFields[key]) {
      result[key] = value
    }
  }
  const elementType = template.type
  const actionHandler = template.onAction
  if (actionHandler) {
    if (!onActionEvents[template.type]) {
      error(
        `GUI element of type "${elementType}" does not have an onAction event`
      )
    }

    result.tags = result.tags || {}
    result.tags.__actionHandlerId = getHandlerId(actionHandler)
  }

  return (template.__extractedSpec = result as GuiElementSpec)
}

function getHandlerId(guiHandler: GuiActionHandler): number {
  let handlerId = guiHandlerToId.get(guiHandler)
  if (handlerId === undefined) {
    handlerId = guiHandlers.length
    guiHandlerToId.set(guiHandler, handlerId)
    guiHandlers[handlerId] = guiHandler
  }
  return handlerId
}

// VERY IMPORTANT TODO: process template before building or else all hell breaks loose
export function buildGui<TData>(
  parent: LuaGuiElement,
  template: GuiTemplate<TData>,
  data: TData
): LuaGuiElement {
  const element = buildGuiRecursive(parent, template, data)
  updateGui(element, template, data)
  return element
}

function buildGuiRecursive<TData>(
  parent: LuaGuiElement,
  template: GuiTemplate<TData>,
  data: TData
): LuaGuiElement {
  const element = parent.add(extractSpec(template))
  if (template.onCreated) {
    template.onCreated.call(element)
  }
  if (template.children) {
    for (const child of template.children) {
      buildGuiRecursive(element, child, data)
    }
  }
  return element
}

export function updateGui<TData>(
  element: LuaGuiElement,
  template: GuiTemplate<TData>,
  data: TData
) {
  if (template.onDataUpdate) {
    template.onDataUpdate.call(element, data)
  }
  if (template.children) {
    for (const childTemplate of template.children) {
      // todo: make parent record children index so less reliance on name
      // or, (probably better), make element record its template
      const child = element[childTemplate.name!]!
      updateGui(child, childTemplate, data)
    }
  }
}

function handleGuiEvent(event: GuiActionEvent) {
  const element = event.element
  const handlerId = element.tags.__actionHandlerId
  if (!handlerId) return
  guiHandlers[handlerId].call(element, event)
}

const handlers: EventHandlerContainer = {}
for (let guiEvent of guiEvents) {
  handlers[guiEvent] = handleGuiEvent
}
registerHandlers(handlers)
