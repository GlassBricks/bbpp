# BBPP: Big BluePrint Planning

This is a mod for [Factorio](https://www.factorio.com) specifically for designing large and staged blueprints,
especially for blueprints in [100% speedruns](https://www.speedrun.com/factorio#100).

This mod (v0.1.0) is currently in **alpha**. That means, expect bugs, and changes in the future without backwards
compatibility. As such, feel free to play around and provide feedback, but use separate save files and backups.

Feedback is critical at this stage, as now is the last chance to easily make major changes. Are the controls or
features hard to use or unintuitive? Is there one particular feature that you really want to see? Are there any other
suggestions on how to improve the functionality? I would greatly appreciate all feedback of all types, which you can
give on the [mod forums](https://mods.factorio.com/mod/bbpp).

Public trello board (for what I'm considering/working on): https://trello.com/b/tHQtoUDA/bbpp

## Feature overview

This mod is created for designing blueprints, as such it is intended to be used with cheats or editor mode.

Almost all functionality of this mod is accessed through the **Blueprint area editor** GUI window, which you can open by
clicking the button labeled **BBPP** in the upper left corner.

### Blueprint areas

Most functionality of the mod centers on **Blueprint areas**, a rectangular area on the map where you build and plan a
blueprint or a portion of a larger blueprint. You can create a new area using the **Areas** tab of the Blueprint area
editor window.

Areas have a boundary, which are tiles that surround and mark an area.

#### Current limitations (that may be lifted in the future)

- Entities are supported, but _tiles_ are not currently supported.
- All areas must have a minimum boundary thickness of 1.
- Deleting an area does not remove its boundary tiles.

### Inclusions

You can add the entire or partial contents of one area to another using **inclusions**. Inclusions are added and managed
in the **Area controls** tab.

Inclusions can be added automatically with the centers of areas lined up, or you can choose a specific location for the
blueprint.

You can specify filters to for an inclusion. This is useful in creating "skeleton" blueprints.

There is a "ghost" mode, which adds a ghost of all entities of the source area, even if they are not included (in "None"
or "Select" mode).

There are currently three inclusion modes:

- All: in which all entities (matching filters) area added
- Select: in which you can manually choose which entities area added (see below).
- None: no entities included. Used to temporarily turn off an inclusion entirely.

As saving/updating areas is a somewhat computationally intensive operation, updates to areas are done manually. Changes
from one area are not reflected in other areas that include it until you *save* the source area and *save or reset* the
destination area.

#### Current limitations (that may be lifted in the future)

- Included entities currently cannot be mined or modified, to avoid confusion as they exist in a separate area.
- Inclusions do not currently contain other inclusions of the source area.
- Overlapping entities that can be reconfigured by blueprint pasting is not yet handled.

### Select inclusion

"Select" mode inclusion allows you to only choose specific entities to include.

To add or remove entities for select mode, turn on "ghosts" mode. Then use the **inclusion tool** (obtainable from the
shortcut bar, in the bottom left), to select/deselect ghosts/entities for inclusion.

If the entity in the source area is reconfigured, deleted, or replaced with an entity in the same fast-replace group, it
will be reflected in the inclusion.

#### Current limitations

- If an entity is deleted from the source area, then the destination area is reset, then the deleted entity is added
  again, the entity will not be added back to the destination area.

### Blueprints

You can obtain a blueprint of an entire area via the **blueprint** tab.

If you click "view/edit blueprint details", you can change the settings of the blueprint, and they will be saved: name,
icons, grid size/snapping, and notably *grid location*.

The blueprint will be updated every time you **save** an area.
