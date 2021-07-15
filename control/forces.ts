import { registerHandlers } from "../framework/events"
import { isValid } from "../framework/util"

// abusing forces as selection filters
// hey; it works well

const ForceNames: Record<"view" | "include", LuaTable<boolean, string>> = {
  view: new LuaTable(),
  include: new LuaTable(),
}
for (const [type, table] of pairs(ForceNames)) {
  table.set(false, "bbpp:" + type + "Uneditable")
  table.set(true, "bbpp:" + type + "Editable")
}

export function getBpForce(type: "view" | "include", editable: boolean): LuaForce {
  const forceName = ForceNames[type].get(editable)
  return game.forces[forceName]
}

function createForce(type: "view" | "include", editable: boolean): void {
  const forceName = ForceNames[type].get(editable)
  let force = game.forces[forceName]
  if (!isValid(force)) {
    force = game.create_force(forceName)
    if (type === "include") {
      force.set_friend("player", true)
      game.forces.player.set_friend(force, true)
    }
    force.enable_all_prototypes()
    force.research_all_technologies()
  }
}

registerHandlers({
  on_init() {
    createForce("view", false)
    createForce("view", true)
    createForce("include", false)
    createForce("include", true)

    for (const [, includeForce] of pairs(ForceNames.include)) {
      for (const [, viewForce] of pairs(ForceNames.view)) {
        game.forces[viewForce].set_friend(includeForce, true)
        game.forces[includeForce].set_friend(viewForce, true)
      }
    }
  },
})
