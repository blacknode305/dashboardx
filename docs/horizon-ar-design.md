# DashboardX HORIZON AR — visual system (October 2026)

The **HORIZON AR** redesign is loaded through one stylesheet,
[`client/css/ar-horizon.css`](../client/css/ar-horizon.css), **after**
all historical widget CSS and Spatial Preview CSS. It radically updates
the presentation without replacing or discarding the logic of any of the
28 widget types.

## Visual language

- Midnight / indigo / ocean blue ambience in Dark mode, with subtle
  geometric grid, soft ultraviolet depth, and restrained cyan/teal accents.
- Icy-blue pearl palette in Light mode, with the same structural hierarchy.
- Glass windows, frosted navigation, layered borders, stronger active window
  states, readable forms and subdued status colors.
- One palette for Desktop and Three.js Spatial 3D, including the procedural
  3D room: transparent AR panels remain legible over the environment.
- No continuously animated neon effects or required third-party CSS assets.

## How to try

Desktop site: `https://blacknode305.github.io/dashboardx/` once GitHub
Pages serves `main` and `/(root)`. A cache-busted CSS URL is used in
`index.html`.

Toggle Dark/Light with the existing `☼` control. Click `◈ Spatial 3D`
to see the same live widgets in the virtual room. Widget dimensions
still come from Desktop. Change glass transparency using the Spatial
inspector; that setting is unrelated to the new Desktop backgrounds.

If a wallpaper was explicitly selected by the user, the wallpaper
continues to be respected; the abstract design backdrop applies only
when no custom wallpaper is selected.

## Safe rollback

The previous `main` was saved as
`backup/main-before-ar-horizon-redesign-20261025`.

For just the visual theme, remove the final stylesheet link in
`index.html` pointing to `client/css/ar-horizon.css`; all historical
CSS modules continue to exist and all widget controllers remain unchanged.
The room's accent-material recoloring can be reverted separately.

## Non-goals / important limits

- No OpenAI API credentials were installed; all BYOK behaviour remains intact.
- No Railway service, 1C, PRO-OPTIMA database or widget data were modified.
- No breaking change to widget identifiers, stored desktop/spatial dimensions,
  coordinates or position bounds.
- The Three.js room is a virtual preview, not actual passthrough AR.
- Browser transparency and blur may vary with GPU support. Dark and Light
  contrasts should always be checked with real data; overlays over custom
  photos may warrant a stronger background.
