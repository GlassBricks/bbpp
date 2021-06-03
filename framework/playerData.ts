import { registerHandlers } from "./events"

declare global {
  // noinspection JSUnusedGlobalSymbols
  interface Global {
    __playerData: PRecord<string, PRecord<number, any>>
  }
}

type PlayerData<T> = (playerIndex: number) => T

// TODO: migrations and stuff
export function PlayerData<T>(
  name: string,
  initData: (this: void, player: LuaPlayer) => T
): PlayerData<T> {
  let playerDatum: PRecord<number, T>

  function loadData() {
    if (!global.__playerData) {
      global.__playerData = {}
    }
    if (!global.__playerData[name]) {
      global.__playerData[name] = {}
    }
    playerDatum = global.__playerData[name]!
  }

  function initPlayer(player: LuaPlayer) {
    playerDatum[player.index] = initData(player)
  }

  registerHandlers({
    on_load: loadData,
    on_init: () => {
      loadData()
      for (const [, player] of pairs(game.players)) {
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
  return (index: number) => playerDatum[index]!
}
