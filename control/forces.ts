import { registerHandlers } from "../framework/events"
import { isValid } from "../framework/util"

let viewOnlyForce: LuaForce

const viewOnlyForceName = "bbpp:view only"

function createOrLoadViewOnlyForce() {
  let force = game.forces[viewOnlyForceName]
  if (!isValid(force)) {
    force = game.create_force(viewOnlyForceName)
    force.set_friend("player", true)
    force.enable_all_prototypes()
    force.research_all_technologies()
  }
  viewOnlyForce = force
}

export function getViewOnlyForce(): LuaForce {
  if (!viewOnlyForce) {
    createOrLoadViewOnlyForce()
  }
  return viewOnlyForce
}

registerHandlers({
  on_init: createOrLoadViewOnlyForce,
})
