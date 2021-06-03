export function isValid(a: any): boolean {
  return typeof a === "object" && a.valid
}

export function destroyIfValid(a: any): void {
  if (isValid(a)) (a.destroy as () => void)()
}
