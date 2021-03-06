import { EventHandlerContainer, registerHandlers } from "../events"
import { FuncRef } from "../funcRef"
import { callGuiFunc } from "./component"

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

export interface AnyGuiEventPayload {
  element: LuaGuiElement
  player_index: number
}

type AnyGuiEventHandler = (this: unknown, element: LuaGuiElement, payload: AnyGuiEventPayload) => void

export interface EventHandlerTags {
  "#guiEventHandlers": PRecord<GuiEventName, FuncRef<AnyGuiEventHandler>>
}

/** @noSelf */
function handleGuiEvent(eventName: GuiEventName, event: AnyGuiEventPayload) {
  const element = event.element
  if (!element) return
  const handlers = (element.tags as EventHandlerTags)["#guiEventHandlers"]
  if (!handlers) return
  const handler = handlers[eventName]
  if (!handler) return
  callGuiFunc(handler, element, event)
}

const handlers: EventHandlerContainer = {}

for (const [name, gameName] of pairs(guiEventNameMapping)) {
  handlers[gameName] = (payload: any) => {
    handleGuiEvent(name, payload)
  }
}
registerHandlers(handlers)
