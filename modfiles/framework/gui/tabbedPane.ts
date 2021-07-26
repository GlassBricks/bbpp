/**
 * Alternating tab - content children
 */
export function setupTabbedPane(element: TabbedPaneGuiElement): void {
  const children = element.children
  for (let i = 0; i < children.length; i += 2) {
    element.add_tab(children[i] as TabGuiElement, children[i + 1])
  }
  if (children.length > 0) {
    element.selected_tab_index = 1
  }
}
