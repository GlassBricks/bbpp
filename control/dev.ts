import { createPlayerData } from "../framework/playerData"
import { buildGui, GuiTemplate, updateGui } from "../framework/gui"

interface UGGPlayerState {
  controlsActive: boolean
  buttonCount: number
  selectedItem?: string
}

const guiState = createPlayerData<UGGPlayerState>(
  "guiState",
  () => ({ controlsActive: true, buttonCount: 5 }),
  (player, data) => {
    buildGui(player.gui.screen, guiTemplate, data)
  }
)

const itemSprites = [
  "inserter",
  "transport-belt",
  "stone-furnace",
  "assembling-machine-3",
  "logistic-chest-storage",
  "sulfur",
  "utility-science-pack",
  "laser-turret",
]

// TODO: make more integrated
function updateRootGui(player: LuaPlayer) {
  updateGui(
    player.gui.screen.ugg_main_frame!,
    guiTemplate,
    guiState[player.index]
  )
}

const guiTemplate: GuiTemplate<UGGPlayerState> = {
  type: "frame",
  name: "ugg_main_frame",
  caption: ["ugg.hello_world"],
  onCreated() {
    this.style.size = [385, 165]
    this.auto_center = true
  },
  children: [
    {
      type: "frame",
      name: "content_frame",
      direction: "vertical",
      style: "ugg_content_frame",
      children: [
        {
          type: "flow",
          name: "controls_flow",
          direction: "horizontal",
          style: "ugg_controls_flow",
          children: [
            {
              type: "button",
              name: "ugg_controls_toggle",
              onDataUpdate(state) {
                this.caption = state.controlsActive
                  ? ["ugg.deactivate"]
                  : ["ugg.activate"]
              },
              onAction(event) {
                const player = game.get_player(event.player_index)
                const state = guiState[event.player_index]
                state.controlsActive = !state.controlsActive
                updateRootGui(player)
              },
            },
            {
              type: "slider",
              name: "ugg_controls_slider",
              minimum_value: 0,
              maximum_value: itemSprites.length,
              style: "notched_slider",
              onDataUpdate(state) {
                this.enabled = state.controlsActive
                this.slider_value = state.buttonCount
              },
              onAction(e) {
                const player = game.get_player(e.player_index)
                const state = guiState[e.player_index]
                state.buttonCount = e.element.slider_value
                updateRootGui(player)
              },
            },
            {
              type: "textfield",
              name: "ugg_controls_textfield",
              numeric: true,
              allow_decimal: false,
              allow_negative: false,
              style: "ugg_controls_textfield",
              onDataUpdate(state) {
                this.enabled = state.controlsActive
                this.text = tostring(state.buttonCount)
              },
              onAction(e) {
                const player = game.get_player(e.player_index)
                const state = guiState[e.player_index]

                const new_button_count = tonumber(e.element.text) || 0
                state.buttonCount = math.min(
                  new_button_count,
                  itemSprites.length
                )

                updateRootGui(player)
              },
            },
          ],
        },
        {
          type: "frame",
          name: "button_frame",
          direction: "horizontal",
          style: "ugg_deep_frame",
          children: [
            {
              type: "table",
              name: "button_table",
              column_count: itemSprites.length,
              style: "filter_slot_table",
              onDataUpdate(state) {
                buildSpriteButtons(this, state)
              },
            },
          ],
        },
      ],
    },
  ],
}

function buildSpriteButtons(
  button_table: LuaGuiElement,
  state: UGGPlayerState
) ,{
  button_table.clear()
  const numButtons = state.buttonCount
  for (let i = 0; i < numButtons; i++) {
    const spriteName = itemSprites[i]
    const style =
      spriteName === state.selectedItem
        ? "yellow_slot_button"
        : "recipe_slot_button"
    button_table.add({
      type: "sprite-button",
      sprite: "item/" + spriteName,
      style: style,
      tags: {
        action: "ugg_select_button",
        item_name: spriteName,
      },
    })
  }
}

//
// function on_gui_click(e: OnGuiClickPayload) {
//   const player = game.get_player(e.player_index)
//   const state = guiState[e.player_index]
//
//   if (e.element.name == "ugg_controls_toggle") {
//     state.controlsActive = !state.controlsActive
//
//     const element = e.element
//     element.caption = state.controlsActive
//       ? ["ugg.deactivate"]
//       : ["ugg.activate"]
//
//     const controls_flow =
//       player.gui.screen.ugg_main_frame.content_frame.controls_flow
//     controls_flow.ugg_controls_slider.enabled = state.controlsActive
//     controls_flow.ugg_controls_textfield.enabled = state.controlsActive
//   } else if (e.element.tags.action == "ugg_select_button") {
//     state.selectedItem = e.element.tags.item_name as string
//     buildSpriteButtons(player)
//   }
// }
//
// function on_gui_value_changed(e: OnGuiValueChangedPayload) {
//   if (e.element.name == "ugg_controls_slider") {
//     const player = game.get_player(e.player_index)
//     const state = guiState[e.player_index]
//
//     const new_button_count = e.element.slider_value
//     state.buttonCount = new_button_count
//
//     const controls_flow =
//       player.gui.screen.ugg_main_frame.content_frame.controls_flow
//     controls_flow.ugg_controls_textfield.text = tostring(new_button_count)
//
//     buildSpriteButtons(player)
//   }
// }
//
// function on_gui_text_changed(e: OnGuiTextChangedPayload) {
//   if (e.element.name == "ugg_controls_textfield") {
//     const player = game.get_player(e.player_index)
//     const state = guiState[e.player_index]
//
//     const new_button_count = tonumber(e.element.text) || 0
//     const capped_button_count = math.min(new_button_count, itemSprites.length)
//     state.buttonCount = capped_button_count
//
//     const controls_flow =
//       player.gui.screen.ugg_main_frame.content_frame.controls_flow
//     controls_flow.ugg_controls_slider.slider_value = capped_button_count
//
//     buildSpriteButtons(player)
//   }
// }
