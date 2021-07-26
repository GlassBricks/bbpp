declare const __DebugAdapter: any
export const DEV = __DebugAdapter !== undefined
log("Dev mode is: " + (DEV ? "ON" : "OFF"))
