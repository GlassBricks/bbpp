import { registerHandlers } from "../framework/events"
import { dlog, userWarning } from "../framework/logging"
import { Defaults, PREFIX } from "../constants"
import { arrayRemoveElement, destroyIfValid, isEmpty } from "../framework/util"
import { DevButton } from "../framework/devButtons"
import * as position from "../framework/position"
import { getBpForLayer } from "./blueprintHandling"

export type LayerId = number

export abstract class Layer {
  readonly surface: LuaSurface
  readonly surfaceIndex: number
  readonly area: BoundingBox
  valid = true
  protected lastUpdated: number = game.ticks_played
  protected lastBlueprinted: number = this.lastUpdated - 1

  protected constructor(
    public readonly id: LayerId,
    public name: string,
    typeName: string,
    public readonly size: Position
  ) {
    // TODO: custom surfaces/areas
    this.surface = this.createSurface(typeName, size)
    this.surfaceIndex = this.surface.index
    global.layerBySurfaceIndex[this.surfaceIndex] = this
    this.area = position.sizeToArea(size)
  }

  static getBySurfaceIndex(surfaceIndex: number): Layer | undefined {
    return global.layerBySurfaceIndex[surfaceIndex]
  }

  delete(): void {
    if (!this.valid) {
      userWarning("WARNING: tried to delete a non-valid layer")
      return
    }
    this.valid = false
    global.layerBySurfaceIndex[this.surfaceIndex] = undefined
    if (this.surface.valid) {
      game.delete_surface(this.surface)
    }
  }

  markUpdated(): void {
    this.lastUpdated = game.ticks_played
  }

  protected createSurface(typeName: string, size: Position): LuaSurface {
    const surfaceName = `${PREFIX}layer${this.id}-${typeName}`
    const surface = game.create_surface(surfaceName, {
      width: size.x,
      height: size.y,
    })
    surface.generate_with_lab_tiles = true
    surface.freeze_daytime = true
    return surface
  }
}

export class DataLayer extends Layer {
  private blueprint!: LuaItemStack

  private constructor(
    id: LayerId,
    name: string,
    size: Position,
    public readonly isUserLayer: boolean,
    public readonly viewLayer?: ViewLayer
  ) {
    super(id, name, "data", size)
    global.dataLayers[id] = this
    if (isUserLayer) global.dataLayerUserOrder.push(this)
  }

  static create(name: string, size: Position = Defaults.layerSize): DataLayer {
    return new DataLayer(global.nextLayerId++, name, size, true)
  }

  static createAssociated(viewLayer: ViewLayer): DataLayer {
    // TODO change this to 'false' eventually
    return new DataLayer(viewLayer.id, "Associated with " + viewLayer.id, viewLayer.size, true, viewLayer)
  }

  static getById(id: LayerId): DataLayer {
    return global.dataLayers[id]!
  }

  static getDataLayerUserOrder(): DataLayer[] {
    return global.dataLayerUserOrder
  }

  delete(): void {
    global.dataLayers[this.id] = undefined
    if (this.isUserLayer) {
      arrayRemoveElement(global.dataLayerUserOrder, this)
    }
    super.delete()
    if (this.viewLayer && this.viewLayer.valid) this.viewLayer.delete()
  }

  getBlueprint(): LuaItemStack {
    // if (this.lastBlueprinted < this.lastUpdated) {
    this.blueprint = this.createBlueprint()
    // }
    return this.blueprint
  }

  private createBlueprint(): LuaItemStack {
    dlog("creating blueprint of data layer", this.id)
    const blueprint = getBpForLayer(0, this.id)
    const blueprintedEntities = blueprint.create_blueprint({
      surface: this.surface,
      force: "player",
      area: this.area,
      include_entities: true,
      include_modules: true,
      include_trains: true,
      include_station_names: true,
      include_fuel: true, // TODO make configurable
    })
    this.lastBlueprinted = game.ticks_played
    if (isEmpty(blueprintedEntities)) return blueprint
    const someEntity = blueprintedEntities[1]
    const blueprintEntity = blueprint.get_blueprint_entities()[0]
    blueprint.blueprint_snap_to_grid = [1, 1] as PositionIn as Position
    blueprint.blueprint_position_relative_to_grid = position.subtract(someEntity.position, blueprintEntity.position)
    return blueprint
  }
}

export interface LayerRelation {
  viewing: boolean
  // TODO: including
  editing: boolean
}

interface ViewingEntityData {
  entity: LuaEntity
  sourceLayer: LayerId
}

export class ViewLayer extends Layer {
  readonly dataLayer: DataLayer
  private readonly relations: PRecord<LayerId, LayerRelation> = {}
  // unit_number
  private readonly viewingEntities: PRecord<number, ViewingEntityData> = {}

  private constructor(id: LayerId, name: string, size: Position) {
    super(id, name, "view", size)
    global.viewLayers[id] = this
    global.viewLayerOrder.push(this)
    this.dataLayer = DataLayer.createAssociated(this)
    this.relations[this.id] = {
      editing: true,
      viewing: true,
    }
  }

  static create(name: string, size: Position = Defaults.layerSize): ViewLayer {
    return new ViewLayer(global.nextLayerId++, name, size)
  }

  static getById(id: LayerId): ViewLayer {
    return global.viewLayers[id]!
  }

  static getOrder(): ViewLayer[] {
    return global.viewLayerOrder
  }

  delete(): void {
    global.viewLayers[this.id] = undefined
    arrayRemoveElement(global.viewLayerOrder, this)
    super.delete()
    if (this.dataLayer.valid) this.dataLayer.delete()
  }

  getRelationTo(layerId: LayerId): LayerRelation {
    if (!this.relations[layerId]) {
      this.relations[layerId] = { viewing: false, editing: false }
    }
    return this.relations[layerId]!
  }

  deleteAllEntities(): void {
    dlog("deleting all entities via deconstruction", this.id)
    for (const [, data] of pairs(this.viewingEntities)) {
      destroyIfValid(data.entity)
    }
    this.surface.deconstruct_area({
      area: this.area,
      force: "player",
      skip_fog_of_war: false,
    })
    // TODO: auto destroy ghosts?
    const entities = this.surface.find_entities_filtered({
      area: this.area,
      to_be_deconstructed: true,
    })
    for (const entity of entities) {
      const success = entity.destroy()
      if (!success) dlog("Not successful destroy!")
      const unitNumber = entity.unit_number
      if (unitNumber) {
        this.viewingEntities[unitNumber] = undefined // TODO: track when entity is deleted anyways, maybe?
      }
      // TODO: destroy twice or in a loop in case of things?
    }
  }

  replaceAllEntities(): void {
    dlog("Replacing all entities in view layer", this.id)
    this.deleteAllEntities()
    this.placeAllViewingLayers()
  }

  placeAllViewingLayers() {
    for (const layer of DataLayer.getDataLayerUserOrder()) {
      // TODO: configurable placement order
      const relation = this.getRelationTo(layer.id)
      if (!relation || !relation.viewing) continue
      this.placeViewingLayer(layer)
    }
  }

  private placeViewingLayer(layer: DataLayer) {
    dlog("placing layer as viewing layer", layer.id)
    const blueprint = layer.getBlueprint()
    if (blueprint.get_blueprint_entity_count() === 0) return
    let ghosts = this.tryPlaceBlueprint(blueprint, false)
    if (ghosts.length === 0) {
      userWarning("Warning: overlapping entities (blueprints failed to place without force-build).")
      ghosts = this.tryPlaceBlueprint(blueprint, true)
    }
    // mark/configure all created entities
    for (const ghost of ghosts) {
      this.reviveGhost(ghost, layer)
    }
  }

  private reviveGhost(ghost: LuaEntity, layer: DataLayer) {
    const [, entity] = ghost.silent_revive()
    if (!entity) {
      userWarning("Not all ghosts could be placed (something in the way?)")
      return
    }
    const unitNumber = entity.unit_number
    if (!unitNumber) {
      dlog("No unit number on entity?")
      return
    }
    this.viewingEntities[unitNumber] = {
      entity,
      sourceLayer: layer.id,
    }
    entity.destructible = false
    entity.minable = false
    entity.rotatable = false
    entity.operable = false // todo allow things to change -- "inclusion"
  }

  private tryPlaceBlueprint(blueprint: LuaItemStack, forceBuild: boolean): LuaEntity[] {
    return blueprint.build_blueprint({
      surface: this.surface,
      force: "player",
      position: [0, 0],
      skip_fog_of_war: false,
      force_build: forceBuild,
    })
  }
}

DevButton("Delete all entities", (player) => {
  const surface = player.surface
  const layer = Layer.getBySurfaceIndex(surface.index)
  if (!layer || !(layer instanceof ViewLayer)) return dlog("not a view layer")
  layer.deleteAllEntities()
})

DevButton("Paste all entities", (player) => {
  const surface = player.surface
  const layer = Layer.getBySurfaceIndex(surface.index)
  if (!layer || !(layer instanceof ViewLayer)) return dlog("not a view layer")
  layer.placeAllViewingLayers()
})

DevButton("Replace all entities", (player) => {
  const surface = player.surface
  const layer = Layer.getBySurfaceIndex(surface.index)
  if (!layer || !(layer instanceof ViewLayer)) return dlog("not a view layer")
  layer.replaceAllEntities()
})

DevButton("Create blueprint of layer", (player) => {
  const surface = player.surface
  const layer = Layer.getBySurfaceIndex(surface.index)
  if (!layer || !(layer instanceof DataLayer)) return dlog("not a data layer")
  layer.getBlueprint()
})

registerHandlers({
  on_load() {
    for (const [, layer] of pairs(global.viewLayers)) {
      setmetatable(layer, ViewLayer.prototype as any)
    }
    for (const [, layer] of pairs(global.dataLayers)) {
      setmetatable(layer, DataLayer.prototype as any)
    }
  },
  on_surface_deleted({ surface_index }) {
    const layer = Layer.getBySurfaceIndex(surface_index)
    userWarning("NOTE: layer surface deleted outside of BBPP mod.")
    if (layer) layer.delete()
  },
})

// ----------

/*
registerHandlers({
  on_built_entity({ created_entity: entity }) {
    onEntityCreated(entity)
  },
  on_robot_built_entity({ created_entity: entity }) {
    onEntityCreated(entity)
  },
  on_entity_cloned(e) {
    onEntityCreated(e.destination)
  },

  on_pre_build: onPreBuild,
  on_entity_destroyed: onEntityDestroyed,
  on_player_rotated_entity({ entity }) {
    onPossiblyReconfigured(entity)
  },

  on_entity_settings_pasted({ destination }) {
    onPossiblyReconfigured(destination)
  },
  on_gui_closed({ entity }) {
    onPossiblyReconfigured(entity)
  },
})
*/

// ------

interface Global {
  // TODO: move to plans/layers/whatever
  dataLayers: PRecord<LayerId, DataLayer>
  viewLayers: PRecord<LayerId, ViewLayer>
  dataLayerUserOrder: DataLayer[]
  viewLayerOrder: ViewLayer[]

  layerBySurfaceIndex: PRecord<number, Layer>

  nextLayerId: number
}

declare const global: Global

registerHandlers({
  on_init() {
    global.dataLayers = {}
    global.viewLayers = {}
    global.dataLayerUserOrder = []
    global.viewLayerOrder = []
    global.layerBySurfaceIndex = {}
    global.nextLayerId = 0
  },
})
