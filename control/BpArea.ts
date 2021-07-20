import { userWarning } from "../framework/logging"
import { registerHandlers } from "../framework/events"
import { arrayRemoveValue, isEmpty } from "../framework/util"
import { add, Area, getCenter, multiplyArea, subtract } from "../framework/position"
import { Prototypes } from "../constants"
import { get, put, VectorTable, vectorTableRemoveValue } from "../framework/VectorTable"
import { getEntityData, setEntityData } from "../framework/entityData"
import { getBpForce } from "./forces"
import { configureIncluded, configureView } from "./viewInclude"

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

    for (const [, surface] of pairs(game.surfaces)) {
      BpSurface._on_surface_created(surface)
    }
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
    global.bpSurfaceByIndex[surface.index] = new BpSurface(surface)
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
  createNewArea(name: string, chunkArea: Area, boundaryThickness: number): BpArea {
    const area = multiplyArea(chunkArea, 32)
    const bpArea = BpArea._create(this, area, name)

    this.areas[this.areas.length] = bpArea
    // generate chunks/set chunks
    for (const x of $range(chunkArea[0].x, chunkArea[1].x)) {
      for (const y of $range(chunkArea[0].y, chunkArea[1].y)) {
        if (!this.surface.is_chunk_generated([x, y])) {
          this.surface.set_chunk_generated_status([x, y], defines.chunk_generated_status.entities)
        }
        put(this.bpAreasByChunk, x, y, bpArea)
      }
    }
    this.surface.build_checkerboard(area)
    this.createBoundary(area, boundaryThickness)

    return bpArea
  }

  getAreaAt(position: Position): BpArea | undefined {
    const blockX = Math.floor(position.x / 32)
    const blockY = Math.floor(position.y / 32)
    return get(this.bpAreasByChunk, blockX, blockY)
  }

  _areaDeleted(area: BpArea): void {
    // todo: go to EVERY area referenced and delete
    assert(!area.valid)
    if (!this.valid) return

    arrayRemoveValue(this.areas, area)
    vectorTableRemoveValue(this.bpAreasByChunk, area)
  }

  private createBoundary(fullArea: Area, boundaryThickness: number) {
    const tiles: Tile[] = []
    for (let t = 0; t < boundaryThickness; t++) {
      for (let x = fullArea[0].x + boundaryThickness; x < fullArea[1].x; x++) {
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
      for (let y = fullArea[0].y; y < fullArea[1].y + boundaryThickness; y++) {
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
    this.surface.set_tiles(tiles)
  }

  // </editor-fold>
}

registerHandlers({
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
  readonly id: number
  valid: boolean = true

  readonly surface: LuaSurface

  readonly center: Position
  readonly relations: AreaRelationInternal[] = []
  editingAreaId: number

  readonly inventory: LuaInventory = game.create_inventory(8)
  readonly dataBp = this.inventory[1]
  private readonly includeBps: LuaInventory

  public static readonly boundaryTile = Prototypes.boundaryTileWhite

  // <editor-fold desc="Creation and deletion">

  private constructor(public readonly bpSurface: BpSurface, public readonly area: Area, public name: string) {
    this.id = global.nextBpAreaId++
    this.surface = this.bpSurface.surface

    this.center = getCenter(area)

    this.dataBp.set_stack({ name: "blueprint" })
    this.inventory[2].set_stack({ name: "blueprint-book" })
    this.includeBps = this.inventory[2].get_inventory(defines.inventory.item_main)!
    this.editingAreaId = this.id

    this.addRelation({
      areaId: this.id,
      includeMode: IncludeMode.All,
      relativePosition: { x: 0, y: 0 },
      viewing: false,
    })

    global.bpAreaById[this.id] = this
  }

  static _create(bpSurface: BpSurface, area: Area, name: string): BpArea {
    return new BpArea(bpSurface, area, name)
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
