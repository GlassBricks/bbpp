/**
 * Simple framework for multiple files to register event handlers
 *
 * some currently hardcoded customEvents
 */

import { dlog } from "./logging"

export const customEvents = {}

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

function registerScriptHandler(
  eventName: EventName,
  eventInfo: { eventId?: any }
) {
  eventHandlers[eventName] = []
  const handlers = eventHandlers[eventName]! //reference
  const handleEvent = (event: any) => {
    for (const handler of handlers) handler!(event)
  }
  if (eventInfo.eventId) {
    script.on_event(eventInfo.eventId, handleEvent)
  } else {
    const f = (script as any)[eventName] as (h: EventHandler) => void
    f(handleEvent)
  }
}

export function registerHandler(eventName: EventName, handler: EventHandler) {
  const eventInfo = allEventIds[eventName]
  if (!eventInfo) {
    error(`no event named ${eventName}`)
    return
  }
  dlog("event", eventName)
  if (!eventHandlers[eventName]) {
    registerScriptHandler(eventName, eventInfo)
  }
  eventHandlers[eventName]!.push(handler)
}

export function registerHandlers(handlers: EventHandlerContainer) {
  for (const [eventName, handler] of pairs(handlers)) {
    registerHandler(eventName, handler!)
  }
}
