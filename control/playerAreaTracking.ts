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
  const newArea = BpSurface.get(player.surface).getAreaAt(player.position)
  PlayerArea.set(player, newArea)
}

registerHandlers({
  on_player_changed_position: playerChangedPosition,
  on_player_changed_surface: playerChangedPosition,
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
