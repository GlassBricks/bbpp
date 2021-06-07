/**
 * Simple framework for multiple files to register event handlers
 *
 * some currently hardcoded customEvents
 */
import { DEV } from "./DEV"

/** Custom events added via interface merging + manual assign id/name */
export interface CustomEvents {
}

export const customEvents: CustomEvents = {} as any

type ScriptEvents = "on_init" | "on_load" | "on_configuration_changed"

export type EventName = keyof typeof defines.events | keyof typeof customEvents | ScriptEvents

export type EventHandler = (this: unknown, a: any) => void

const allEventIds: PRecord<EventName, { eventId?: any }> = {
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

const eventHandlers: PRecord<EventName, EventHandler[]> = {}

function registerRootHandler(eventName: EventName, eventId: any | undefined) {
  eventHandlers[eventName] = []
  const handlers: EventHandler[] = eventHandlers[eventName]!
  const handleEvent = (event: any) => {
    for (const handler of handlers) handler(event)
  }
  if (eventId) {
    script.on_event(eventId, handleEvent)
  } else {
    const f = (script as any)[eventName] as (handler: any) => void
    f(handleEvent)
  }
}

export function registerHandler(eventName: EventName, handler: EventHandler): void {
  const eventInfo = allEventIds[eventName]
  if (!eventInfo) {
    throw `no event named ${eventName}`
  }
  if (!eventHandlers[eventName]) {
    registerRootHandler(eventName, eventInfo.eventId)
  }
  eventHandlers[eventName]!.push(handler)
}

export function registerHandlers(handlers: PRecord<EventName, EventHandler>): void {
  for (const [eventName, handler] of pairs(handlers)) {
    registerHandler(eventName, handler!)
  }
}

if (DEV) {
  registerHandler("on_init", () => {
    const freeplay = remote.interfaces.freeplay
    if (freeplay) {
      if (freeplay.set_skip_intro) remote.call("freeplay", "set_skip_intro", true)

      if (freeplay.set_disable_crashsite) remote.call("freeplay", "set_disable_crashsite", true)
    }
  })
}
