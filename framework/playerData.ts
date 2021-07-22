import { registerHandler, registerHandlers } from "./events"
import { vlog } from "./logging"

declare const global: {
  playerData: Record<string, Record<number, unknown>>
}

registerHandlers({
  on_init() {
    global.playerData = {}
  },
})

interface Data<T> {
  data: Record<number, T>
}

/** @noSelf */
function setupPlayerData<T>(
  holder: Data<T>,
  uniqueName: string,
  initData: ((player: LuaPlayer) => T) | undefined
): void {
  vlog("creating player data", uniqueName)
  const loadData = () => {
    holder.data = global.playerData[uniqueName] as Record<number, T>
    if (!global.playerData[uniqueName]) {
      holder.data = {}
      global.playerData[uniqueName] = holder.data
    }
  }
  if (initData) {
    registerHandlers({
      on_init() {
        loadData()
        for (const [index, player] of pairs(game.players)) {
          holder.data[index as number] = initData(player)
        }
      },
      on_player_created: (e) => {
        holder.data[e.player_index] = initData(game.get_player(e.player_index))
      },
    })
  } else {
    registerHandler("on_init", loadData)
  }
  registerHandlers({
    on_load: loadData,
    on_player_removed: (e) => {
      holder.data[e.player_index] = undefined as any
    },
  })
}

export interface PlayerData<T> {
  readonly data: Record<number, T>
}

/** @noSelf */
export function PlayerData<T>(uniqueName: string): PlayerData<T | undefined>
/** @noSelf */
export function PlayerData<T>(uniqueName: string, initData: (player: LuaPlayer) => T): PlayerData<T>
/** @noSelf */
export function PlayerData<T>(uniqueName: string, initData?: (player: LuaPlayer) => T): PlayerData<T> {
  const result = { data: {} }
  setupPlayerData(result, uniqueName, initData)
  return result
}

export interface PlayerDataChangedEvent<T> {
  player: LuaPlayer
  oldValue: T
  newValue: T
}

export type PlayerDataObserver<T> = (event: PlayerDataChangedEvent<T>) => void

export class ObservablePlayerData<T> {
  private data!: Record<number, T>
  private readonly observers: PlayerDataObserver<T>[] = []

  constructor(uniqueName: string, initData: (player: LuaPlayer) => T) {
    setupPlayerData(this as unknown as Data<T>, uniqueName, initData)
  }

  subscribe(observer: PlayerDataObserver<T>): void {
    this.observers[this.observers.length] = observer
  }

  get(player: LuaPlayer): T {
    return this.data[player.index]
  }

  set(player: LuaPlayer, newValue: T): void {
    const oldValue = this.data[player.index]
    if (oldValue === newValue) return
    this.data[player.index] = newValue
    for (const observer of this.observers) {
      observer({ player, oldValue, newValue })
    }
  }
}
