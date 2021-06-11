import { registerHandlers } from "./events"
import { dlog } from "./logging"

interface PlayerDataGlobal {
  "#playerData": Record<string, Record<number, any>>
}

declare const global: PlayerDataGlobal

export type PlayerData<T> = (playerIndex: number) => T

// eslint-disable-next-line @typescript-eslint/ban-types
export function PlayerData<T extends Object>(uniqueName: string, initData: (player: LuaPlayer) => T): PlayerData<T> {
  dlog("creating player data", uniqueName)
  let playerDatum: Record<number, T>

  function loadData() {
    if (!global["#playerData"][uniqueName]) {
      global["#playerData"][uniqueName] = {}
    }
    playerDatum = global["#playerData"][uniqueName]!
  }

  registerHandlers({
    on_init: loadData,
    on_load: loadData,
    on_player_created(e: OnPlayerCreatedPayload) {
      playerDatum[e.player_index] = initData(game.get_player(e.player_index))
    },
    on_player_removed(e: OnPlayerRemovedPayload) {
      if (!playerDatum) return
      playerDatum[e.player_index] = undefined as any
    },
  })
  return (index: number) => playerDatum[index]!
}

export function onPlayerInit(init: (player: LuaPlayer) => void): void {
  registerHandlers({
    on_init() {
      for (const [, player] of pairs(game.players)) {
        init(player)
      }
    },
    on_player_created(e: OnPlayerCreatedPayload) {
      init(game.get_player(e.player_index))
    },
  })
}

registerHandlers({
  on_init() {
    global["#playerData"] = {}
  },
})
