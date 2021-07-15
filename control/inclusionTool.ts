import { registerHandlers } from "../framework/events"
import { Prototypes } from "../constants"
import { getBpForce } from "./forces"
import { BpArea, BpAreaEntityData } from "./BpArea"
import { getEntityData } from "../framework/entityData"

/** @noSelf */
function include(e: OnPlayerSelectedAreaPayload) {
  const viewForce = getBpForce("view", true)
  const includeForce = getBpForce("include", true)
  for (const entity of e.entities) {
    if (entity.force === viewForce) {
      entity.force = includeForce
    }
  }
}

function exclude(e: OnPlayerAltSelectedAreaPayload) {
  const viewForce = getBpForce("view", true)
  const includeForce = getBpForce("include", true)
  for (const entity of e.entities) {
    const entityData = getEntityData<BpAreaEntityData>(entity)
    if (!entityData) continue
    if (entity.force === includeForce) {
      const isViewing = BpArea.getById(entityData.areaId).relations[entityData.relationLuaIndex - 1].viewing
      if (isViewing) {
        entity.force = viewForce
      } else {
        entity.destroy()
      }
    }
  }
}

// todo: actually check if view/include mode is correct
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
})
