import { dlog, userWarning, vlog } from "../framework/logging"
import { registerHandlers } from "../framework/events"
import { arrayRemoveElement, isEmpty } from "../framework/util"
import { add, Area, subtract } from "../framework/position"
import { getParallelDataSurface } from "./surfaces"
import { getViewOnlyForce } from "./forces"

// global
interface BpAreasGlobal {
  // todo: blueprint "set"s for organization
  nextBpAreaId: number
  bpAreaById: PRecord<number, BpArea>
  // surface index -> area id -> area
  bpAreasBySurfaceIndex: PRecord<number, PRecord<number, BpArea>>
  userDataAreas: DataArea[]
  viewAreas: ViewArea[]
}

declare const global: BpAreasGlobal

registerHandlers({
  on_init() {
    global.nextBpAreaId = 0
    global.bpAreaById = {}
    global.bpAreasBySurfaceIndex = {}
    global.userDataAreas = []
    global.viewAreas = []
  },
  on_load() {
    for (const [, area] of pairs(global.bpAreaById)) {
      const prototype: any = area.type === "data" ? DataArea.prototype : ViewArea.prototype
      setmetatable(area, prototype)
    }
  },
})

export type BpAreaType = "data" | "view"

export abstract class BpArea {
  readonly id: number
  readonly type!: BpAreaType // to restore metatable
  valid: boolean = true

  name: string
  surface: LuaSurface
  surfaceIndex: number
  area: Area

  protected lastUpdated: number = game.ticks_played
  protected lastBlueprinted: number = this.lastUpdated - 1

  protected readonly bpInventory: LuaInventory = game.create_inventory(1)
  protected blueprint!: LuaItemStack

  protected constructor(name: string, surface: LuaSurface, area: Area) {
    this.id = global.nextBpAreaId++
    this.name = name
    this.surface = surface
    this.surfaceIndex = surface.index
    this.area = area
    this.bpInventory = game.create_inventory(1)

    global.bpAreaById[this.id] = this
    global.bpAreasBySurfaceIndex[this.surfaceIndex] = global.bpAreasBySurfaceIndex[this.surfaceIndex] || {}
    global.bpAreasBySurfaceIndex[this.surfaceIndex]![this.id] = this

    dlog("created bp area", { name, surface, type })
  }

  static getById(id: number): BpArea | undefined {
    return global.bpAreaById[id]
  }

  delete(): void {
    if (!this.valid) return
    this.valid = false
    this.bpInventory.destroy()
    this.surface = undefined as any // prevent future shenanigans
    global.bpAreaById[this.id] = undefined
    global.bpAreasBySurfaceIndex[this.surfaceIndex]![this.id] = undefined
  }

  markUpdated(): void {
    this.lastUpdated = game.ticks_played
  }

  createBlueprint(): LuaItemStack {
    vlog("creating blueprint for bpArea", this.name)
    const bp = this.getBpItemStack()
    const bpEntities = bp.create_blueprint({
      surface: this.surface,
      force: "player", // TODO: which force
      area: this.area,
      include_entities: true, // TODO: make configurable (let user set blueprint?)
      include_modules: true,
      include_trains: true,
      include_station_names: true,
      include_fuel: true,
    })
    this.lastBlueprinted = game.ticks_played
    this.blueprint = bp
    if (isEmpty(bpEntities)) return bp
    const topLeft = this.area[0]
    const firstEntity = bpEntities[1]
    const bpEntity = bp.get_blueprint_entities()[0]
    bp.blueprint_snap_to_grid = [1, 1]
    bp.blueprint_position_relative_to_grid = add(topLeft, subtract(firstEntity.position, bpEntity.position))
    return bp
  }

  getBlueprint(): LuaItemStack {
    if (this.lastBlueprinted < this.lastUpdated) {
      this.blueprint = this.createBlueprint()
    }
    return this.blueprint
  }

  private getBpItemStack() {
    const stack = this.bpInventory[1]
    if (!stack.valid_for_read || !stack.is_blueprint) {
      stack.set_stack({ name: "blueprint" })
    }
    return stack
  }
}

export class DataArea extends BpArea {
  type: "data" = "data"

  private constructor(name: string, surface: LuaSurface, area: Area, public readonly isUserArea: boolean) {
    super(name, surface, area)
    // if(isUserArea)
    global.userDataAreas.push(this)
  }

  static createUserArea(name: string, surface: LuaSurface, area: Area): DataArea {
    return new DataArea(name, surface, area, true)
  }

  static createHiddenArea(otherId: number, surface: LuaSurface, area: Area): DataArea {
    return new DataArea("Data for view" + otherId, surface, area, false)
  }

  static getById(id: number): DataArea | undefined {
    const area = global.bpAreaById[id]
    return area instanceof DataArea ? area : undefined
  }

  delete(): void {
    super.delete()
    arrayRemoveElement(global.userDataAreas, this)
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

export class ViewArea extends BpArea {
  type: "view" = "view"

  readonly relations: ViewRelation[]
  dataArea: DataArea

  private constructor(name: string, surface: LuaSurface, area: Area) {
    super(name, surface, area)
    this.dataArea = DataArea.createHiddenArea(this.id, getParallelDataSurface(surface), area)
    this.relations = [
      {
        areaId: this.dataArea.id,
        tempViewing: true,
        editing: false,
      },
    ]
    global.viewAreas.push(this)
    // todo: areas changed event
  }

  static create(name: string, surface: LuaSurface, area: Area): ViewArea {
    return new ViewArea(name, surface, area)
  }

  static getById(id: number): ViewArea | undefined {
    const area = global.bpAreaById[id]
    return area instanceof ViewArea ? area : undefined
  }

  delete(): void {
    super.delete()
    arrayRemoveElement(global.viewAreas, this)
    if (this.dataArea.valid) {
      this.dataArea.delete()
    }
  }

  // removes all changes
  resetLayer(): void {
    this.deleteAllEntities()
    this.replaceRelations()
  }

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

  private replaceRelations() {
    for (const relation of this.relations) {
      const dataArea = DataArea.getById(relation.areaId)
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
      surface: this.surface,
      position: position,
      force: getViewOnlyForce(),
      skip_fog_of_war: false,
      force_build: forceBuild,
    })
  }
}

// events
interface OnAreaCreatedPayload {
  area_id: number
}

interface OnAreaDeletedPayload {
  area_id: number
}

export const onAreaCreated = script.generate_event_name<OnAreaCreatedPayload>()
export const onAreaDeleted = script.generate_event_name<OnAreaDeletedPayload>()

registerHandlers({
  on_surface_deleted(e) {
    const areas = global.bpAreasBySurfaceIndex[e.surface_index]
    if (areas) {
      for (const [, area] of pairs(areas)) {
        area.delete()
      }
      global.bpAreasBySurfaceIndex[e.surface_index] = undefined
    }
  },
})
