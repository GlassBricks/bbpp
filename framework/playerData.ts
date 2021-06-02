import { registerHandlers } from "./events"
import { dlog } from "./logging"

declare global {
  // noinspection JSUnusedGlobalSymbols
  interface Global {
    __playerData: PRecord<string, PlayerData<any>>
  }
}

type PlayerData<T> = Record<number, T>

// TODO: migrations and stuff
export function createPlayerData<T>(
  name: string,
  initData: (this: void, player: LuaPlayer) => T,
  onInit?: (this: void, player: LuaPlayer, data: T) => void
): PlayerData<T> {
  if (!global.__playerData) {
    global.__playerData = {}
  }
  dlog("creating player data:", name)
  if (!global.__playerData[name]) {
    global.__playerData[name] = {}
  }
  const playerDatum: PRecord<number, T> = global.__playerData[name]!

  function initPlayer(player: LuaPlayer) {
    let data = initData(player)
    playerDatum[player.index] = data
    if (onInit) {
      onInit(player, data)
    }
  }

  registerHandlers({
    on_init: () => {
      for (let [, player] of pairs(game.players)) {
        initPlayer(player)
      }
    },
    on_player_created: (e: OnPlayerCreatedPayload) => {
      initPlayer(game.get_player(e.player_index))
    },
    on_player_removed: (e: OnPlayerRemovedPayload) => {
      playerDatum[e.player_index] = undefined
    },
  })
  return playerDatum as PlayerData<T>
}
