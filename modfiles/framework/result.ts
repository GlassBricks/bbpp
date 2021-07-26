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
    player.create_local_flying_text({ text: result.message, create_at_cursor: true })
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
