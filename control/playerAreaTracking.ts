import { BpArea, BpSet } from "./BpArea"
import { ObservablePlayerData } from "../framework/playerData"
import { registerHandlers } from "../framework/events"
import { add, getCenter, subtract } from "../framework/position"

// player tracking
interface PlayerArea {
  bpSet: BpSet | undefined
  area: BpArea | undefined
}

export const PlayerArea = new ObservablePlayerData<PlayerArea>("AreaNav:PlayerPosition", (player) => {
  const bpSet = BpSet.getBySurfaceIndexOrNil(player.surface.index)
  return {
    bpSet: bpSet,
    area: bpSet && bpSet.getAreaAt(player.position),
  }
})

function playerChangedPosition(player: LuaPlayer) {
  const posCache = PlayerArea.get(player.index)
  const bpSet = posCache.bpSet
  if (!bpSet) return
  const area = bpSet.getAreaAt(player.position)

  if (posCache.area !== area) {
    PlayerArea.set(player.index, {
      bpSet: posCache.bpSet,
      area,
    })
  }
}

function playerChangedSurface(player: LuaPlayer) {
  const posCache = PlayerArea.get(player.index)
  const surfaceIndex = player.surface.index
  const newBpSet = BpSet.getBySurfaceIndexOrNil(surfaceIndex)
  const oldBpSet = posCache.bpSet
  if (oldBpSet !== newBpSet) {
    PlayerArea.set(player.index, {
      bpSet: newBpSet,
      area: undefined,
    })
    playerChangedPosition(player)
  }
}

registerHandlers({
  on_player_changed_position(e) {
    playerChangedPosition(game.get_player(e.player_index))
  },
  on_player_changed_surface(e) {
    playerChangedSurface(game.get_player(e.player_index))
  },
})

export function teleportPlayerToArea(player: LuaPlayer, area: BpArea): void {
  const currentArea = PlayerArea.get(player.index).area
  const position =
    currentArea !== undefined && currentArea.bpSet === area.bpSet
      ? add(area.area[0], subtract(player.position, currentArea.area[0]))
      : getCenter(area.area)
  player.teleport(position, area.surfaces.user)
}
