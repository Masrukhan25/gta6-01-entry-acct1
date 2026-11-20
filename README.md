[![make.fun bounty](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![make.fun rank](https://make.fun/badge/gta6-01/Masrukhan25/gta6-01-entry-acct1/rank.svg)](https://make.fun/bounty/gta6-01)
[![make.fun reward](https://make.fun/badge/gta6-01/Masrukhan25/gta6-01-entry-acct1/reward.svg)](https://make.fun/bounty/gta6-01)

# Tidebreak

Tidebreak is an original open-world crime game set in Maravela, a coastal city of ten districts. Follow a campaign about recovering stolen neighborhood funds, or set out on your own by road, water, or air.

## Play locally

With Node.js 22 or newer (and native TypeScript support enabled), run `node serve.ts` from this repository and open [http://localhost:8080](http://localhost:8080). Choose **New Game**, or **Continue** to load local progress. Use `node serve.ts --port 8081` to choose another port.

| Controls | Action |
| --- | --- |
| W / A / S / D | Move or drive |
| Shift | Sprint or boost |
| Space | Jump or handbrake; hold with W to lift a helicopter |
| E / Q | Interact, enter, exit, or vault / horn |
| Drag / left click | Orbit the camera / fire |
| 1 / 2 / 3 | Select pistol, shotgun, or rifle |
| H / P / Esc | Field Guide / phone / pause |
| R / N / C | Toggle rain / change day or night / tune to the next station |

The game has 12 story missions, three playable characters, eight vehicle types, four radio stations, and a five-star wanted system with ground and helicopter pursuit. The phone includes a map, mission list, stats, character switching, and radio tuning. See the [design guide](game/src/GAME.md) for a quick tour and the full catalog.

The game ships as static files and uses a locally vendored MIT-licensed Three.js build. All audio, including the radio music, is synthesized with Web Audio. Gameplay loads no external images or audio and makes no external network requests. The original game code is [MIT licensed](LICENSE).
