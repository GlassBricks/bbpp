import { registerHandlers } from "../framework/eventHandlers"

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

function on_init() {
  const freeplay = remote.interfaces["freeplay"]
  if (freeplay) {
    if (freeplay["set_skip_intro"])
      remote.call("freeplay", "set_skip_intro", true)
    if (freeplay["set_disable_crashsite"])
      remote.call("freeplay", "set_disable_crashsite", true)
  }
  global.playerData = {}

  for (let [_, player] of pairs(game.players)) {
    initialize_player(player)
  }
}

function on_player_created(e: OnPlayerCreatedPayload) {
  initialize_player(game.get_player(e.player_index))
}

function initialize_player(player: LuaPlayer) {
  initializePlayerData(player)
  buildGui(player)
}

function on_player_removed(e: OnPlayerRemovedPayload) {
  global.playerData[e.player_index] = undefined
}

function initializePlayerData(player: LuaPlayer) {
  global.playerData[player.index] = { controls_active: true, button_count: 0 }
}

function buildGui(player: LuaPlayer) {
  const playerData = global.playerData[player.index]!

  const screen = player.gui.screen
  if (screen["ugg_main_frame"]) {
    screen.ugg_main_frame.destroy()
  }

  const mainFrame = screen.add({
    type: "frame",
    name: "ugg_main_frame",
    caption: ["ugg.hello_world"],
  })
  mainFrame.style.size = [385, 165]
  mainFrame.auto_center = true

  const content_frame = mainFrame.add({
    type: "frame",
    name: "content_frame",
    direction: "vertical",
    style: "ugg_content_frame",
  })

  const controls_flow = content_frame.add({
    type: "flow",
    name: "controls_flow",
    direction: "horizontal",
    style: "ugg_controls_flow",
  })

  controls_flow.add({
    type: "button",
    name: "ugg_controls_toggle",
    caption: playerData.controls_active ? ["ugg.deactivate"] : ["ugg.activate"],
  })

  controls_flow.add({
    type: "slider",
    name: "ugg_controls_slider",
    value: playerData.button_count,
    minimum_value: 0,
    maximum_value: itemSprites.length,
    style: "notched_slider",
  })
  controls_flow.add({
    type: "textfield",
    name: "ugg_controls_textfield",
    text: tostring(playerData.button_count),
    numeric: true,
    allow_decimal: false,
    allow_negative: false,
    style: "ugg_controls_textfield",
  })

  const button_frame = content_frame.add({
    type: "frame",
    name: "button_frame",
    direction: "horizontal",
    style: "ugg_deep_frame",
  })
  button_frame.add({
    type: "table",
    name: "button_table",
    column_count: itemSprites.length,
    style: "filter_slot_table",
  })

  buildSpriteButtons(player)
}

function buildSpriteButtons(player: LuaPlayer) {
  const playerData = global.playerData[player.index]!

  const button_table =
    player.gui.screen.ugg_main_frame.content_frame.button_frame.button_table

  button_table.clear()
  const numButtons = playerData.button_count
  for (let i = 0; i < numButtons; i++) {
    const spriteName = itemSprites[i]
    const style =
      spriteName === playerData.selected_item
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

function on_gui_click(e: OnGuiClickPayload) {
  const player = game.get_player(e.player_index)
  const playerData = global.playerData[e.player_index]!
  if (e.element.name == "ugg_controls_toggle") {
    playerData.controls_active = !playerData.controls_active

    const element = e.element
    element.caption = playerData.controls_active
      ? ["ugg.deactivate"]
      : ["ugg.activate"]

    const controls_flow =
      player.gui.screen.ugg_main_frame.content_frame.controls_flow
    controls_flow.ugg_controls_slider.enabled = playerData.controls_active
    controls_flow.ugg_controls_textfield.enabled = playerData.controls_active
  } else if (e.element.tags.action == "ugg_select_button") {
    playerData.selected_item = e.element.tags.item_name as string
    buildSpriteButtons(player)
  }
}

function on_gui_value_changed(e: OnGuiValueChangedPayload) {
  if (e.element.name == "ugg_controls_slider") {
    const player = game.get_player(e.player_index)
    const playerData = global.playerData[e.player_index]!

    const new_button_count = e.element.slider_value
    playerData.button_count = new_button_count

    const controls_flow =
      player.gui.screen.ugg_main_frame.content_frame.controls_flow
    controls_flow.ugg_controls_textfield.text = tostring(new_button_count)

    buildSpriteButtons(player)
  }
}

function on_gui_text_changed(e: OnGuiTextChangedPayload) {
  if (e.element.name == "ugg_controls_textfield") {
    const player = game.get_player(e.player_index)
    const playerData = global.playerData[player.index]!

    const new_button_count = tonumber(e.element.text) || 0
    const capped_button_count = math.min(new_button_count, itemSprites.length)
    playerData.button_count = capped_button_count

    const controls_flow =
      player.gui.screen.ugg_main_frame.content_frame.controls_flow
    controls_flow.ugg_controls_slider.slider_value = capped_button_count

    buildSpriteButtons(player)
  }
}

registerHandlers("dev", {
  on_init,
  on_player_created,
  on_gui_click,
  on_gui_value_changed,
  on_gui_text_changed,
  dev_on_reload: () => {
    // on_init()
  },
})
