import { PasteActions, PasteActionTags, setupPasteActionBp } from "./pasteAction"
import { BpArea, BpSurface } from "./BpArea"
import { Area, floor, intersects, negate, shift, subtract } from "../framework/position"
import { Colors, Prototypes } from "../constants"
import direction = defines.direction

interface InclusionPlacementTags extends PasteActionTags {
  action: "placeInclusion"
  areaId: number
  sourceAreaId: number
}

export function startInclusionPlacement(player: LuaPlayer, area: BpArea, sourceArea: BpArea): void {
  const bp = setupPasteActionBp(player)
  if (!bp) return

  const entities = sourceArea.dataBp.get_blueprint_entities() || []

  const chunkSize = sourceArea.chunkSize
  const topLeft = {
    x: -(chunkSize.x * 16),
    y: -(chunkSize.y * 16),
  }

  const tiles = BpSurface.createBoundaryTiles(
    [topLeft, negate(topLeft)],
    sourceArea.boundaryThickness,
    Prototypes.etherealTileEntityWhite
  ) as BlueprintEntity[]
  for (const [, tile] of ipairs(tiles)) {
    const length = entities.length
    tile.entity_number = length
    entities[length] = tile
  }

  bp.set_blueprint_entities(entities)
  bp.set_blueprint_entity_tags(1, {
    action: "placeInclusion",
    areaId: area.id,
    sourceAreaId: sourceArea.id,
  } as InclusionPlacementTags)
  bp.blueprint_snap_to_grid = [1, 1]
  bp.blueprint_absolute_snapping = true

  player.cursor_stack.set_stack(bp)
}

PasteActions.placeInclusion = (player, event, tags: InclusionPlacementTags) => {
  const area = BpArea.getByIdOrNil(tags.areaId)
  if (!area) {
    player.clear_cursor()
    return player.print("Original area was deleted.", Colors.red)
  }
  const sourceArea = BpArea.getByIdOrNil(tags.sourceAreaId)
  if (!sourceArea) {
    player.clear_cursor()
    return player.print("Source area was deleted.", Colors.red)
  }
  if (event.flip_horizontal || event.flip_vertical || event.direction !== direction.north) {
    return player.print("Rotating and flipping inclusions is not yet supported.", Colors.red)
  }
  const center = floor(event.position)
  const placementArea: Area = shift(sourceArea.areaRelativeToCenter, center)

  if (!intersects(placementArea, area.area)) {
    return player.print("Source area does not intersect current area.", Colors.red)
  }
  player.clear_cursor()
  area.addInclusion(sourceArea, subtract(center, area.center))
}
