# DashboardX Settings Hub: Desktop / Spatial / будущие AR-очки

The DashboardX **Настройки DashboardX** widget includes five native
`<details>` accordion groups (workspace management open by default):

1. **Рабочие пространства**: list, select, rename, delete and create spaces
   such as *Дом*, *Улица*, *Кафе*. Deletion uses the existing confirmation.
2. **Внешний вид и управление**: functional mirrors of the Desktop header:
   theme, fullscreen, enter/exit Spatial 3D, per-workspace background and
   RU/KZ/EN language buttons plus the GitHub creator profile link.
3. **Подключения**: existing Telegram and PRO-OPTIMA credential forms.
4. **DashboardX AI**: existing self-hosted BYOK gateway and API controls.
5. **Сброс данных**: mirrors header reset with the existing confirmation.

Buttons **delegate to the same original header handlers** rather than
implementing different persistence mechanisms. They work when the settings
widget is a live HTML panel in Three.js CSS3D.

## Switching while inside Spatial 3D

The Spatial 3D topbar has an always-available workspace selector plus
`+` to create a new workspace. This does not depend on having a Settings
widget in every workspace.

Both control surfaces dispatch `dashboardx:workspace-command` with:
`{action:'create',name}`, `{action:'select',id}`,
`{action:'rename',id,name}`, or `{action:'delete',id}`.

Only the application's central controller acts on these commands.
On a workspace transition, it safely restores original widget DOM
instances, rerenders the new workspace and **reenters Spatial 3D**
automatically. Existing Desktop layout and widget state remain independent.

The same widget instance may appear in more than one workspace, but its
3D pose is **per workspace**. Previous default `home` layout keys remain
unchanged; other spaces use `dashboardx:spatial:v1:<workspaceId>__<instanceId>`.
Physical width/height are still inherited from Desktop on every entry.

## Practical setup

- Create a space `Дом`; add the desired widgets in Desktop and arrange them.
- Enter Spatial 3D and set the room-relative X/Y/Z, rotations and transparency.
- Use the Spatial topbar to create `Улица`; its widget layout starts empty.
- Repeat for `Кафе`, and switch back any time. The other spaces stay saved.

All workspaces and 3D poses are stored **locally in this browser**. They are
not automatically synchronized across laptops/phones/AR glasses, and no
GPS or location-based auto-switching is performed. Cloud sync and
headset-specific input are future features, not current capabilities.
Deleting browser site data erases these local configurations.

OpenAI/Railway integration and secrets are not modified by these controls.
