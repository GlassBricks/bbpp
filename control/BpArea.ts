import { userWarning } from "../framework/logging"
import { registerHandlers } from "../framework/events"
import { arrayRemoveValue, isEmpty, swap } from "../framework/util"
import { add, Area, contract, getCenter, multiply, subtract } from "../framework/position"
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

  private areas: PRecord<number, BpArea> = {}
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
    for (const [, area] of pairs(bpSurface.areas)) {
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

  static createBoundaryTiles(fullArea: Area, boundaryThickness: number, prototype: string): Tile[] {
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
            message: `Selected area intersects with an existing area (${xs[y]!.name})`,
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

    this.areas[area.id] = undefined
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
    const bpArea = BpArea._create(this, name, chunkTopLeft, chunkSize, boundaryThickness)

    this.areas[bpArea.id] = bpArea
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

    this.surface.build_checkerboard(bpArea.area)
    this.surface.set_tiles(
      BpSurface.createBoundaryTiles(bpArea.fullArea, boundaryThickness, Prototypes.boundaryTileWhite)
    )

    BpArea.onCreated.raise(bpArea)
    bpArea.commitChanges()
    return bpArea
  }

  getAreaAt(position: Position): BpArea | undefined {
    const blockX = Math.floor(position.x / 32)
    const blockY = Math.floor(position.y / 32)
    return get(this.bpAreasByChunk, blockX, blockY)
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

export enum InclusionMode {
  None = 1,
  Select,
  // New, // todo
  All,
}

export interface AreaInclusion {
  readonly sourceArea: BpArea
  readonly destinationArea: BpArea
  readonly relativePosition: Position
  ghosts: boolean
  includeMode: InclusionMode
}

interface AreaInclusionInternal extends AreaInclusion {
  readonly includeBpIndex: number
}

export interface BpAreaEntityData {
  readonly area: BpArea
  readonly inclusion: AreaInclusion
}

export class BpArea {
  static onCreated = new Event<BpArea>()
  static onDeleted = new Event<{
    id: number
    bpSurface: BpSurface
  }>()

  static onRenamed = new Event<BpArea>()

  static onInclusionsModified = new Event<{ area: BpArea }>()

  readonly id: number
  valid: boolean = true

  readonly surface: LuaSurface
  readonly fullArea: Area // includes boundary
  readonly area: Area
  readonly center: Position

  readonly inventory: LuaInventory = game.create_inventory(8)
  readonly dataBp = this.inventory[0]
  private readonly includeBps: LuaInventory

  private readonly inclusions: ArrayAndTable<AreaInclusionInternal, AreaInclusionInternal, boolean> = [] as any

  // <editor-fold desc="Creation and deletion">

  private constructor(
    public readonly bpSurface: BpSurface,
    public name: string,
    public readonly topLeft: Position,
    public readonly chunkSize: Position,
    public readonly boundaryThickness: number
  ) {
    this.id = global.nextBpAreaId++

    this.surface = this.bpSurface.surface
    this.fullArea = [multiply(topLeft, 32), multiply(add(topLeft, chunkSize), 32)]
    this.area = contract(this.fullArea, boundaryThickness)
    this.center = getCenter(this.area)

    this.dataBp.set_stack({ name: "blueprint" })
    this.inventory[1].set_stack({ name: "blueprint-book" })
    this.includeBps = this.inventory[1].get_inventory(defines.inventory.item_main)!

    global.bpAreaById[this.id] = this
  }

  static _create(
    bpSurface: BpSurface,
    name: string,
    topLeft: Position,
    chunkArea: Position,
    boundarySize: number
  ): BpArea {
    return new BpArea(bpSurface, name, topLeft, chunkArea, boundarySize)
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

  static areasById(): ReadonlyRecord<number, BpArea | undefined> {
    return global.bpAreaById
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
  addInclusion(sourceArea: BpArea, relativePosition: Position = { x: 0, y: 0 }): AreaInclusion {
    const inclusion: AreaInclusionInternal = {
      sourceArea,
      destinationArea: this,
      relativePosition,
      ghosts: false,
      includeMode: InclusionMode.All,
      includeBpIndex: this.findIncludeBpSlot(),
    }
    this.inclusions[this.inclusions.length] = inclusion
    BpArea.onInclusionsModified.raise({ area: this })
    return inclusion
  }

  deleteInclusion(i: AreaInclusion): boolean {
    if (!arrayRemoveValue(this.inclusions, i)) return false
    this.includeBps[(i as AreaInclusionInternal).includeBpIndex].clear()
    BpArea.onInclusionsModified.raise({ area: this })
    return true
  }

  private swapInclusions(i: number, j: number) {
    swap(this.inclusions, i, j)
    BpArea.onInclusionsModified.raise({ area: this })
  }

  moveInclusionUp(inclusion: AreaInclusion): boolean {
    const index = this.inclusions.indexOf(inclusion as AreaInclusionInternal)
    if (index === 0) return false
    this.swapInclusions(index, index - 1)
    return true
  }

  moveInclusionDown(inclusion: AreaInclusion): boolean {
    const index = this.inclusions.indexOf(inclusion as AreaInclusionInternal)
    if (index === this.inclusions.length - 1) return false
    this.swapInclusions(index, index + 1)
    return true
  }

  getInclusions(): ReadonlyArray<AreaInclusion> {
    return this.inclusions
  }

  commitChanges(): void {
    this.writeBlueprint(this.dataBp, "player", undefined)
    for (const inclusion of this.inclusions) {
      if (inclusion.includeMode !== InclusionMode.Select) continue
      this.writeBlueprint(this.includeBps[inclusion.includeBpIndex], getBpForce("include", true), inclusion)
      // TODO: detect entities deleted
    }
  }

  // </editor-fold>

  reset(): void {
    this.deleteAllEntities()
    this.placeInclusions()
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
    const [, luaIndex] = this.includeBps.find_empty_stack()
    if (luaIndex) {
      this.includeBps[luaIndex - 1].set_stack({ name: "blueprint" })
      return luaIndex - 1
    }
    const index = this.includeBps.length
    this.includeBps.insert({ name: "blueprint" })
    return index
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
    relativePosition: Position | undefined,
    force: ForceSpecification
  ): LuaEntity[] {
    if (!bp.get_blueprint_entities()) return []
    const position = relativePosition ? add(this.center, relativePosition) : { x: 0, y: 0 }
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
    return entities
  }

  private configureEntities(entities: LuaEntity[], mod: (entity: LuaEntity) => void, inclusion: AreaInclusion): void {
    for (const entity of entities) {
      mod(entity)
    }
    if (inclusion !== undefined) {
      const data: BpAreaEntityData = {
        area: this,
        inclusion,
      }
      for (const entity of entities) {
        setEntityData<BpAreaEntityData>(entity, data)
      }
    }
  }

  private placeInclusions() {
    for (const i of $range(1, this.inclusions.length)) {
      const inclusion = this.inclusions[i - 1]
      const otherArea = inclusion.sourceArea
      if (!otherArea || !otherArea.valid) {
        userWarning(
          "Area inclusion includes an invalid area. This shouldn't happen, please report to the mod author. Skipping..."
        )
        continue
      }
      switch (inclusion.includeMode) {
        case InclusionMode.None:
          break
        case InclusionMode.Select:
          this.configureEntities(
            this.placeBlueprint(
              this.includeBps[inclusion.includeBpIndex],
              inclusion.relativePosition,
              getBpForce("include", true)
            ),
            configureIncluded,
            inclusion
          )

          break
        case InclusionMode.All:
          this.configureEntities(
            this.placeBlueprint(otherArea.dataBp, inclusion.relativePosition, getBpForce("include", false)),
            configureIncluded,
            inclusion
          )
          break
      }
      if (inclusion.ghosts && inclusion.includeMode !== InclusionMode.All) {
        // todo: make ghosts
        this.configureEntities(
          this.placeBlueprint(
            otherArea.dataBp,
            inclusion.relativePosition,
            getBpForce("view", inclusion.includeMode === InclusionMode.Select)
          ),
          configureView,
          inclusion
        )
      }
    }
    this.placeBlueprint(this.dataBp, undefined, "player")
  }

  private writeBlueprint(bp: LuaItemStack, force: ForceSpecification, inclusion: AreaInclusion | undefined) {
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
      if (inclusion) {
        const entityData = getEntityData<BpAreaEntityData>(entity)
        if (!entityData || entityData.inclusion !== inclusion) {
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
