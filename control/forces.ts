import { registerHandlers } from "../framework/events"
import { isValid } from "../framework/util"
import { userWarning } from "../framework/logging"
import { Forces } from "../constants"

// abusing forces as selection filters
// hey; it works well

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
    const includeForce = createForce(Forces.editableInclude, true)
    const viewForce = createForce(Forces.editableView, false)

    includeForce.set_friend(viewForce, true)
    viewForce.set_friend(includeForce, true)
  },
  on_forces_merged(e) {
    if (e.source_name === Forces.editableInclude || e.source_name === Forces.editableView) {
      userWarning("BBPP: A blueprint force was removed. This will probably break stuff.")
    }
  },
})
