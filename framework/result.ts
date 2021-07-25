import { Colors } from "../constants"

export type Result<T> =
  | {
      result: "ok"
      value: T
    }
  | {
      result: "error"
      message: LocalisedString
    }

export function getValueOrReport<T>(result: Result<T>, player: LuaPlayer): T | undefined {
  if (result.result === "error") {
    player.print(result.message, Colors.red)
    return undefined
  } else {
    return result.value
  }
}

export function getValueOrError<T>(result: Result<T>): T {
  if (result.result === "error") {
    error(result.message as string)
  } else {
    return result.value
  }
}
