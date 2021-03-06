/** @noSelfInFile */
import { DEV } from "./DEV"
import { Colors } from "../constants"

// TODO: better logging
export function userWarning(...args: any[]): void {
  const msg = getMessage(args)
  log(debugSrc() + msg)
  if (game) {
    game.print(msg, Colors.yellow)
  }
}

export function dlog(...args: any[]): void {
  const msg = debugSrc() + getMessage(args)
  log(msg)
  if (DEV && game) {
    game.print(msg)
  }
}

export function vlog(...args: any[]): void {
  if (!DEV) return
  dlog(...args)
}

function debugSrc(): string {
  const info = debug.getinfo(3, "Sl")!
  return info.short_src + ":" + info.currentline + ": "
}

function getMessage(args: any[]) {
  let msg = ""
  for (const arg of args) {
    if (msg) msg += " "
    if (type(arg) === "table") {
      msg += serpent.line(arg)
    } else {
      msg += arg
    }
  }

  return msg
}
