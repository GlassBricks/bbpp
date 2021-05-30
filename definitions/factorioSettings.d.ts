declare module "Settings" {
  type SettingType = "startup" | "runtime-global" | "runtime-per-user"

  type BaseSettingDefinition = {
    type: string
    name: string
    localized_name?: LocalisedString
    localized_description?: LocalisedString
    order?: string
    hidden?: boolean
    setting_type: SettingType
  }

  type BoolSettingDefinition = BaseSettingDefinition & {
    type: "bool-setting"
    default_value: boolean
    forced_value?: boolean
  }

  type IntSettingDefinition = BaseSettingDefinition & {
    type: "int-setting"
    default_value: number
    minimum_value?: number
    maximum_value?: number
    allowed_values?: number[]
  }

  type DoubleSettingDefinition = BaseSettingDefinition & {
    type: "double-setting"
    default_value: number
    minimum_value?: number
    maximum_value?: number
    allowed_values?: number[]
  }

  type StringSettingDefinition = BaseSettingDefinition & {
    type: "string-setting"
    default_value: string
    allow_blank?: boolean
    auto_trim?: boolean
    allowed_values?: string[]
  }

  type SettingDefinition =
    BoolSettingDefinition
    | IntSettingDefinition
    | DoubleSettingDefinition
    | StringSettingDefinition

  interface SettingsData {
    // raw: any,
    extend(data: SettingDefinition[]): void
  }

  // const data: SettingsData
}