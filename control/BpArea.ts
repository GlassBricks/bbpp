import { userWarning } from "../framework/logging"
import { registerHandlers } from "../framework/events"
import { arrayRemoveValue, isEmpty } from "../framework/util"
import { add, Area, elemMul, getCenter, subtract } from "../framework/position"
import { Prototypes } from "../constants"
import { get, put, VectorTable, vectorTableRemoveValue } from "../framework/VectorTable"
import { getEntityData, setEntityData } from "../framework/entityData"
import { getBpForce } from "./forces"

// global
interface BpAreasGlobal {
  nextBpSetId: number
  bpSetById: PRecord<number, BpSet>
  bpSetBySurfaceIndex: PRecord<number, BpSet>

  nextBpAreaId: number
  bpAreaById: PRecord<number, BpArea>
}

declare const global: BpAreasGlobal

registerHandlers({
  on_init() {
    global.nextBpSetId = 1
    global.bpSetById = {}
    global.bpSetBySurfaceIndex = {}

    global.nextBpAreaId = 1
    global.bpAreaById = {}
  },
  on_load() {
    for (const [, set] of pairs(global.bpSetById)) {
      setmetatable(set, BpSet.prototype as any)
    }
    for (const [, area] of pairs(global.bpAreaById)) {
      setmetatable(area, BpArea.prototype as any)
    }
  },
})

export class BpSet {
  readonly id: number
  valid: boolean = true

  readonly surface: LuaSurface
  readonly surfaceIndex: number

  readonly blockSize: Position

  readonly areas: BpArea[] = []
  // [x][y]=id
  private readonly bpAreasByGrid: VectorTable<BpArea> = {}

  // <editor-fold desc="Creation and deletion">
  constructor(
    public name: string,
    surface: LuaSurface,
    bpSize: Position,
    public readonly boundarySize: number // public gridSize: Position
  ) {
    if (global.bpSetBySurfaceIndex[surface.index]) {
      error("BpSet already exists on this surface")
    }
    this.id = global.nextBpSetId++
    this.surface = surface
    this.surfaceIndex = surface.index
    this.blockSize = add(bpSize, { x: boundarySize, y: boundarySize })
    global.bpSetById[this.id] = this
    global.bpSetBySurfaceIndex[surface.index] = this
  }

  static getByIdOrNil(id: number): BpSet | undefined {
    return global.bpSetById[id]
  }

  static getById(id: number): BpSet {
    return global.bpSetById[id] ?? error(`No bpSet with id ${id}`)
  }

  static bpSetById(): Readonly<PRecord<number, BpSet>> {
    return global.bpSetById
  }

  static getBySurfaceIndexOrNil(surfaceIndex: number): BpSet | undefined {
    return global.bpSetBySurfaceIndex[surfaceIndex]
  }

  delete(): void {
    if (!this.valid) return
    this.valid = false
    if (this.surface.valid) game.delete_surface(this.surface)
    global.bpSetById[this.id] = undefined
    global.bpSetBySurfaceIndex[this.surfaceIndex] = undefined
    for (const area of this.areas) {
      area.delete()
    }
  }

  // </editor-fold>

  // <editor-fold desc="Areas">
  createNewArea(name: string, blockPosition: Position): BpArea {
    const bpArea = BpArea._create(this, blockPosition, name)

    this.areas[this.areas.length] = bpArea
    put(this.bpAreasByGrid, blockPosition.x, blockPosition.y, bpArea)

    return bpArea
  }

  getAreaAt(position: Position): BpArea | undefined {
    const blockX = Math.floor(position.x / this.blockSize.x)
    const blockY = Math.floor(position.y / this.blockSize.y)
    return get(this.bpAreasByGrid, blockX, blockY)
  }

  _areaDeleted(area: BpArea): void {
    // todo: go to EVERY area referenced and delete
    assert(!area.valid)
    if (!this.valid) return

    arrayRemoveValue(this.areas, area)
    vectorTableRemoveValue(this.bpAreasByGrid, area)
  }

  // </editor-fold>
}

registerHandlers({
  on_surface_deleted(e) {
    const bpSet = global.bpSetBySurfaceIndex[e.surface_index]
    if (bpSet && bpSet.valid) {
      userWarning("NOTE: bpSet surface deleted outside of bbpp mod.")
      bpSet.delete()
    }
  },
})

export enum IncludeMode {
  Never,
  Keep,
  // New, // todo
  All,
}

export interface AreaRelation {
  areaId: number
  relativePosition: Position
  viewing: boolean
  includeMode: IncludeMode
  // viewFilter: ??
  // autoIncludeFilter: ??
}

interface AreaRelationInternal extends AreaRelation {
  includeBpLuaIndex: number
}

export interface BpAreaEntityData {
  areaId: number
  relationLuaIndex: number
}

// TODO: BpAreas changed event/listeners

export class BpArea {
  readonly id: number
  valid: boolean = true

  readonly surface: LuaSurface

  readonly area: Area
  readonly center: Position
  readonly relations: AreaRelationInternal[] = []
  editingAreaId: number
  readonly bpInventory: LuaInventory = game.create_inventory(8)
  readonly dataBp = this.bpInventory[1]
  private readonly includeBps: LuaInventory

  public static readonly boundaryTile = Prototypes.boundaryTileWhite

  // <editor-fold desc="Creation and deletion">

  private constructor(public readonly bpSet: BpSet, area: Area, public name: string) {
    this.id = global.nextBpAreaId++
    this.surface = this.bpSet.surface

    this.area = area
    this.center = getCenter(area)

    this.dataBp.set_stack({ name: "blueprint" })
    this.bpInventory[2].set_stack({ name: "blueprint-book" })
    this.includeBps = this.bpInventory[2].get_inventory(defines.inventory.item_main)!
    this.editingAreaId = this.id

    this.addRelation({
      areaId: this.id,
      includeMode: IncludeMode.All,
      relativePosition: { x: 0, y: 0 },
      viewing: false,
    })

    global.bpAreaById[this.id] = this
  }

  static _create(set: BpSet, blockPosition: Position, name: string): BpArea {
    const topLeft = elemMul(blockPosition, set.blockSize)
    const fullArea: Area = [topLeft, add(topLeft, set.blockSize)]
    this.setupArea(set.surface, fullArea, set.boundarySize)
    const useArea: Area = [add(topLeft, { x: set.boundarySize, y: set.boundarySize }), fullArea[1]]
    return new BpArea(set, useArea, name)
  }

  private static setupArea(surface: LuaSurface, fullArea: Area, boundarySize: number): void {
    // generate chunks
    for (const x of $range(Math.floor(fullArea[0].x / 32), Math.ceil((fullArea[1].x + boundarySize) / 32))) {
      for (const y of $range(Math.floor(fullArea[0].y / 32), Math.ceil((fullArea[1].y + boundarySize) / 32))) {
        if (!surface.is_chunk_generated([x, y])) {
          surface.build_checkerboard([
            [x * 32, y * 32],
            [x * 32 + 32, y * 32 + 32],
          ])
          surface.set_chunk_generated_status([x, y], defines.chunk_generated_status.entities)
        }
      }
    }
    // setup boundaries
    const tiles: Tile[] = []
    for (let t = 0; t < boundarySize; t++) {
      for (let x = fullArea[0].x + boundarySize; x < fullArea[1].x; x++) {
        tiles.push(
          {
            name: BpArea.boundaryTile,
            position: { x: x + 0.5, y: fullArea[0].y + t + 0.5 },
          },
          {
            name: BpArea.boundaryTile,
            position: { x: x + 0.5, y: fullArea[1].y + t + 0.5 },
          }
        )
      }
      for (let y = fullArea[0].y; y < fullArea[1].y + boundarySize; y++) {
        tiles.push(
          {
            name: BpArea.boundaryTile,
            position: { x: fullArea[0].x + t + 0.5, y: y + 0.5 },
          },
          {
            name: BpArea.boundaryTile,
            position: { x: fullArea[1].x + t + 0.5, y: y + 0.5 },
          }
        )
      }
    }
    surface.set_tiles(tiles)
  }

  static getByIdOrNil(id: number): BpArea | undefined {
    return global.bpAreaById[id]
  }

  static getById(id: number): BpArea {
    const area = global.bpAreaById[id]
    if (!area) {
      error(`No user area with id ${id}`)
    }
    return area
  }

  delete(): void {
    if (!this.valid) return
    this.valid = false
    this.bpInventory.destroy()
    global.bpAreaById[this.id] = undefined
    this.bpSet._areaDeleted(this)
  }

  // <editor-fold desc="Relations">
  addRelation(relation: AreaRelation): void {
    this.relations[this.relations.length] = {
      includeBpLuaIndex: this.findIncludeBpSlot(),
      ...relation,
    }
  }

  writeChanges(): void {
    this.writeBlueprint(BpArea.getById(this.editingAreaId)!.dataBp, "player", undefined)
    for (const i of $range(1, this.relations.length)) {
      const relation = this.relations[i - 1]
      if (relation.includeMode !== IncludeMode.Keep) continue // TODO; also && !== New
      this.writeBlueprint(this.includeBps[relation.includeBpLuaIndex], getBpForce("include", true), i)
    }
  }

  // </editor-fold>

  resetArea(): void {
    this.deleteAllEntities()
    this.placeRelations()
  }

  private rawPlaceBlueprint(bp: LuaItemStack, position: Position, force: ForceSpecification, forceBuild: boolean) {
    return bp.build_blueprint({
      surface: this.surface,
      position,
      force,
      skip_fog_of_war: false,
      force_build: forceBuild,
    })
  }

  deleteViewOnlyEntities(): void {
    this.surface
      .find_entities_filtered({
        area: this.area,
        force: getBpForce("view", false),
      })
      .forEach((x) => x.destroy())

    this.surface
      .find_entities_filtered({
        area: this.area,
        force: getBpForce("view", true),
      })
      .forEach((x) => x.destroy())
  }

  private findIncludeBpSlot(): number {
    const [, index] = this.includeBps.find_empty_stack()
    if (index) {
      this.includeBps[index].set_stack({ name: "blueprint" })
      return index
    }
    const newIndex = this.includeBps.size() + 1
    this.includeBps.insert({ name: "blueprint" })
    return newIndex
  }

  // <editor-fold desc="Area editing">
  private deleteAllEntities() {
    const entities = this.surface.find_entities_filtered({
      area: this.area,
      type: "character",
      invert: true,
    })
    for (const entity of entities) {
      entity.destroy()
    }
  }

  private placeBlueprint(
    bp: LuaItemStack,
    relativePosition: Position,
    force: ForceSpecification,
    relationLuaIndex: number | undefined,
    editable: boolean,
    active: boolean
  ) {
    if (!bp.get_blueprint_entities()) return
    const position = add(this.center, relativePosition)
    let ghosts = this.rawPlaceBlueprint(bp, position, force, false)
    if (isEmpty(ghosts)) {
      userWarning(
        "Overlapping entities (blueprint failed to place without force-build). Manual checking will be introduced in a future release."
      )
      // todo: manual overlap detection
      ghosts = this.rawPlaceBlueprint(bp, position, force, true)
    }
    for (const ghost of ghosts) {
      const [, entity] = ghost.silent_revive()
      if (!entity) {
        userWarning("could not revive ghost (something in the way?)")
        continue
      }
      // entity.destructible = editable
      entity.minable = editable
      entity.rotatable = editable
      entity.operable = active
      entity.active = active
      if (relationLuaIndex !== undefined) {
        setEntityData<BpAreaEntityData>(entity, {
          areaId: this.id,
          relationLuaIndex, // todo: make less volatile
        })
      }
    }
  }

  private placeRelations() {
    for (const i of $range(1, this.relations.length)) {
      const relation = this.relations[i - 1]
      const otherArea = BpArea.getByIdOrNil(relation.areaId)
      if (!otherArea) {
        userWarning("Area relation includes an invalid area. Skipping...")
        continue
      }
      if (relation.areaId === this.editingAreaId) {
        this.placeBlueprint(otherArea.dataBp, relation.relativePosition, "player", undefined, true, true)
        // todo: make editing overwrite others
        continue
      }

      switch (relation.includeMode) {
        case IncludeMode.Never:
          break
        case IncludeMode.Keep:
          this.placeBlueprint(
            this.includeBps[relation.includeBpLuaIndex],
            relation.relativePosition,
            getBpForce("include", true),
            i,
            false,
            true
          )
          break
        case IncludeMode.All:
          this.placeBlueprint(otherArea.dataBp, relation.relativePosition, getBpForce("include", false), i, false, true)
          break
      }
      if (relation.viewing && relation.includeMode !== IncludeMode.All) {
        // todo: should be active or not?
        // todo: make ghosts
        this.placeBlueprint(
          otherArea.dataBp,
          relation.relativePosition,
          getBpForce("view", relation.includeMode === IncludeMode.Keep),
          i,
          false,
          false
        )
      }
    }
  }

  private writeBlueprint(bp: LuaItemStack, force: ForceSpecification, relationLuaIndex: number | undefined) {
    const entityMapping = bp.create_blueprint({
      surface: this.surface,
      force,
      area: this.area,
      include_entities: true, // TODO: make configurable
      include_modules: true,
      include_trains: true,
      include_station_names: true,
      include_fuel: true,
    })
    if (isEmpty(entityMapping)) return

    const bpEntities = bp.get_blueprint_entities()!
    const l = bpEntities.length
    for (let i = 1; i <= l; i++) {
      const bpEntity = bpEntities[i - 1]!
      const entity = entityMapping[i]
      if (relationLuaIndex) {
        const entityData = getEntityData<BpAreaEntityData>(entity)
        if (!entityData || entityData.relationLuaIndex !== relationLuaIndex) {
          bpEntities[i - 1] = undefined as any
          continue
        }
      }
      bpEntity.position = subtract(entity.position, this.center) // todo: replace center with actual location
    }
    bp.set_blueprint_entities(bpEntities)
    bp.blueprint_snap_to_grid = [1, 1]
    bp.blueprint_absolute_snapping = true
  }

  // </editor-fold>
}
