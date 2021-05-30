import { settingNames } from "../constants"

export const DEBUG = settings.startup[settingNames.debug]

log("Debug mode is: " + (DEBUG ? "ON" : "OFF"))


export function dlog(...args: any[]) {
  const tick = game ? game.tick : 0
  let msg = ""
  for (const v of args) {
    if (msg) msg += " "
    if (type(v) == "table") {
      msg += serpent.block(v)
    } else {
      msg += v
    }
  }

  log(`${tick} ${msg}`)

  if (DEBUG && game) game.print(`${tick} ${script.mod_name}: ${msg}`)
}

export function vlog(...args: any[]) {
  if (!DEBUG) return
  dlog(...args)
}
