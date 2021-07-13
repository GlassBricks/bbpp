import { userWarning } from "../logging"
import { EventHandlerContainer, registerHandlers } from "../events"
import { callBoundFunc, ComponentBoundFunc } from "./component"
import { getFuncOrNil } from "../funcRef"

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

type AnyGuiEventHandler = (this: any, element: LuaGuiElement, payload: AnyGuiEventPayload) => void

export interface EventHandlerTags {
  "#guiEventHandlers": PRecord<GuiEventName, string | ComponentBoundFunc<any>>
}

/** @noSelf */
function handleGuiEvent(eventName: GuiEventName, event: AnyGuiEventPayload) {
  // I want optional chaining!
  const element = event.element
  if (!element) return
  const handlers = (element.tags as unknown as EventHandlerTags)["#guiEventHandlers"]
  if (!handlers) return
  const handler = handlers[eventName]
  if (!handler) return

  if (typeof handler === "string") {
    const func = getFuncOrNil<AnyGuiEventHandler>({ "#registeredName": handler })
    if (!func) {
      userWarning(`There is no registered function named ${func}.
      Please report this to the mod author.
      Make sure you registered the function and/or migrations are working properly.
      Event name: ${eventName}, event: ${serpent.dump(event)}`)
    } else {
      func(element, event)
    }
  } else {
    callBoundFunc(handler, element, event)
  }
}

const handlers: EventHandlerContainer = {}

for (const [name, gameName] of pairs(guiEventNameMapping)) {
  handlers[gameName] = (payload: any) => {
    handleGuiEvent(name, payload)
  }
}
registerHandlers(handlers)
