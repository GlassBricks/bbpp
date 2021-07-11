import { registerHandlers } from "./events"

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
