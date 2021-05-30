type Global = {
  playerData: PRecord<number, PlayerData>
}

interface PlayerData {
  controls_active: boolean
  button_count: number
  selected_item?: string
}

declare const global: Global
