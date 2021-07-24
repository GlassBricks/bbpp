import { registerHandlers } from "../framework/events"
import { isValid } from "../framework/util"
import { userWarning } from "../framework/logging"

// abusing forces as selection filters
// hey; it works well

export const editableIncludeForceName = "bbpp:editable-include"
export const editableViewForceName = "bbpp:editable-view"

export function getEditableIncludeForce(): LuaForce {
  return game.forces[editableIncludeForceName]
}

export function getEditableViewForce(): LuaForce {
  return game.forces[editableViewForceName]
}

function createForce(forceName: string, friend: boolean): LuaForce {
  let force = game.forces[forceName]
  if (!isValid(force)) {
    force = game.create_force(forceName)
    if (friend) {
      force.set_friend("player", true)
      game.forces.player.set_friend(force, true)
    }
    force.enable_all_prototypes()
    force.research_all_technologies()
  }
  return force
}

registerHandlers({
  on_init() {
    const includeForce = createForce(editableIncludeForceName, true)
    const viewForce = createForce(editableViewForceName, false)

    includeForce.set_friend(viewForce, true)
    viewForce.set_friend(includeForce, true)
  },
  on_forces_merged(e) {
    if (e.source_name === editableIncludeForceName || e.source_name === editableViewForceName) {
      userWarning("BBPP: A blueprint include force was removed. This will probably break stuff.")
    }
  },
})
