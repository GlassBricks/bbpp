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

export type PlayerData<T> = {
  readonly data: Record<number, T>
}

export function PlayerData<T>(uniqueName: string, initData: (player: LuaPlayer) => T): PlayerData<T> {
  vlog("creating player data", uniqueName)
  const playerData: Mutable<PlayerData<T>> = {} as Mutable<PlayerData<T>>

  function loadData() {
    playerData.data = global.playerData[uniqueName]
    if (!global.playerData[uniqueName]) {
      playerData.data = {}
      global.playerData[uniqueName] = playerData.data
    }
  }

  registerHandlers({
    on_init() {
      loadData()
      for (const [index, player] of pairs(game.players)) {
        playerData.data[index as number] = initData(player)
      }
    },
    on_load: loadData,
    on_player_created(e) {
      playerData.data[e.player_index] = initData(game.get_player(e.player_index))
    },
    on_player_removed(e) {
      playerData.data[e.player_index] = undefined as any
    },
  })
  return playerData as PlayerData<T>
}

export function onPlayerInit(init: (player: LuaPlayer) => void): void {
  registerHandlers({
    on_init() {
      for (const [, player] of pairs(game.players)) {
        init(player)
      }
    },
    on_player_created(e) {
      init(game.get_player(e.player_index))
    },
  })
}
