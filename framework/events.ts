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
export type EventHandler<Payload> = (event: Payload) => void

// lack of event id => script event
function isScriptEvent(name: unknown): name is keyof ScriptEvents {
  return name === "on_init" || name === "on_load" || name === "on_configuration_changed"
}

const eventHandlers: PRecord<any, EventHandler<any>[]> = {}

function registerRootHandler(eventKey: keyof ScriptEvents | EventId<any> | string) {
  const handlers: EventHandler<any>[] = (eventHandlers[eventKey] = [])
  /** @noSelf */
  const handleEvent = (event?: unknown) => {
    for (const handler of handlers) {
      handler(event)
    }
  }
  if (isScriptEvent(eventKey)) {
    script[eventKey](handleEvent)
  } else {
    script.on_event(eventKey as any, handleEvent)
  }
}

export function registerHandler<N extends keyof GameEvents>(
  eventName: N,
  handler: EventHandler<GetPayload<GameEvents[N]>>
): void
export function registerHandler<N extends EventId<any>>(eventName: N, handler: EventHandler<GetPayload<N>>): void
export function registerHandler<N extends CustomInputName>(eventName: N, handler: EventHandler<CustomInputEvent>): void
export function registerHandler(eventName: any, handler: EventHandler<any>): void {
  const eventKey = defines.events[eventName as keyof typeof defines.events] || eventName

  if (!eventHandlers[eventKey]) {
    registerRootHandler(eventKey)
  }
  table.insert(eventHandlers[eventKey]!, handler)
}

export type EventHandlerContainer = {
  [N in keyof GameEvents]?: EventHandler<GameEvents[N]["#payloadType"]>
}

export function registerHandlers(handlers: EventHandlerContainer): void {
  for (const [eventName, handler] of pairs(handlers)) {
    // eslint-disable-next-line
    registerHandler(eventName as any, handler as EventHandler<any>)
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
