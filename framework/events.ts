/**
 * Simple framework for multiple files to register event handlers
 *
 * some currently hardcoded customEvents
 */

export const customEvents = {
  ugg_toggle_interface: "ugg_toggle_interface",
}

type ScriptEvents = "on_init" | "on_load" | "on_configuration_changed"

export type EventName =
  | keyof typeof defines.events
  | keyof typeof customEvents
  | ScriptEvents

type EventHandler = (a: any) => void

export type EventHandlerContainer = {
  [N in EventName]?: EventHandler
}

const allEventIds: Partial<Record<EventName, { eventId?: any }>> = {
  on_init: {},
  on_load: {},
  on_configuration_changed: {},
}
for (const [name, eventId] of pairs(defines.events)) {
  allEventIds[name] = { eventId }
}
for (const [name, eventId] of pairs(customEvents)) {
  ;(allEventIds as any)[name] = { eventId }
}

const eventHandlers: {
  [e in EventName]?: EventHandler[]
} = {}

export function registerHandler(
  eventName: EventName,
  handler: EventHandler
): void {
  const eventInfo = allEventIds[eventName]
  if (!eventInfo) {
    throw `no event named ${eventName}`
  }
  if (!eventHandlers[eventName]) {
    eventHandlers[eventName] = []
    const handlers: EventHandler[] = (eventHandlers[eventName] = [])
    const handleEvent = (event: any) => {
      for (const h of handlers) h(event)
    }
    if (eventInfo.eventId) {
      script.on_event(eventInfo.eventId, handleEvent)
    } else {
      const f = (script as any)[eventName] as (h: EventHandler) => void
      f(handleEvent)
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  eventHandlers[eventName]!.push(handler)
}

export function registerHandlers(handlers: EventHandlerContainer): void {
  for (const [eventName, handler] of pairs(handlers)) {
    registerHandler(eventName, handler)
  }
}
