import { DEV } from "./DEV"

export function wlog(...args: any[]): void {
  doLog(args, { r: 255, g: 204, b: 20 })
}

export function dlog(...args: any[]): void {
  doLog(args, DEV ? 0 : null)
}

export function vlog(...args: any[]): void {
  if (!DEV) return
  dlog(...args)
}

function doLog(args: any[], colorOrNoPrint: Color | 0 | null) {
  const tick = game ? game.tick : 0
  let msg = ""
  for (const v of args) {
    if (msg) msg += " "
    if (type(v) === "table") {
      msg += serpent.block(v)
    } else {
      msg += v
    }
  }

  log(`${tick} ${msg}`)

  if (colorOrNoPrint !== null && game) {
    const message = `${tick} ${script.mod_name}: ${msg}`
    if (colorOrNoPrint === 0) {
      game.print(message)
    } else {
      game.print(message, colorOrNoPrint)
    }
  }
}
