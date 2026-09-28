# User Interface Skins

A gallery of experimental interfaces. Each skin lives in its own folder and has a live page you can open.

**Gallery:** [https://mecca-research.github.io/User-Interface-Skins-/](https://mecca-research.github.io/User-Interface-Skins-/)

## Skins

| Name | Try it | Folder |
| --- | --- | --- |
| Network Sphere | [Open Network Sphere](https://mecca-research.github.io/User-Interface-Skins-/network-sphere/) | [`skins/network-sphere`](skins/network-sphere) |
| Token Lake | [Open Token Lake](https://mecca-research.github.io/User-Interface-Skins-/token-lake/) | [`skins/token-lake`](skins/token-lake) |

### Network Sphere

A dark navy constellation of glass nodes on a rolling sphere. Drag to turn it, open a node into a glass window, name it, and keep a note. Five sphere sizes remember their own titles.

### Token Lake

A receding bed of curved English script. Ask from the bottom bar and the line sinks into the water. One glass boat forms on the swell and keeps vibrating until the reply fades in. Drag the header, resize the corner, minimize to a tab, or continue inside that boat. The bottom bar starts a new boat.

The published Token Lake page is the interface itself. Replies there are local, so the motion can be tried without a server. The hosted conversation app is separate.

## Add a skin

1. Create `skins/<id>/` with an `index.html` people can open.
2. Add an object to [`skins.json`](skins.json):

```json
{
  "id": "your-id",
  "name": "Your Name",
  "description": "One sentence on what to try.",
  "static": true
}
```

If the skin needs a build, set `"build": "npm run build:pages"` and `"output": ".output/public"` instead of `"static": true`. Install its dependencies in the Pages workflow the same way Network Sphere is installed.

3. Push to `main`. The site lists it and links to `./<id>/`.

## Run Network Sphere locally

```bash
cd skins/network-sphere
npm install
npm run dev
```
