import { settingNames } from "../constants"

export const DEBUG = settings.startup[settingNames.debug].value
log("Debug mode is: " + (DEBUG ? "ON" : "OFF"))
