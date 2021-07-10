import { userWarning, vlog } from "../framework/logging"
import { registerHandlers } from "../framework/events"
import { isEmpty } from "../framework/util"
import { add, Area, elemMul, subtract } from "../framework/position"
import { getParallelDataSurface, isDataSurface } from "./surfaces"
import { getViewOnlyForce } from "./forces"

// global
export interface BpAreasGlobal {
  nextBpSetId: number
  bpSetById: PRecord<number, BpSet>
  bpSetBySurfaceIndex: PRecord<number, BpSet>

  nextBpAreaId: number
  userAreaById: PRecord<number, UserArea>
  dataAreaById: PRecord<number, DataArea>
}

declare const global: BpAreasGlobal

registerHandlers({
  on_init() {
    global.nextBpSetId = 1
    global.bpSetById = {}
    global.bpSetBySurfaceIndex = {}

    global.nextBpAreaId = 1
    global.userAreaById = {}
    global.dataAreaById = {}
  },
  on_load() {
    for (const [, set] of pairs(global.bpSetById)) {
      setmetatable(set, BpSet.prototype as any)
    }
    for (const [, area] of pairs(global.userAreaById)) {
      setmetatable(area, UserArea.prototype as any)
    }
    for (const [, area] of pairs(global.dataAreaById)) {
      setmetatable(area, DataArea.prototype as any)
    }
  },
})

export class BpSet {
  readonly surfaceIndex: number
  readonly dataSurface: LuaSurface
  readonly dataSurfaceIndex: number

  valid: boolean = true

  readonly areaIds: number[] = []
  // [x][y]=id
  private readonly areaIdsByGrid: PRecord<number, PRecord<number, number>> = {}

  private constructor(
    public readonly id: number,
    public name: string,
    public readonly surface: LuaSurface,
    public readonly bpSize: Position // public readonly boundarySize: number, // public gridSize: Position
  ) {
    this.surfaceIndex = surface.index
    this.dataSurface = getParallelDataSurface(surface)
    this.dataSurfaceIndex = this.dataSurface.index
  }

  static tryCreate(name: string, surface: LuaSurface, bpSize: Position): BpSet | string {
    if (global.bpSetBySurfaceIndex[surface.index]) {
      return "BpSet already exists on this surface"
    }
    if (isDataSurface(surface)) {
      return "Cannot make a BpSet out of a internal data surface (how did you do this??)."
    }
    const id = global.nextBpSetId++
    const set = new BpSet(id, name, surface, bpSize)
    global.bpSetById[id] = set
    global.bpSetBySurfaceIndex[surface.index] = set
    return set
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
    if (this.surface.valid) {
      game.delete_surface(this.surface)
    }
    if (this.dataSurface.valid) {
      game.delete_surface(this.dataSurface)
    }
    global.bpSetById[this.id] = undefined
    global.bpSetBySurfaceIndex[this.surfaceIndex] = undefined
    for (const areaId of this.areaIds) {
      UserArea.getById(areaId).delete()
    }
  }

  createNewArea(name: string, blockPosition: Position): UserArea {
    const topLeft = elemMul(blockPosition, this.bpSize)
    const area: Area = [topLeft, add(topLeft, this.bpSize)]
    const userArea = UserArea._create(this, area, name)

    const id = userArea.id
    this.areaIds[this.areaIds.length] = id
    let xs = this.areaIdsByGrid[blockPosition.x]
    if (!xs) {
      xs = {}
      this.areaIdsByGrid[blockPosition.x] = xs
    }
    xs[blockPosition.y] = id

    return userArea
  }

  getAreaIdByBlock(x: number, y: number): number | undefined {
    const xs = this.areaIdsByGrid[x]
    return xs && xs[y]
  }
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

// -- bpArea
export type BpAreaType = "data" | "view"

export abstract class BpArea {
  readonly type!: BpAreaType // to restore metatable
  valid: boolean = true

  protected lastUpdated: number = game.ticks_played
  protected lastBlueprinted: number = this.lastUpdated - 1

  protected readonly bpInventory: LuaInventory = game.create_inventory(1)
  private readonly blueprint: LuaItemStack = this.bpInventory[1]

  protected constructor(public readonly set: BpSet, public readonly id: number, public readonly area: Area) {}

  delete(): void {
    if (!this.valid) return
    this.valid = false
    this.bpInventory.destroy()
  }

  markUpdated(): void {
    this.lastUpdated = game.ticks_played
  }

  createBlueprint(): LuaItemStack {
    vlog("creating blueprint for bpArea")
    const bp = this.getBpItemStack()
    const bpEntities = bp.create_blueprint({
      surface: this.set.surface,
      force: "player", // TODO: which force
      area: this.area,
      include_entities: true, // TODO: make configurable
      include_modules: true,
      include_trains: true,
      include_station_names: true,
      include_fuel: true,
    })
    this.lastBlueprinted = game.ticks_played
    if (isEmpty(bpEntities)) return bp
    const topLeft = this.area[0]
    const firstEntity = bpEntities[1]
    const bpEntity = bp.get_blueprint_entities()[0]
    bp.blueprint_snap_to_grid = [1, 1]
    bp.blueprint_position_relative_to_grid = subtract(subtract(firstEntity.position, topLeft), bpEntity.position)
    return bp
  }

  getBlueprint(): LuaItemStack {
    if (this.lastBlueprinted < this.lastUpdated) {
      this.createBlueprint()
    }
    return this.blueprint
  }

  private getBpItemStack() {
    const bp = this.blueprint
    if (!bp.valid_for_read || !bp.is_blueprint) {
      bp.set_stack({ name: "blueprint" })
    }
    return bp
  }
}

export class DataArea extends BpArea {
  type: "data" = "data"

  private constructor(userArea: UserArea) {
    super(userArea.set, userArea.id, userArea.area)
    global.dataAreaById[this.id] = this
  }

  static _create(userArea: UserArea): DataArea {
    return new DataArea(userArea)
  }

  static getByIdOrNil(id: number): DataArea | undefined {
    return global.dataAreaById[id]
  }

  delete(): void {
    super.delete()
    global.dataAreaById[this.id] = undefined
  }
}

interface ViewRelation {
  areaId: number
  tempViewing: boolean
  // viewFilter: ??
  // autoIncluding: ??
  // autoIncludeFilter: ??
  editing: boolean
  topLeft?: Position
}

export class UserArea extends BpArea {
  type: "view" = "view"

  readonly relations: ViewRelation[] = []
  dataArea: DataArea

  private constructor(set: BpSet, area: Area, public name: string) {
    super(set, global.nextBpAreaId++, area)
    this.dataArea = DataArea._create(this)
    global.userAreaById[this.id] = this
  }

  static _create(set: BpSet, area: Area, name: string): UserArea {
    return new UserArea(set, area, name)
  }

  static getByIdOrNil(id: number): UserArea | undefined {
    return global.userAreaById[id]
  }

  static getById(id: number): UserArea {
    const area = global.userAreaById[id]
    if (!area) {
      error(`No user area with id ${id}`)
    }
    return area
  }

  delete(): void {
    super.delete()
    global.userAreaById[this.id] = undefined
    this.dataArea.delete()
  }

  // removes all changes
  resetLayer(): void {
    this.deleteAllEntities()
    this.replaceRelations()
  }

  private deleteAllEntities() {
    const entities = this.set.surface.find_entities_filtered({
      area: this.area,
      type: "character",
      invert: true,
    })
    for (const entity of entities) {
      entity.destroy()
    }
  }

  private replaceRelations() {
    for (const relation of this.relations) {
      const dataArea = DataArea.getByIdOrNil(relation.areaId)
      if (!dataArea) {
        userWarning("View relation includes an invalid or deleted layer. Skipping...")
        continue
      }
      if (relation.editing) {
        userWarning("TODO: editing stuff")
        continue
      }
      if (relation.tempViewing) {
        this.placeViewingLayer(dataArea, relation.topLeft)
      }
    }
  }

  private placeViewingLayer(dataLayer: DataArea, topLeft: Position | undefined) {
    const bp = dataLayer.createBlueprint() // todo switch to getBlueprint()
    const ref = topLeft || this.area[0]
    let ghosts = this.tryPlaceBlueprint(bp, ref, false)
    if (isEmpty(ghosts)) {
      userWarning("Overlapping entities found (blueprint failed to place without force-build.")
      ghosts = this.tryPlaceBlueprint(bp, ref, true)
    }
    for (const ghost of ghosts) {
      const [, entity] = ghost.silent_revive()
      if (!entity) {
        userWarning("could not revive ghost (something in the way?)")
        continue
      }
      entity.destructible = false
      entity.minable = false
      entity.rotatable = false
    }
  }

  private tryPlaceBlueprint(bp: LuaItemStack, position: Position, forceBuild: boolean) {
    return bp.build_blueprint({
      surface: this.set.surface,
      position: position,
      force: getViewOnlyForce(),
      skip_fog_of_war: false,
      force_build: forceBuild,
    })
  }
}
