import { BpArea, BpSurface } from "./BpArea"
import { registerHandlers } from "../framework/events"
import { add, getCenter, isIn, subtract } from "../framework/position"
import { ObservablePlayerData } from "../framework/playerData"

// player tracking
export const PlayerArea = new ObservablePlayerData("PlayerArea", (player) => {
  const bpSurface = BpSurface.get(player.surface)
  return bpSurface.getAreaAt(player.position)
})

function playerChangedPosition(e: OnPlayerChangedPositionPayload) {
  const player = game.get_player(e.player_index)
  const area = BpSurface.get(player.surface).getAreaAt(player.position)
  PlayerArea.set(player, area)
}

registerHandlers({
  on_player_changed_position: playerChangedPosition,
  on_player_changed_surface: playerChangedPosition,
})

BpArea.onCreated.subscribe((area) => {
  for (const [, player] of pairs(game.players)) {
    if (PlayerArea.get(player)) return
    if (isIn(player.position, area.area)) {
      PlayerArea.set(player, area)
      return
    }
  }
})

BpArea.onDeleted.subscribe((event) => {
  for (const [, player] of pairs(game.players)) {
    const currentArea = PlayerArea.get(player)
    if (currentArea && currentArea.id === event.id) {
      PlayerArea.set(player, undefined)
      return
    }
  }
})

export function teleportPlayerToArea(player: LuaPlayer, area: BpArea): void {
  const lastArea = PlayerArea.get(player)
  let position: Position = getCenter(area.area)
  if (lastArea !== undefined) {
    const relativePosition = add(area.center, subtract(player.position, lastArea.center))
    if (isIn(relativePosition, area.area)) {
      position = relativePosition
    }
  }
  player.teleport(position, area.surface)
}
