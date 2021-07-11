import { registerHandlers } from "./events"
import { vlog } from "./logging"

interface PlayerDataGlobal {
  playerData: Record<string, Record<number, any>>
}

declare const global: PlayerDataGlobal

registerHandlers({
  on_init() {
    global.playerData = {}
  },
})

interface Data<T> {
  data: Record<number, T>
}

function setupPlayerData<T>(holder: Data<T>, uniqueName: string, initData: (player: LuaPlayer) => T) {
  vlog("creating player holder", uniqueName)
  const loadData = () => {
    holder.data = global.playerData[uniqueName]
    if (!global.playerData[uniqueName]) {
      holder.data = {}
      global.playerData[uniqueName] = holder.data
    }
  }

  registerHandlers({
    on_init: () => {
      loadData()
      for (const [index, player] of pairs(game.players)) {
        holder.data[index as number] = initData(player)
      }
    },
    on_load: loadData,
    on_player_created: (e) => {
      holder.data[e.player_index] = initData(game.get_player(e.player_index))
    },
    on_player_removed: (e) => {
      holder.data[e.player_index] = undefined as any
    },
  })
}

export interface PlayerData<T> {
  readonly data: Record<number, T>
}

export function PlayerData<T>(uniqueName: string, initData: (player: LuaPlayer) => T): PlayerData<T> {
  const result = { data: {} }
  setupPlayerData(result, uniqueName, initData)
  return result
}

export type PlayerDataObserver<T> = (playerIndex: number, oldValue: T, newValue: T) => void

export class ObservablePlayerData<T> {
  private data!: Record<number, T>
  private readonly observers: PlayerDataObserver<T>[] = []

  constructor(uniqueName: string, initData: (player: LuaPlayer) => T) {
    setupPlayerData(this as unknown as Data<T>, uniqueName, initData)
  }

  addObserver(observer: PlayerDataObserver<T>): void {
    this.observers[this.observers.length] = observer
  }

  get(playerIndex: number): Readonly<T> {
    return this.data[playerIndex]
  }

  set(playerIndex: number, newValue: T): void {
    const oldValue = this.data[playerIndex]
    this.data[playerIndex] = newValue
    for (const observer of this.observers) {
      observer(playerIndex, oldValue, newValue)
    }
  }
}
