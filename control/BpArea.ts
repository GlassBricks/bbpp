import { userWarning } from "../framework/logging"
import { registerHandlers } from "../framework/events"
import { arrayRemoveValue, isEmpty, tableRemoveValue } from "../framework/util"
import { add, Area, elemMul, subtract } from "../framework/position"
import { getViewOnlyForce } from "./forces"

// global
export interface BpAreasGlobal {
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

  readonly surface: LuaSurface
  readonly surfaceIndex: number

  valid: boolean = true

  readonly areas: BpArea[] = []
  // [x][y]=id
  private readonly areaIdsByGrid: PRecord<number, PRecord<number, BpArea>> = {}

  // <editor-fold desc="Creation and deletion">
  private constructor(
    public name: string,
    surface: LuaSurface,
    public readonly bpSize: Position // public readonly boundarySize: number, // public gridSize: Position
  ) {
    this.id = global.nextBpSetId++
    this.surface = surface
    this.surfaceIndex = surface.index
    global.bpSetById[this.id] = this
    global.bpSetBySurfaceIndex[surface.index] = this
  }

  // todo: refactor this
  static tryCreate(name: string, surface: LuaSurface, bpSize: Position): BpSet | string {
    if (global.bpSetBySurfaceIndex[surface.index]) {
      return "BpSet already exists on this surface"
    }
    return new BpSet(name, surface, bpSize)
  }

  static create(name: string, surface: LuaSurface, bpSize: Position): BpSet {
    const bpSet = this.tryCreate(name, surface, bpSize)
    if (typeof bpSet === "string") error(bpSet)
    return bpSet
  }

  static getByIdOrNil(id: number): BpSet | undefined {
    return global.bpSetById[id]
  }

  static getById(id: number): BpSet {
    const set = global.bpSetById[id]
    if (!set) error(`No bpSet with id ${id}`)
    return set
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
  addNewArea(name: string, blockPosition: Position): BpArea {
    const bpArea = BpArea._create(this, blockPosition, name)

    this.areas[this.areas.length] = bpArea
    let xs = this.areaIdsByGrid[blockPosition.x]
    if (!xs) {
      xs = {}
      this.areaIdsByGrid[blockPosition.x] = xs
    }
    xs[blockPosition.y] = bpArea

    return bpArea
  }

  getAreaAt(position: Position): BpArea | undefined {
    const blockX = Math.floor(position.x / this.bpSize.x)
    const blockY = Math.floor(position.y / this.bpSize.y)
    const xs = this.areaIdsByGrid[blockX]
    return xs && xs[blockY]
  }

  _areaDeleted(area: BpArea): void {
    // todo: go to EVERY area referenced and delete
    assert(!area.valid)
    if (!this.valid) return

    arrayRemoveValue(this.areas, area)
    for (const [x, xs] of pairs(this.areaIdsByGrid)) {
      if (tableRemoveValue(xs, area) && isEmpty(xs)) {
        this.areaIdsByGrid[x] = undefined
      }
    }
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

interface AreaRelation {
  areaId: number
  tempViewing: boolean
  // viewFilter: ??
  // autoIncluding: ??
  // autoIncludeFilter: ??
  editing: boolean
  topLeft?: Position
}

// TODO: BpAreas changed event/listeners

export class BpArea {
  readonly id: number
  valid: boolean = true
  readonly surface: LuaSurface
  readonly relations: AreaRelation[] = []
  private readonly bpInventory: LuaInventory = game.create_inventory(16) // more than needed, but future-proofing
  // TODO: maybe move to its own separate thing...
  private readonly dataBpStack = this.bpInventory[1]

  // <editor-fold desc="Creation and deletion">
  private constructor(public readonly bpSet: BpSet, public readonly area: Area, public name: string) {
    this.id = global.nextBpAreaId++
    global.bpAreaById[this.id] = this

    this.relations[this.relations.length] = {
      areaId: this.id,
      editing: true,
      tempViewing: true,
    }
    this.surface = this.bpSet.surface

    this.dataBpStack.set_stack({ name: "blueprint" })
  }

  static _create(set: BpSet, blockPosition: Position, name: string): BpArea {
    const topLeft = elemMul(blockPosition, set.bpSize)
    const area: Area = [topLeft, add(topLeft, set.bpSize)]

    return new BpArea(set, area, name)
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

  // </editor-fold>

  getBlueprint(): LuaItemStack {
    // if (this.dataLastBlueprinted < this.dataLastUpdated) {
    //   return this.createDataBlueprint()
    // }
    return this.dataBpStack
  }

  // removes all changes
  resetLayer(): void {
    this.deleteAllEntities()
    this.placeRelations()
  }

  // </editor-fold>

  deleteViewOnlyEntities(): void {
    const entities = this.surface.find_entities_filtered({
      area: this.area,
      force: getViewOnlyForce(),
    })
    for (const entity of entities) {
      entity.destroy()
    }
  }

  writeChanges(): void {
    this.createBlueprint(this.dataBpStack, "player")
  }

  // <editor-fold desc="Blueprints">
  private createBlueprint(bp: LuaItemStack, force: ForceSpecification): LuaItemStack {
    const bpEntities = bp.create_blueprint({
      surface: this.surface,
      force,
      area: this.area,
      include_entities: true, // TODO: make configurable
      include_modules: true,
      include_trains: true,
      include_station_names: true,
      include_fuel: true,
    })
    if (isEmpty(bpEntities)) return bp
    bp.blueprint_snap_to_grid = [1, 1]
    bp.blueprint_absolute_snapping = true
    // const firstEntity = bpEntities[1]
    // const bpEntity = bp.get_blueprint_entities()![0]
    // bp.blueprint_position_relative_to_grid = subtract(firstEntity.position, bpEntity.position)
    // for (const [, player] of pairs(game.players)) {
    //   player.get_main_inventory().insert(bp)
    // }
    return bp
  }

  // <editor-fold desc="Relations and editing">
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

  private rawPlaceBlueprint(bp: LuaItemStack, position: Position, force: ForceSpecification, forceBuild: boolean) {
    return bp.build_blueprint({
      surface: this.surface,
      position,
      force,
      skip_fog_of_war: false,
      force_build: forceBuild,
    })
  }

  private placeBlueprint(
    bp: LuaItemStack,
    sourceArea: Area,
    topLeft: Position | undefined,
    force: ForceSpecification,
    editable: boolean,
    active: boolean
  ) {
    if (!bp.get_blueprint_entities()) return
    const position = subtract(topLeft || this.area[0], sourceArea[0])
    let ghosts = this.rawPlaceBlueprint(bp, position, force, false)
    if (isEmpty(ghosts)) {
      userWarning("Overlapping entities (blueprint failed to place without force-build).")
      // todo: manual overlap detection
      ghosts = this.rawPlaceBlueprint(bp, position, force, true)
    }
    for (const ghost of ghosts) {
      const [, entity] = ghost.silent_revive()
      if (!entity) {
        userWarning("could not revive ghost (something in the way?)")
        continue
      }
      entity.destructible = editable
      entity.minable = editable
      entity.rotatable = editable
      entity.operable = editable
      entity.active = active
    }
  }

  private placeRelations() {
    for (const relation of this.relations) {
      const otherArea = BpArea.getByIdOrNil(relation.areaId)
      if (!otherArea) {
        userWarning("Area relation includes an invalid area. Skipping...")
        continue
      }
      if (relation.editing) {
        const bp = otherArea.getBlueprint()
        this.placeBlueprint(bp, otherArea.area, relation.topLeft, "player", true, true)
        continue
      }
      if (relation.tempViewing) {
        const bp = otherArea.getBlueprint()
        // todo: should be active or not?
        this.placeBlueprint(bp, otherArea.area, relation.topLeft, getViewOnlyForce(), false, false)
      }
    }
  }

  // </editor-fold>
}
