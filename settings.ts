import { settingNames } from "./constants"
import { SettingsData } from "Settings"

declare const data: SettingsData

data.extend([
  {
    type: "bool-setting",
    name: settingNames.debug,
    default_value: false,
    setting_type: "startup",
  },
])
