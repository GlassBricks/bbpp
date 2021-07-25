import { Colors, Prototypes } from "../constants"
import { BpSurface } from "./BpArea"
import { PasteActions, PasteActionTags, setupPasteActionBp } from "./pasteAction"
import { getValueOrReport } from "../framework/result"
import { divide, round, subtract } from "../framework/position"
import direction = defines.direction

interface PlaceAreaTags extends PasteActionTags {
  action: "placeArea"
  name: string
  chunkSize: Position
  boundaryThickness: number
}

export function startAreaPlacement(
  player: LuaPlayer,
  name: string,
  chunkSize: Position,
  boundaryThickness: number
): void {
  const bp = setupPasteActionBp(player)
  if (!bp) return

  const topLeft = {
    x: -(chunkSize.x * 16) + 16,
    y: -(chunkSize.y * 16) + 16,
  }
  const entities = BpSurface.createBoundaryTiles(
    [
      topLeft,
      {
        x: chunkSize.x * 16 + 16,
        y: chunkSize.y * 16 + 16,
      },
    ],
    boundaryThickness,
    Prototypes.tileEntityWhite
  ) as BlueprintEntity[]
  for (const [i, entity] of ipairs(entities)) {
    entity.entity_number = i
  }
  bp.set_blueprint_entities(entities)
  bp.set_blueprint_entity_tags(1, {
    action: "placeArea",
    name,
    chunkSize,
    boundaryThickness,
  } as PlaceAreaTags)

  const shiftX = ((chunkSize.x + 1) % 2) * 16
  const shiftY = ((chunkSize.y + 1) % 2) * 16
  bp.blueprint_snap_to_grid = [32, 32]
  bp.blueprint_position_relative_to_grid = [shiftX, shiftY]
  bp.blueprint_absolute_snapping = true

  player.cursor_stack.set_stack(bp)
}

PasteActions.placeArea = (player, event, tags: PlaceAreaTags) => {
  if (event.direction !== direction.north)
    return player.print("Rotating area placement is not yet supported.", Colors.red)

  const topLeft = round(subtract(divide(event.position, 32), divide(tags.chunkSize, 2)))

  const surface = BpSurface.get(player.surface)
  if (getValueOrReport(surface.tryCreateNewArea(tags.name, topLeft, tags.chunkSize, tags.boundaryThickness), player)) {
    player.clear_cursor()
  }
}
