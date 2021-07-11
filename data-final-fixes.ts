import { Data } from "DataStage"

declare const data: Data
data.raw.tile["out-of-map"].autoplace = {
  default_enabled: false,
}
