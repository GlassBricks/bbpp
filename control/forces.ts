import { registerHandlers } from "../framework/events"
import { isValid } from "../framework/util"

const viewOnlyForceName = "bbpp:view only"
const updateForceName = "bbpp:currently updating"

function getOrCreateForce(forceName: string): LuaForce {
  let force = game.forces[forceName]
  if (!isValid(force)) {
    force = game.create_force(forceName)
    force.set_friend("player", true)
    force.enable_all_prototypes()
    force.research_all_technologies()
  }
  return force
}

export function getViewOnlyForce(): LuaForce {
  return getOrCreateForce(viewOnlyForceName)
}

export function getUpdateForce(): LuaForce {
  return getOrCreateForce(updateForceName)
}

registerHandlers({
  on_init() {
    getOrCreateForce(viewOnlyForceName)
    getOrCreateForce(updateForceName)
  },
})
