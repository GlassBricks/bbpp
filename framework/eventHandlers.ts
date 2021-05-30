import { DEBUG, dlog } from "./logging"

export const customEvents = {
  dev_on_reload: script.generate_event_name(),
}

type ScriptEvents = "on_init" | "on_load" | "on_configuration_changed"

type EventName = keyof typeof defines.events
  | keyof typeof customEvents
  | ScriptEvents

/** @noSelf */
type EventHandler = (a: any) => any

/** @noSelf */
type EventHandlerContainer = {
  [N in EventName]?: EventHandler
}


const allEventIds: Partial<Record<EventName, { eventId?: any }>> = {
  on_init: {}, on_load: {}, on_configuration_changed: {},
}
for (const [name, eventId] of pairs(defines.events)) {
  allEventIds[name] = { eventId }
}
for (const [name, eventId] of pairs(customEvents)) {
  allEventIds[name] = { eventId }
}


const eventHandlers: {
  [e in EventName]?: Partial<Record<string, EventHandler>>
} = {}

export function registerHandlers(containerName: string, container: EventHandlerContainer) {
  dlog("Registering handlers for", containerName)
  for (const [eventName, handler] of pairs(container)) {
    const eventInfo = allEventIds[eventName]
    if (!eventInfo) {
      dlog("Error: no event named", eventName)
      continue
    }
    dlog("event", eventName)
    if (!eventHandlers[eventName]) {
      eventHandlers[eventName] = {}
      const handlers = eventHandlers[eventName]! //reference
      const handleEvent = (event: any) => {
        for (const [, handler] of pairs(handlers)) handler!(event)
      }
      if (eventInfo.eventId) {
        script.on_event(eventInfo.eventId, handleEvent)
      } else {
        const f = (script as any)[eventName] as (h: EventHandler) => void
        f(handleEvent)
      }
    }
    eventHandlers[eventName]![containerName] = handler!
  }
}

export function deregisterHandler(containerName: string, eventName: EventName) {
  const handlers = eventHandlers[eventName]
  if (!handlers || !handlers[containerName]) {
    dlog("Tried to deregister event handler ", containerName, ":", eventName, "but was not already registered")
    return
  }
  handlers[containerName] = undefined
}


if (DEBUG) {
  registerHandlers("debug", {
    on_tick: () => {
      script.raise_event(customEvents.dev_on_reload, {})
      deregisterHandler("debug", "on_tick")
    },
  })
}