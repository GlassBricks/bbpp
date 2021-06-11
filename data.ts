import { Data } from "DataStage"
import { Prototypes } from "./constants"

declare const data: Data
const emptyImage = "__core__/graphics/empty.png"
const emptySprite = {
  filename: emptyImage,
  priority: "extra-high",
  line_length: 1,
  width: 1,
  height: 1,
  frame_count: 1,
  direction_count: 1,
  animation_speed: 1,
}

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
/*

const constantCombinator = data.raw["constant-combinator"]["constant-combinator"]
const bpCenterMarker = {
  type: "constant-combinator",
  name: Prototypes.bpCenterMarker,
  flags: ["player-creation", "not-on-map"],
  selectable_in_game: false,
  collision_mask: {},
  collision_box: [
    [-0.5, -0.5],
    [0.5, 0.5],
  ],
  item_slot_count: 1,
  sprites: constantCombinator.sprites,
  activity_led_sprites: emptySprite,
  activity_led_light_offsets: [
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
  ],
  circuit_wire_connection_points: [
    { shadow: { red: [0, 0], green: [0, 0] }, wire: { red: [0, 0], green: [0, 0] } },
    { shadow: { red: [0, 0], green: [0, 0] }, wire: { red: [0, 0], green: [0, 0] } },
    { shadow: { red: [0, 0], green: [0, 0] }, wire: { red: [0, 0], green: [0, 0] } },
    { shadow: { red: [0, 0], green: [0, 0] }, wire: { red: [0, 0], green: [0, 0] } },
  ],
  placeable_by: { item: Prototypes.bpCenterMarker, count: 0 },
}
// This is so that the entity may be included in blueprints, for further processing.
const bpCenterMarkerItem = {
  type: "item",
  name: Prototypes.bpCenterMarker,
  flags: ["hidden"],
  stack_size: 1,
  icon: emptyImage,
  icon_size: 1,
}
data.extend([bpHandlingChest, bpCenterMarker, bpCenterMarkerItem])
*/
