# Requirements:

- Have multiple "stages"/"parts".
- Can view stages cumulatively.
- Can test stages, include cumulatively
- Can form skeletons + incremental building out of stages
- Can edit layers, including re-having stuff from other layers for reconfigure.
- Can select some things from other layers to view temporarily, or manually semi-permanently (alignment).
- Can complain when layers overlap
- Can move stuff from one stage/stage view and reflect in appropriate part (get me more room in stage 1)
- Can move stuff between layers
- Can break up layers into more layers

# Draft 1

## Data layers

Hold only unique/differing parts of each stage

Maybe only internal/not drectly editable

## Views

For editing:

- Some entities included, only viewing, not editing, for Alginment (get sense of space, interaction)
- Some entire layers included for editing
    - Multiple layers? How does that work
- Some entities from previous layers repeated included for reconfiguration

For testing:

- Some entities included for testing/reference
- Some entire layers included
- Some OWN entities for testing

For blueprinting:

- Some entities included for alignment
- Some entities/parts of layers (auto generated) included for staged blueprinting

Common requirements:

- Include entire layers for EDITING
- Include configurable some parts of layers, WITHOUT EDITING, for just viewing
- Include entire layers for VIEWING, then manually including for ^^^, no editing
- Including certain FILTERS

# Approach

Have some data layers, some view layers.

Data layers are only data.

View layers view data layers, and maybe hold their own info too.

## View interface

For each data layer, user can configure:

- No inclusion
- View all entities from layer ("view").
- Edit
    - Only one layer at a time for now. Can edit own self as layer too
    - When editing, EVERYTHING is automatically set to at least "view/include"

Lock layer

- when locked, cannot modify stuff at this layer (view change, or otherwise).

Auto-include new:

- Can set to only auto include NEW or non-exluded items with (separate?) filter
- Useful or skeleton stuff

Include everything once button

Idea:

| Layer | View | View Filter | Include | Include filter | Lock | Edit
| :---: |:---: |:---:        |:---:    |:---:           |:---: |:---:
|  Name |  X   |  [...]      | "all"   |  [...]         | X    | X

Maybe switch "include" and "view"

## Other view functions

In "view" mode, can manually select/deselect entities to "include"

- Need some sort of INDICATOR

If not locked, "include" entities can also be deleted to removed, and turn either into nothing or "view" entities

When "editing", changes are made directly to the layer

Can select filters for any include mode

## Some view behavior/functions

Entities in "include" mode can be reconfigured (but not removed), in which case it will be present in that blueprint too
> ^^ To be considered

The view itself can be can layer chosen for edit, to get entities that live only in that layer.

Need way to "move" entities to another layer. "Selection planner?/Move to current layer"

Temporarily hide everything except what is selected in "edit" (only show one layer)

- Make special layer for this
- Need to somehow keep track of which entities are auto-include vs manual-include through this

Anytime an overlap happens when trying to generate a view, warn

Have auto generated "cumulative" view for verification (checking for overlaps, etc.)

Undo support

## What happens when:

Entity is built

- Selected "edit" layer gets added entity
- The entity automatically becomes an "include" entity

Entity is removed

- If the entity source is from current "edit" layer, entity is removed from layer
- Else if entity source is from "viewed" layer, and that layer is view-editable (include not set to include-all, layer
  not locked), removed from the view only
- Disallowed for view-include, or view-locked Turn into ghosts?

Entity is reconfigured

- If entity source is from an "edit" layer, original entity is modified
- If is from "view" layer, reconfigured entity is added to the "edit" layer
- If view-locked, disallowed

## More technical details

Layers should have an ordering. No great way around that.

Each entity:

In a layer, just exists

- Has an ID shared across all views
- May re-include entities for reconfigure/other reasons?

In views:

- Records its SOURCE layer/source id
- Records its include mode:
    - Source is this view
    - "view-only" (will be deleted when view mode turned off)
    - "include" (exists)

## How to:

### Create a staged blueprint plan:

- Get multiple layers
- Build each "stage" in a different layer, one view per layer

### Weave a belt through a previous layer

- Select previous layer as "view", current layer as "edit"
- Build belt

### Check for conflicts

- Go to cumulative layer and click "refresh"
- Will warn

### Resolve conflicts

- previous layer shown, next layer shown as ghost
- Remove previous layer from view, refresh, move around current layer
- OR: remove current layer from view, refresh, move around past layer

### Change recipies of a entity in a later blueprint

- In a view, select old recipie for "include"
- Select new entity for "edit"
- Make change

### See entities of other layers for alignment purposes only

- Select other layer as "view", and "locked"
- Include selected entities
- Turn off "view"

### Semi-automatically create skeleton blueprint

- In a view, set layer as "view" with filter
- Include everything
- Unselect "view"
- Delete what you need

## LATER:

Blueprint plans/set

Auto-blueprint generation/grid-size/book generation/etc.

Viewing other _views_?

Edit multiple layers at once (???)

Copy/paste shenanigans?

Auto Include connected wires (in blueprint, or in view ??? )

Upgrade/deletion/ignore planner?

Layer backups/archive/version control

Layer splitting (create new layer -- move items to layer)

Auto-landfill

Basic check (all things have power, all belts/inserters are useful, etc.)

More advanced checks (redundant powerpoles, belt-tracing, roboport coverage, etc.)

Super advanced checks (maybe deserves its own mod)
