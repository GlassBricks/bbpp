import { dlog, userWarning } from "../framework/logging"
import { registerHandlers } from "../framework/events"
import { arrayRemoveValue, isEmpty, shallowEquals, swap } from "../framework/util"
import { add, Area, contract, getCenter, isIn, multiply, negate, shiftNegative, subtract } from "../framework/position"
import { Prototypes } from "../constants"
import { get, put, VectorTable } from "../framework/VectorTable"
import { getEntityData, setEntityData } from "../framework/entityData"
import { configureIncluded, configureView } from "./viewInclude"
import { Result } from "../framework/result"
import { Event } from "../framework/Event"
import { getEditableIncludeForce, getEditableViewForce } from "./forces"
import { fullyRevive } from "./revive"
import { PlayerData } from "../framework/playerData"
import entity_filter_mode = defines.deconstruction_item.entity_filter_mode

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
    bpArea.saveAndReset()
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
  readonly inventoriesIndex: number
  lastUpdatedForSelectMode: number
  lastUpdatedForAllMode: number
}

export interface BpAreaEntityData {
  readonly area: BpArea
  readonly inclusion: AreaInclusion | undefined
}

interface OpenedFilter {
  inclusion: AreaInclusionInternal
  oldFilters: string[]
  autoApply: boolean
}

export class BpArea {
  static onCreated = new Event<BpArea>()
  static onDeleted = new Event<{ id: number; bpSurface: BpSurface }>()
  static onRenamed = new Event<BpArea>()
  static onInclusionsModified = new Event<{ area: BpArea }>()

  private static PlayerCurrentlyOpenedFilter = PlayerData<OpenedFilter>("PlayerCurrentlyOpenedFilter")

  readonly id: number
  valid: boolean = true

  readonly surface: LuaSurface
  readonly fullArea: Area // includes boundary
  readonly area: Area
  readonly center: Position
  readonly areaRelativeToCenter: Area

  readonly bpInventory: LuaInventory = game.create_inventory(8)
  readonly dataBp = this.bpInventory[0]
  private readonly includeSelectBps = game.create_inventory(4)
  private readonly includeAllBps = game.create_inventory(4)
  private readonly includeFilters = game.create_inventory(4)

  private readonly inclusions: ArrayAndTable<AreaInclusionInternal, AreaInclusionInternal, boolean> = [] as any

  updateNumber: number = 0

  readonly includedBy: Record<number, number> = {}

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
    const relativeTopLeft = add(multiply(this.chunkSize, -16), { x: boundaryThickness, y: boundaryThickness })
    this.areaRelativeToCenter = [relativeTopLeft, negate(relativeTopLeft)]

    this.dataBp.set_stack({ name: "blueprint" })

    global.bpAreaById[this.id] = this
    dlog("Bp area created:", name)
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
    dlog("deleting area:", this.name)
    this.bpInventory.destroy()
    this.includeSelectBps.destroy()
    this.includeAllBps.destroy()
    this.includeFilters.destroy()
    global.bpAreaById[this.id] = undefined
    for (const [areaId] of pairs(this.includedBy)) {
      global.bpAreaById[areaId]!.removeAllInclusions(this)
    }
    this.bpSurface._areaDeleted(this)
    BpArea.onDeleted.raise({
      id: this.id,
      bpSurface: this.bpSurface,
    })
  }

  // </editor-fold>

  // <editor-fold desc="Inclusions">

  getInclusions(): ReadonlyArray<AreaInclusion> {
    return this.inclusions
  }

  private findInclusionInventoryIndex(): number {
    let index: number
    const [, luaIndex] = this.includeSelectBps.find_empty_stack()
    if (luaIndex) {
      index = luaIndex - 1
    } else {
      const length = this.includeSelectBps.length
      this.includeSelectBps.resize(length + 4)
      this.includeAllBps.resize(length + 4)
      this.includeFilters.resize(length + 4)
      index = length
    }
    this.includeSelectBps[index].set_stack({ name: "blueprint" })
    this.includeAllBps[index].set_stack({ name: "blueprint" })
    this.includeFilters[index].set_stack({ name: Prototypes.inclusionFiltersItem })
    return index
  }

  addInclusion(sourceArea: BpArea, relativePosition: Position = { x: 0, y: 0 }): AreaInclusion {
    const inclusion: AreaInclusionInternal = {
      sourceArea,
      destinationArea: this,
      relativePosition,
      ghosts: false,
      includeMode: InclusionMode.All,
      inventoriesIndex: this.findInclusionInventoryIndex(),
      lastUpdatedForSelectMode: sourceArea.updateNumber - 1,
      lastUpdatedForAllMode: sourceArea.updateNumber - 1,
    }
    this.inclusions[this.inclusions.length] = inclusion
    this.inclusions.set(inclusion, true)

    sourceArea.includedBy[this.id] = sourceArea.includedBy[this.id] || 0
    sourceArea.includedBy[this.id]++

    BpArea.onInclusionsModified.raise({ area: this })
    this.saveAndReset()
    return inclusion
  }

  deleteInclusion(inclusion: AreaInclusion): boolean {
    if (!arrayRemoveValue(this.inclusions, inclusion)) return false
    this.doDeleteInclusions(inclusion as AreaInclusionInternal)

    BpArea.onInclusionsModified.raise({ area: this })
    this.saveAndReset()
    return true
  }

  // already gone from array
  private removeAllInclusions(area: BpArea): void {
    const length = this.inclusions.length()
    let j = 0
    for (let i = 0; i < length; i++) {
      if (this.inclusions[i].sourceArea === area) {
        this.doDeleteInclusions(this.inclusions[i])
      } else {
        this.inclusions[j] = this.inclusions[i]
        j++
      }
    }
    for (let i = j; i < length; i++) {
      this.inclusions[i] = undefined as any
    }
    BpArea.onInclusionsModified.raise({ area: this })
  }

  private doDeleteInclusions(inclusion: AreaInclusionInternal) {
    this.inclusions.delete(inclusion)
    const inventoryIndex = inclusion.inventoriesIndex
    this.includeSelectBps[inventoryIndex].clear()
    this.includeFilters[inventoryIndex].clear()

    const sourceArea = inclusion.sourceArea
    sourceArea.includedBy[this.id]--
    if (sourceArea.includedBy[this.id] === 0) {
      sourceArea.includedBy[this.id] = undefined as any
    }
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

  openInclusionFilters(player: LuaPlayer, inclusion: AreaInclusion, autoApply: boolean): boolean {
    const inclusion1 = inclusion as AreaInclusionInternal
    if (!this.inclusions.has(inclusion1)) return false
    const filter = this.includeFilters[inclusion1.inventoriesIndex]
    player.opened = filter
    BpArea.PlayerCurrentlyOpenedFilter.data[player.index] = {
      inclusion: inclusion1,
      autoApply,
      oldFilters: filter.entity_filters,
    }
    return true
  }

  static onFiltersClosed(this: unknown, e: OnGuiClosedPayload): void {
    const openedFilter = BpArea.PlayerCurrentlyOpenedFilter.data[e.player_index]
    if (!openedFilter) return
    BpArea.PlayerCurrentlyOpenedFilter.data[e.player_index] = undefined
    const inclusion = openedFilter.inclusion
    const area = inclusion.destinationArea
    const sourceArea = inclusion.sourceArea
    if (!area.valid || !area.inclusions.has(inclusion)) return
    dlog("Updating filters for inclusion:", sourceArea.name, "->", area.name)
    if (!shallowEquals(openedFilter.oldFilters, area.includeFilters[inclusion.inventoriesIndex].entity_filters)) {
      const lastUpdated = sourceArea.updateNumber - 1 // guarantee update
      inclusion.lastUpdatedForSelectMode = lastUpdated
      inclusion.lastUpdatedForAllMode = lastUpdated
    }
    if (openedFilter.autoApply) {
      area.saveAndReset()
    }
  }

  // </editor-fold>

  // <editor-fold desc="Editing/placement">
  reset(): void {
    this.deleteAllEntities()
    this.placeAllBlueprints()
  }

  private saveChanges(): void {
    dlog("Saving changes for area: ", this.name)
    this.writeBlueprint(this.dataBp, "player", undefined)
    for (const inclusion of this.inclusions) {
      if (inclusion.includeMode === InclusionMode.Select) {
        this.writeBlueprint(this.includeSelectBps[inclusion.inventoriesIndex], getEditableIncludeForce(), inclusion)
        // todo: checking
      }
    }
    this.updateNumber++
  }

  saveAndReset(): void {
    this.saveChanges()
    this.reset()
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

    const inclusionCenter = inclusion ? add(this.center, inclusion.relativePosition) : this.center

    const bpEntities = bp.get_blueprint_entities()!
    const l = bpEntities.length
    for (let i = 1; i <= l; i++) {
      const bpEntity = bpEntities[i - 1]!
      const entity = entityMapping[i]
      const entityData = getEntityData<BpAreaEntityData>(entity)
      const entityInclusion = entityData && entityData.inclusion
      if (entityInclusion !== inclusion) {
        bpEntities[i - 1] = undefined as any
        continue
      }
      bpEntity.position = subtract(entity.position, inclusionCenter)
    }
    if (isEmpty(bpEntities)) {
      bp.clear_blueprint()
    } else {
      bp.set_blueprint_entities(bpEntities)
      bp.blueprint_snap_to_grid = [1, 1]
      bp.blueprint_absolute_snapping = true
    }
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
    relativePosition: Position | undefined,
    force: ForceSpecification,
    revive: boolean
  ): LuaEntity[] {
    if (!bp.get_blueprint_entities()) return []
    const position = relativePosition ? add(this.center, relativePosition) : this.center
    const ghosts = this.rawPlaceBlueprint(bp, position, force, false)
    if (isEmpty(ghosts)) {
      userWarning(
        "Overlapping entities (blueprint failed to place without force-build). " +
          "Individual entity checking will be introduced in a future release (soon (TM))."
      )
      // todo: manual overlap detection
      // ghosts = this.rawPlaceBlueprint(bp, position, force, true)
    }
    const entities: LuaEntity[] = []
    const retryRevive: LuaEntity[] = []
    for (const ghost of ghosts) {
      const entity = !revive ? ghost : fullyRevive(ghost)
      if (!entity) {
        retryRevive[retryRevive.length] = ghost
      } else {
        entities[entities.length] = entity
      }
    }
    for (const ghost of retryRevive) {
      let entity = fullyRevive(ghost)
      if (!entity) {
        userWarning("could not revive ghost (something in the way?)")
        entity = ghost
      }
      entities[entities.length] = entity
    }
    return entities
  }

  private configureEntities(
    entities: LuaEntity[],
    mod: ((entity: LuaEntity) => void) | undefined,
    inclusion: AreaInclusion | undefined
  ): void {
    if (mod)
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

  private placeAllBlueprints() {
    dlog("Placing all blueprints for area:", this.name)
    for (const i of $range(1, this.inclusions.length)) {
      const inclusion = this.inclusions[i - 1]
      const sourceArea = inclusion.sourceArea
      if (!sourceArea.valid) {
        userWarning(
          "Area inclusion includes an invalid/deleted area. " +
            "This shouldn't happen, please report to the mod author. Skipping..."
        )
        continue
      }
      const includeFilters = this.includeFilters[inclusion.inventoriesIndex]
      switch (inclusion.includeMode) {
        case InclusionMode.None:
          break
        case InclusionMode.Select: {
          const includeBp = this.includeSelectBps[inclusion.inventoriesIndex]
          if (inclusion.lastUpdatedForSelectMode < sourceArea.updateNumber) {
            this.updateInclusionBp(includeBp, true, sourceArea.dataBp, inclusion.relativePosition, includeFilters)
            inclusion.lastUpdatedForSelectMode = sourceArea.updateNumber
          }
          this.configureEntities(
            this.placeBlueprint(includeBp, inclusion.relativePosition, getEditableIncludeForce(), true),
            configureIncluded,
            inclusion
          )

          break
        }
        case InclusionMode.All: {
          this.configureEntities(
            this.placeBlueprint(this.getIncludeAllBp(inclusion), inclusion.relativePosition, "player", true),
            configureIncluded,
            inclusion
          )
          break
        }
      }
      if (inclusion.ghosts && inclusion.includeMode !== InclusionMode.All) {
        // todo: make ghosts
        this.configureEntities(
          this.placeBlueprint(
            this.getIncludeAllBp(inclusion),
            inclusion.relativePosition,
            inclusion.includeMode === InclusionMode.Select ? getEditableViewForce() : "player",
            false
          ),
          configureView,
          inclusion
        )
      }
    }
    this.configureEntities(this.placeBlueprint(this.dataBp, undefined, "player", true), undefined, undefined)
  }

  private getIncludeAllBp(inclusion: AreaInclusionInternal): LuaItemStack {
    const bp = this.includeAllBps[inclusion.inventoriesIndex]
    const sourceArea = inclusion.sourceArea
    if (inclusion.lastUpdatedForAllMode < sourceArea.updateNumber) {
      const filters = this.includeFilters[inclusion.inventoriesIndex]
      this.updateInclusionBp(bp, false, sourceArea.dataBp, inclusion.relativePosition, filters)
      inclusion.lastUpdatedForAllMode = sourceArea.updateNumber
    }
    return bp
  }

  private updateInclusionBp(
    includeBp: LuaItemStack,
    matchInclude: boolean,
    sourceBp: LuaItemStack,
    relativePosition: Position,
    filters: LuaItemStack
  ): void {
    const sourceEntities = sourceBp.get_blueprint_entities()
    if (!sourceEntities) {
      includeBp.clear_blueprint()
      return
    }
    const allowedArea = shiftNegative(this.areaRelativeToCenter, relativePosition)

    let entitiesByPosition: VectorTable<string> | undefined
    if (matchInclude) {
      const thisEntities = includeBp.get_blueprint_entities()
      if (!thisEntities) return
      entitiesByPosition = {}
      for (const thisEntity of thisEntities) {
        const position = thisEntity.position as Position
        put(entitiesByPosition, position.x, position.y, thisEntity.name)
      }
    }

    const filtersAsSet = new LuaTable<string, true | undefined>()
    for (const [, entityFilter] of pairs(filters.entity_filters)) {
      filtersAsSet.set(entityFilter as string, true)
    }
    // empty filters is empty blacklist
    const isWhitelist = filters.entity_filter_mode === entity_filter_mode.whitelist && !isEmpty(filtersAsSet)

    for (const [luaIndex, sourceEntity] of ipairs(sourceEntities)) {
      const position = sourceEntity.position as Position
      const sourceName = sourceEntity.name
      let added: boolean
      if (!isIn(position, allowedArea) || filtersAsSet.has(sourceName) !== isWhitelist) {
        added = false
      } else if (!entitiesByPosition) {
        added = true
      } else {
        const includedName = get(entitiesByPosition, position.x, position.y)
        if (!includedName) {
          added = false
        } else if (includedName === sourceName) {
          added = true
        } else {
          const group1 = game.entity_prototypes[includedName].fast_replaceable_group
          const group2 = game.entity_prototypes[sourceName].fast_replaceable_group
          added = group1 !== undefined && group1 === group2
        }
      }
      if (!added) {
        sourceEntities[luaIndex - 1] = undefined as any
      }
    }

    includeBp.set_blueprint_entities(sourceEntities)
    includeBp.blueprint_snap_to_grid = [1, 1]
    includeBp.blueprint_absolute_snapping = true
  }

  // </editor-fold>
}

registerHandlers({
  on_gui_closed: BpArea.onFiltersClosed,
})
