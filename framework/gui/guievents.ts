// some events have more fields
import { getFuncOrNil, isRegisteredFunc } from "../funcRef"
import { userWarning } from "../logging"
import { ElementSpecOfType } from "./spec"
import { EventHandlerContainer, registerHandlers } from "../events"

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

interface EventHandlerTags {
  "#guiEventHandlers": PRecord<GuiEventName, string>
}

type AnyGuiEventHandler = (element: LuaGuiElement, payload: AnyGuiEventPayload) => void

function getFuncName(func: Function, debugName: string): string {
  if (!isRegisteredFunc(func)) error(`The function for ${debugName} was not a registered function ref`)
  return func.funcName
}

// adds guiEventHandlers tags
export function getTags(element: ElementSpecOfType<GuiElementType>): Tags {
  const handlers: PRecord<GuiEventName, string> = {}

  for (const n in guiEventNameMapping) {
    const name = n as GuiEventName
    const handler = element[name] as AnyGuiEventHandler
    if (handler) {
      handlers[name] = getFuncName(handler, name)
    }
  }
  const tags: Partial<EventHandlerTags> = (element.elementMod && element.elementMod.tags) || {}
  tags["#guiEventHandlers"] = handlers
  return tags
}

function handleGuiEvent(eventName: GuiEventName, event: AnyGuiEventPayload) {
  // I want optional chaining!
  const element = event.element
  if (!element) return
  const handlers = element.tags["#guiEventHandlers"] as PRecord<string, string>
  if (!handlers) return
  const handlerName = handlers[eventName]
  if (!handlerName) return
  const ref = getFuncOrNil<AnyGuiEventHandler>(handlerName)
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
