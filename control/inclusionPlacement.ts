import { PasteActions, PasteActionTags, setupPasteActionBp } from "./pasteAction"
import { BpArea, BpSurface } from "./BpArea"
import { add, Area, intersects, multiply, negate, subtract } from "../framework/position"
import { Prototypes } from "../constants"

interface InclusionPlacementTags extends PasteActionTags {
  action: "placeInclusion"
  areaId: number
  sourceAreaId: number
}

export function startInclusionPlacement(player: LuaPlayer, area: BpArea, sourceArea: BpArea): void {
  const bp = setupPasteActionBp(player)
  if (!bp) return

  const chunkSize = sourceArea.chunkSize
  const topLeft = {
    x: -(chunkSize.x * 16),
    y: -(chunkSize.y * 16),
  }
  const entities = BpSurface.createBoundaryTiles(
    [topLeft, negate(topLeft)],
    sourceArea.boundaryThickness,
    Prototypes.etherealTileEntityWhite
  ) as BlueprintEntity[]
  for (const [i, entity] of ipairs(entities)) {
    entity.entity_number = i
  }
  entities.push({
    entity_number: entities.length,
    name: Prototypes.pasteAction,
    position: [0, 0],
    tags: {
      action: "placeInclusion",
      areaId: area.id,
      sourceAreaId: sourceArea.id,
    } as InclusionPlacementTags,
  })
  bp.set_blueprint_entities(entities)
  bp.blueprint_snap_to_grid = undefined
  player.cursor_stack.set_stack(bp)
}

PasteActions.placeInclusion = (player, position, tags: InclusionPlacementTags) => {
  const area = BpArea.getByIdOrNil(tags.areaId)
  if (!area) {
    player.clear_cursor()
    return player.print("Original area was deleted.")
  }
  const sourceArea = BpArea.getByIdOrNil(tags.sourceAreaId)
  if (!sourceArea) {
    player.clear_cursor()
    return player.print("Source area was deleted.")
  }
  const halfSize = multiply(sourceArea.chunkSize, 16)
  const placementArea: Area = [subtract(position, halfSize), add(position, halfSize)]

  if (!intersects(placementArea, area.area)) {
    return player.print("Source area does not intersect current area.")
  }
  player.clear_cursor()
  area.addInclusion(sourceArea, subtract(position, area.center))
}
