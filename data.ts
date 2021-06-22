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

const styles = data.raw["gui-style"].default

styles.ugg_content_frame = {
  type: "frame_style",
  parent: "inside_shallow_frame_with_padding",
  vertically_stretchable: "on",
}

styles.ugg_controls_flow = {
  type: "horizontal_flow_style",
  vertical_align: "center",
  horizontal_spacing: 16,
}

styles.ugg_controls_textfield = {
  type: "textbox_style",
  width: 36,
}

styles.ugg_deep_frame = {
  type: "frame_style",
  parent: "slot_button_deep_frame",
  vertically_stretchable: "on",
  horizontally_stretchable: "on",
  top_margin: 16,
  left_margin: 8,
  right_margin: 8,
  bottom_margin: 4,
}
