import { registerHandlers } from "../framework/events"
import { Prototypes } from "../constants"
import { BpAreaEntityData } from "./BpArea"
import { getEntityData, getEntityDataByUnitNumber, setEntityData } from "../framework/entityData"
import { configureIncluded } from "./viewInclude"
import {
  editableIncludeForceName,
  editableViewForceName,
  getEditableIncludeForce,
  getEditableViewForce,
} from "./forces"
import { userWarning } from "../framework/logging"
import { fullyRevive } from "./revive"

/** @noSelf */
function include(e: OnPlayerSelectedAreaPayload) {
  const viewForce = getEditableViewForce()
  const includeForce = getEditableIncludeForce()
  for (const ghost of e.entities) {
    if (ghost.force !== viewForce || ghost.name !== "entity-ghost") continue
    const data = getEntityData<BpAreaEntityData>(ghost)
    if (!data) continue

    const revived = fullyRevive(ghost)
    if (!revived) {
      userWarning("Could not revive ghost (something in the way?)")
    } else {
      setEntityData(revived, data)
      revived.force = includeForce
      configureIncluded(revived)
    }
  }
}

function exclude(e: OnPlayerAltSelectedAreaPayload) {
  const includeForce = getEditableIncludeForce()
  for (const entity of e.entities) {
    if (entity.force !== includeForce) continue
    const data = getEntityData<BpAreaEntityData>(entity)
    if (!data) continue

    const inclusion = data.inclusion
    if (inclusion && inclusion.ghosts) {
      entity.die(includeForce)
    } else {
      entity.destroy()
    }
  }
}

function setupGhost(e: OnPostEntityDiedPayload) {
  for (const corpse of e.corpses) {
    corpse.destroy()
  }
  for (const explosion of game.get_surface(e.surface_index)!.find_entities_filtered({
    position: e.position,
    type: "explosion",
  })) {
    explosion.destroy()
  }
  const data = getEntityDataByUnitNumber<BpAreaEntityData>(e.unit_number!)
  const ghost = e.ghost!
  ghost.time_to_live = 4_294_967_295 // = never expire
  setEntityData(ghost, data)
  ghost.force = editableViewForceName
}

registerHandlers({
  on_player_selected_area(e) {
    if (e.item === Prototypes.inclusionTool) {
      include(e)
    }
  },
  on_player_alt_selected_area(e) {
    if (e.item === Prototypes.inclusionTool) {
      exclude(e)
    }
  },
  on_post_entity_died(e) {
    if (e.ghost && e.unit_number && e.force && e.force.name === editableIncludeForceName) setupGhost(e)
  },
})
