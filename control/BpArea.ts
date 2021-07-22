import { userWarning } from "../framework/logging"
import { registerHandlers } from "../framework/events"
import { arrayRemoveValue, isEmpty } from "../framework/util"
import { add, Area, getCenter, multiply, subtract } from "../framework/position"
import { Prototypes } from "../constants"
import { get, VectorTable } from "../framework/VectorTable"
import { getEntityData, setEntityData } from "../framework/entityData"
import { getBpForce } from "./forces"
import { configureIncluded, configureView } from "./viewInclude"
import { Result } from "../framework/result"
import { Event } from "../framework/Event"

// global
interface BpAreasGlobal {
  bpSurfaceByIndex: PRecord<number, BpSurface>

  nextBpAreaId: number
  bpAreaById: PRecord<number, BpArea>
}

declare const global: BpAreasGlobal

registerHandlers({
  on_init() {
    global.bpSurfaceByIndex = {}

    global.nextBpAreaId = 1
    global.bpAreaById = {}
  },
  on_load() {
    for (const [, set] of pairs(global.bpSurfaceByIndex)) {
      setmetatable(set, BpSurface.prototype as any)
    }
    for (const [, area] of pairs(global.bpAreaById)) {
      setmetatable(area, BpArea.prototype as any)
    }
  },
})

export class BpSurface {
  valid: boolean = true

  readonly surfaceIndex: number

  readonly areas: BpArea[] = []
  // [x][y]=id
  private readonly bpAreasByChunk: VectorTable<BpArea> = {}

  // <editor-fold desc="Creation and deletion">
  private constructor(public readonly surface: LuaSurface) {
    this.surfaceIndex = surface.index
  }

  static _on_surface_created(surface: LuaSurface): void {
    const existing = global.bpSurfaceByIndex[surface.index]
    if (!existing) {
      global.bpSurfaceByIndex[surface.index] = new BpSurface(surface)
    } else {
      assert(existing.surface.valid && existing.surface.index === surface.index)
    }
  }

  static _on_surface_deleted(e: OnSurfaceDeletedPayload): void {
    const bpSurface = global.bpSurfaceByIndex[e.surface_index]!
    global.bpSurfaceByIndex[e.surface_index] = undefined
    bpSurface.valid = false
    for (const area of bpSurface.areas) {
      area.delete()
    }
  }

  static bySurfaceIndex(): ReadonlyRecord<number, BpSurface> {
    return global.bpSurfaceByIndex as ReadonlyRecord<number, BpSurface>
  }

  static get(surface: LuaSurface): BpSurface {
    return global.bpSurfaceByIndex[surface.index]!
  }

  // </editor-fold>

  // <editor-fold desc="Areas">

  static getBoundaryTiles(fullArea: Area, boundaryThickness: number, prototype: string): Tile[] {
    const tiles: Tile[] = []
    for (let t = 0; t < boundaryThickness; t++) {
      for (let x = fullArea[0].x + boundaryThickness; x < fullArea[1].x - boundaryThickness; x++) {
        tiles.push(
          {
            name: prototype,
            position: { x: x + 0.5, y: fullArea[0].y + t + 0.5 },
          },
          {
            name: prototype,
            position: { x: x + 0.5, y: fullArea[1].y - t - 0.5 },
          }
        )
      }
      for (let y = fullArea[0].y; y < fullArea[1].y; y++) {
        tiles.push(
          {
            name: prototype,
            position: { x: fullArea[0].x + t + 0.5, y: y + 0.5 },
          },
          {
            name: prototype,
            position: { x: fullArea[1].x - t - 0.5, y: y + 0.5 },
          }
        )
      }
    }
    return tiles
  }

  tryCreateNewArea(
    name: string,
    chunkTopLeft: Position,
    chunkSize: Position,
    boundaryThickness: number
  ): Result<BpArea> {
    // generate chunks/set chunks
    for (let x = chunkTopLeft.x; x < chunkTopLeft.x + chunkSize.x; x++) {
      const xs = this.bpAreasByChunk[x]
      if (!xs) continue
      for (let y = chunkTopLeft.y; y < chunkTopLeft.y + chunkSize.y; y++) {
        if (xs[y])
          return {
            result: "error",
            message: "Selected area intersects with an existing area.",
          }
      }
    }
    return {
      result: "ok",
      value: this.createNewArea(name, chunkTopLeft, chunkSize, boundaryThickness),
    }
  }

  _areaDeleted(area: BpArea): void {
    // todo: go to EVERY area referenced and delete
    assert(!area.valid)
    if (!this.valid) return

    arrayRemoveValue(this.areas, area)
    for (let x = area.topLeft.x; x < area.topLeft.x + area.chunkSize.x; x++) {
      const xs = this.bpAreasByChunk[x]!
      if (!xs) continue
      for (let y = area.topLeft.y; y < area.topLeft.y + area.chunkSize.y; y++) {
        xs[y] = undefined
      }
      if (isEmpty(xs)) this.bpAreasByChunk[x] = undefined
    }
  }

  private createNewArea(name: string, chunkTopLeft: Position, chunkSize: Position, boundaryThickness: number): BpArea {
    const bpArea = BpArea._create(this, name, chunkTopLeft, chunkSize)

    this.areas[this.areas.length] = bpArea
    for (let x = chunkTopLeft.x; x < chunkTopLeft.x + chunkSize.x; x++) {
      let xs = this.bpAreasByChunk[x]
      if (!xs) {
        xs = {}
        this.bpAreasByChunk[x] = xs
      }
      for (let y = chunkTopLeft.y; y < chunkTopLeft.y + chunkSize.y; y++) {
        if (!this.surface.is_chunk_generated([x, y])) {
          this.surface.set_chunk_generated_status([x, y], defines.chunk_generated_status.entities)
        }
        xs[y] = bpArea
      }
    }

    const area = bpArea.area
    this.surface.build_checkerboard(area)
    this.generateBoundary(area, boundaryThickness)

    BpArea.onCreated.raise(bpArea)
    return bpArea
  }

  getAreaAt(position: Position): BpArea | undefined {
    const blockX = Math.floor(position.x / 32)
    const blockY = Math.floor(position.y / 32)
    return get(this.bpAreasByChunk, blockX, blockY)
  }

  private generateBoundary(fullArea: Area, boundaryThickness: number) {
    const tiles = BpSurface.getBoundaryTiles(fullArea, boundaryThickness, Prototypes.boundaryTileWhite)
    this.surface.set_tiles(tiles)
  }

  // </editor-fold>
}

registerHandlers({
  on_init() {
    for (const [, surface] of pairs(game.surfaces)) {
      BpSurface._on_surface_created(surface)
    }
  },
  on_surface_created(e) {
    BpSurface._on_surface_created(game.get_surface(e.surface_index)!)
  },
  on_surface_deleted: BpSurface._on_surface_deleted,
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
  readonly area: BpArea
  readonly relationLuaIndex: number
}

// TODO: BpAreas changed event/listeners

export class BpArea {
  static onCreated = new Event<BpArea>()
  static onDeleted = new Event<{
    id: number
    bpSurface: BpSurface
  }>()

  readonly id: number
  valid: boolean = true

  readonly surface: LuaSurface
  readonly area: Area
  readonly center: Position

  readonly inventory: LuaInventory = game.create_inventory(8)
  readonly dataBp = this.inventory[0]
  private readonly includeBps: LuaInventory

  readonly relations: AreaRelationInternal[] = []
  editingAreaId: number

  // <editor-fold desc="Creation and deletion">

  private constructor(
    public readonly bpSurface: BpSurface,
    public name: string,
    public readonly topLeft: Position,
    public readonly chunkSize: Position
  ) {
    this.id = global.nextBpAreaId++

    this.surface = this.bpSurface.surface
    this.area = [multiply(topLeft, 32), multiply(add(topLeft, chunkSize), 32)]
    this.center = getCenter(this.area)

    this.dataBp.set_stack({ name: "blueprint" })
    this.inventory[1].set_stack({ name: "blueprint-book" })
    this.includeBps = this.inventory[1].get_inventory(defines.inventory.item_main)!

    this.addRelation({
      areaId: this.id,
      includeMode: IncludeMode.All,
      relativePosition: { x: 0, y: 0 },
      viewing: false,
    })
    this.editingAreaId = this.id

    global.bpAreaById[this.id] = this
  }

  static _create(bpSurface: BpSurface, name: string, topLeft: Position, chunkArea: Position): BpArea {
    return new BpArea(bpSurface, name, topLeft, chunkArea)
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
    this.inventory.destroy()
    global.bpAreaById[this.id] = undefined
    this.bpSurface._areaDeleted(this)
    if (this.bpSurface.valid) {
      BpArea.onDeleted.raise({
        id: this.id,
        bpSurface: this.bpSurface,
      })
    }
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
      this.includeBps[index - 1].set_stack({ name: "blueprint" })
      return index
    }
    const newIndex = this.includeBps.length + 1
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

  private placeBlueprint(bp: LuaItemStack, relativePosition: Position, force: ForceSpecification): LuaEntity[] {
    if (!bp.get_blueprint_entities()) return []
    const position = add(this.center, relativePosition)
    let ghosts = this.rawPlaceBlueprint(bp, position, force, false)
    if (isEmpty(ghosts)) {
      userWarning(
        "Overlapping entities (blueprint failed to place without force-build). " +
          "Individual entity checking will be introduced in a future release (soon (TM))."
      )
      // todo: manual overlap detection
      ghosts = this.rawPlaceBlueprint(bp, position, force, true)
    }
    const entities: LuaEntity[] = []
    for (const ghost of ghosts) {
      const [, entity] = ghost.silent_revive()
      if (!entity) {
        userWarning("could not revive ghost (something in the way?)")
        continue
      }
      table.insert(entities, entity)
    }

    // if (relationLuaIndex !== undefined) {
    //   setEntityData<BpAreaEntityData>(entity, {
    //     areaId: this.id,
    //     relationLuaIndex, // todo: make less volatile
    //   })
    // }
    //
    return entities
  }

  private configureEntities(
    entities: LuaEntity[],
    mod: (entity: LuaEntity) => void,
    relationId: number | undefined
  ): void {
    for (const entity of entities) {
      mod(entity)
    }
    if (relationId !== undefined) {
      const data: BpAreaEntityData = {
        area: this,
        relationLuaIndex: relationId,
      }
      for (const entity of entities) {
        setEntityData<BpAreaEntityData>(entity, data)
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
        this.placeBlueprint(otherArea.dataBp, relation.relativePosition, "player")
        // no setup necessary ?
        // todo: make editing overwrite some data
        continue
      }

      switch (relation.includeMode) {
        case IncludeMode.Never:
          break
        case IncludeMode.Keep:
          this.configureEntities(
            this.placeBlueprint(
              this.includeBps[relation.includeBpLuaIndex],
              relation.relativePosition,
              getBpForce("include", true)
            ),
            configureIncluded,
            i
          )

          break
        case IncludeMode.All:
          this.configureEntities(
            this.placeBlueprint(otherArea.dataBp, relation.relativePosition, getBpForce("include", false)),
            configureIncluded,
            i
          )
          break
      }
      if (relation.viewing && relation.includeMode !== IncludeMode.All) {
        // todo: should be active or not?
        // todo: make ghosts
        this.configureEntities(
          this.placeBlueprint(
            otherArea.dataBp,
            relation.relativePosition,
            getBpForce("view", relation.includeMode === IncludeMode.Keep)
          ),
          configureView,
          i
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
