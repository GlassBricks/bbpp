import { Data } from "DataStage"
import { Prototypes } from "./constants"

declare const data: Data
const steelChest = table.deepcopy(data.raw.container["steel-chest"])
const bpHandlingChest = {
  ...steelChest,
  name: Prototypes.bpHandlingChest,
  flags: ["hidden"],
  collision_mask: {},
  inventory_size: 50,
}
bpHandlingChest.minable = undefined
bpHandlingChest.fast_replaceable_group = undefined

data.extend([bpHandlingChest])
