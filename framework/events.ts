/**
 * Simple framework for multiple files to register event handlers
 */
import { DEV } from "./DEV"

interface ScriptEvents {
  on_init: EventId<undefined>
  on_load: EventId<undefined>
  on_configuration_changed: EventId<ConfigurationChangedData>
}

export type GameEvents = typeof defines.events & ScriptEvents
export type GameEventName = keyof GameEvents
export type EventName = GameEventName | EventId<any>

export type GetPayload<N extends EventId<any>> = NonNullable<N["#payloadType"]>
export type PayloadOf<N extends EventName> = N extends EventId<any>
  ? GetPayload<N>
  : N extends GameEventName
  ? GetPayload<GameEvents[N]>
  : unknown
export type EventHandler<N extends EventName> = (event: PayloadOf<N>) => void

// lack of event id => script event
const isScriptEvent: Record<keyof ScriptEvents, true> & PRecord<any, boolean> = {
  on_configuration_changed: true,
  on_init: true,
  on_load: true,
}
const eventHandlers: PRecord<any, EventHandler<any>[]> = {}

function registerRootHandler(eventKey: EventId<any> | keyof ScriptEvents) {
  const handlers: EventHandler<any>[] = (eventHandlers[eventKey] = []) // typescript refuses to behave
  /** @noSelf */
  const handleEvent = (event?: any) => {
    for (const handler of handlers) {
      handler(event)
    }
  }
  if (typeof eventKey === "string") {
    script[eventKey](handleEvent)
  } else {
    script.on_event(eventKey, handleEvent)
  }
}

export function registerHandler<N extends EventName>(eventName: N, handler: EventHandler<N>): void {
  let eventKey: any
  if (isScriptEvent[eventName]) {
    eventKey = eventName
  } else if (eventName in defines.events) {
    eventKey = defines.events[eventName as keyof typeof defines.events]
  } else if (type(eventName) === "number") {
    eventKey = eventName
  } else {
    error("No event with name" + eventName)
  }
  if (!eventHandlers[eventKey]) {
    registerRootHandler(eventKey)
  }
  table.insert(eventHandlers[eventKey]!, handler)
}

export type EventHandlerContainer = {
  [N in EventName]?: EventHandler<N>
}

export function registerHandlers(handlers: EventHandlerContainer): void {
  for (const [eventName, handler] of pairs(handlers)) {
    registerHandler(eventName, handler as EventHandler<any>)
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
