/**
 * Simple framework for multiple files to register event handlers
 *
 * some currently hardcoded customEvents
 *
 * This will probably change in the future
 */
import { DEV } from "./DEV"

/**
 * Custom events added via interface merging + manual assign id/name
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CustomEvents {}

export const customEvents: CustomEvents = {} as any

interface ScriptEvents {
  on_init: EventId<undefined>
  on_load: EventId<undefined>
  on_configuration_changed: EventId<ConfigurationChangedData>
}

export type GameEvents = typeof defines.events
export type AllEvents = GameEvents & ScriptEvents & CustomEvents

export type EventName = keyof AllEvents
export type PayloadOf<N extends EventName> = AllEvents[N] extends EventId<infer Payload> ? Payload : any
export type EventHandler<N extends EventName> = (event: PayloadOf<N>) => void

// lack of event id => script event
// Should also check customEvents
const eventInfos: PRecord<EventName, { eventId?: EventId<any> }> = {
  on_init: {},
  on_load: {},
  on_configuration_changed: {},
}
for (const [name, eventId] of pairs(defines.events)) {
  eventInfos[name] = { eventId }
}

const eventHandlers: PRecord<EventName, EventHandler<any>[]> = {}

function registerRootHandler(eventName: EventName, eventId: EventId<any> | undefined) {
  eventHandlers[eventName] = []
  const handlers = eventHandlers[eventName]!
  /** @noSelf */
  const handleEvent = (event: any) => {
    for (const handler of handlers) {
      handler(event)
    }
  }
  if (eventId) {
    script.on_event(eventId, handleEvent)
  } else {
    const f = (script as any)[eventName] as (this: void, handler: any) => void
    f(handleEvent)
  }
}

export function registerHandler<N extends EventName>(eventName: N, handler: EventHandler<N>): void {
  const eventInfo = eventInfos[eventName] || (customEvents as any)[eventName]
  if (!eventInfo) {
    error(`no event named ${eventName}`)
  }
  if (!eventHandlers[eventName]) {
    registerRootHandler(eventName, eventInfo.eventId)
  }
  table.insert(eventHandlers[eventName]!, handler)
}

export type EventHandlerContainer = {
  [N in EventName]?: (event: AllEvents[N] extends EventId<infer Payload> ? Payload : any) => void
}

export function registerHandlers(handlers: EventHandlerContainer): void {
  for (const [eventName, handler] of pairs(handlers)) {
    registerHandler<any>(eventName, handler)
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
