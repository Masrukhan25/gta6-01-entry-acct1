# Tidebreak design guide

Tidebreak is an original open-world crime game set in Maravela. A courier, a mechanic, and a former harbor guard uncover what happened to the neighborhood treasury. Players can follow the campaign or explore the city on foot, by road, by boat, or by helicopter.

## Maravela

The 480 m city is laid out as a 4 × 4 grid of 120 m chunks. Rows follow increasing Z; columns follow increasing X. Buildings switch to simpler geometry at a distance while collision footprints stay detailed. District signs, the HUD, and the minimap help orient players.

| Z range | West | West central | East central | East |
| --- | --- | --- | --- | --- |
| −240 to −120 | Hills | Suburbs | Industrial | Airfield |
| −120 to 0 | Boardwalk | Old Town | Glass Downtown | Harbor |
| 0 to 120 | Boardwalk | Old Town | Neon Strip | Harbor |
| 120 to 240 | Highway Loop | Suburbs | Industrial | Harbor |

The west coastline and inner harbor are swimmable. On land, the player can sprint, jump, and vault low obstacles. Traffic and pedestrians populate the roads and streets. Time can cycle automatically or be set through the HUD; rain can be toggled independently.

## Characters and campaign

Mara Voss is the courier, Dario Hale the mechanic, and Lena Kade the former harbor guard. Switch in the phone's **Character** tab. Starting a mission switches to its lead character.

| # | Mission | Lead | Focus |
| --- | --- | --- | --- |
| 1 | Salt Letter | Mara | Collect and deliver the sealed letter |
| 2 | Second Ignition | Dario | Recover and deliver workshop tools by vehicle |
| 3 | Guard Records | Lena | Find the watchkeeper and secure the records |
| 4 | Lantern Route | Mara | Run timed checkpoints and deliver a route sketch |
| 5 | Brisa Circuit | Dario | Drive the timed workshop circuit |
| 6 | Quiet Transfer | Lena | Pick up and deliver a dock witness |
| 7 | Broken Signal | Mara | Defeat rival guards and recover the transmitter |
| 8 | Foundry Freight | Dario | Recover and drive out a freight manifest |
| 9 | Watchkeepers | Lena | Clear the enforcers and escort the lookout |
| 10 | Tide Window | Mara | Time the approach and collect the gate key |
| 11 | Night Convoy | Dario | Drive a decoy shipment through downtown |
| 12 | The Harbor Reckoning | Lena | Recover the treasury ledger and escape by vehicle |

Press E near a gold mission marker. The objective tracker shows the task, progress, and any timer; a world marker and minimap target guide the route. Losing all health, missing a deadline, or wrecking a required vehicle can fail a mission. Return to its marker to retry. First completions pay cash and respect; rank rises every 100 respect. The phone lists mission progress and previews campaign order.

## Vehicles and side activities

| Type | Model | Where to try it |
| --- | --- | --- |
| Sedan | Maravela Solana | Boardwalk, (−174, 5) |
| Sports car | Brisa Veloce | Boardwalk, (−168, 5) |
| Muscle car | Candela Rumbler | Boardwalk, (−162, 5) |
| SUV | Sierra Palmera | Boardwalk, (−150, 5) |
| Truck | Marea Hauler | Boardwalk, (−138, 5) |
| Motorcycle | Lucero Swift | Boardwalk, (−128, 5) |
| Boat | Bahia Skimmer | West docks, (−216, ±60) |
| Helicopter | Cielo Kestrel | Airfield helipad, (180, −180) |

Vehicles differ in speed, grip, steering, and durability. The HUD shows speed, condition, and nitro. Slow down and move near clear, dry ground before exiting. Boats stay on water. Hold Space with W to lift the helicopter; release Space to descend.

Thirty Tide Coins can be collected by passing close to their minimap positions. The running side activity system is accessible from the console through `tidebreak.sideContent`: street races follow ordered checkpoints and save the best time; taxi fares track pickup, distance, and drop-off; delivery runs track pickup and destination; stunt jumps track airtime. The garage API supports purchasing, selling, repainting, and engine, armor, and nitro upgrades using its own balance.

## Combat and pursuit

| Key | Weapon | Starting ammo |
| --- | --- | ---: |
| 1 | Beacon Nine pistol | 96 |
| 2 | Breakwater Scatter shotgun | 32 |
| 3 | Saltline Repeater rifle | 150 |

Left click fires the selected weapon. The weapon panel highlights the current slot and shows remaining ammo. Shots use hitscan against mission rivals, with aim assistance near the view direction. The effects pool renders muzzle flashes, hit and crash sparks, and exhaust from damaged or fast vehicles. Damage, shots, and collisions add a short camera shake.

Wanted heat ranges from 0 to 10. Shooting and carjacking add 1; a reported speeding incident adds 0.5. Displayed stars round heat up and cap at five. Pursuit sends up to four cruisers, and a helicopter searchlight appears at four stars. Cruisers can damage a driven vehicle at close range.

## Radio, HUD, and menus

| Station | Track |
| --- | --- |
| Salt FM | Apricot Breakwater |
| Palmera Soul | Windows of Honey |
| Harbor Static | Paper Boats at Four |
| Neon Tide | Violet Current Relay |

The four tracks, ambience, engine, siren, gunshot, and interface sounds are synthesized locally with Web Audio. The ticker displays the current station and track. The HUD shows district and coordinates, health and armor, cash and respect, rank, wanted stars, objectives, vehicle telemetry, and a 208 × 208 minimap with mission, garage, coin, police, and objective markers.

The phone opens the full map, Missions, Stats, Radio, and Character tabs. Pause offers Resume, Settings, and Save & Quit to Title. Settings cover master volume, mouse sensitivity, quality, and control reset. Low/medium/high cap particles at 150/350/600 and set pixel ratio limits; low disables shadows and halves camera shake.

| Default control | Action |
| --- | --- |
| W / A / S / D | Move or drive |
| Shift | Sprint or nitro |
| Space | Jump or handbrake; with W, lift the helicopter |
| E | Interact, enter or exit a vehicle, or vault |
| Q | Horn |
| Mouse drag / wheel | Orbit / adjust camera pitch |
| Left click | Fire |
| 1 / 2 / 3 | Select pistol / shotgun / rifle |
| H | Open the Field Guide; click a binding to remap |
| R | Toggle rain |
| N | Switch between day and night |
| P | Open or close phone |
| Esc | Pause or resume |
| C | Tune to the next station |

## Local saves and runtime

The versioned browser save stores campaign progress, cash, respect, rank, character, and weather and time settings. The active mission, if any, restarts at its first objective on Continue. Mission start, mission completion, coin pickup, and Save & Quit write progress. Garage transactions, coin collection, best race time, and display/audio settings also have separate local records. Control remapping is for the current session. Play continues when storage is blocked or save data is invalid.

The game runs from static files in `game/` and uses locally vendored Three.js r187 and WebGL2. The world and signs are generated locally. No external audio or images are needed.

## Five-minute sampler

1. **First minute:** Choose New Game. On the Boardwalk, move, sprint, jump, vault the nearby barrier, and drag to look. Press H to inspect or remap keys. Try R, N, and the HUD time and cycle controls.
2. **Second minute:** Press E at the nearby gold marker around (−180, 0) for Salt Letter. Follow the HUD and minimap to Old Town. Press P to browse missions, inspect stats, switch characters, and tune all four stations with C or the Radio tab.
3. **Third minute:** Try the parked road vehicles along Z = 5 and open the phone map for the docks and Airfield. For a water or air route, swim toward a west dock or drive to the helipad. Use E near a boat or helicopter. Select the three weapons with 1–3. Fire several rounds to bring out cruisers and reach the four-star searchlight; to try a rival encounter directly, use `tidebreak.missions.start('broken-signal')` and head to its target.
4. **Fourth minute:** Follow a coin blip or use `tidebreak.sideContent.getState()` to find the nearest one. In the browser console, pass nearby `{x,z}` points to `tidebreak.sideContent.start('street-race', {checkpoints: [...]})`, or use `'taxi-fare'` or `'delivery-run'` with `{pickup, destination}`. Start `'stunt-jump'` to inspect its airtime state, and use `tidebreak.garage.buy('sedan')` to inspect a garage purchase. These API activities have no dedicated start buttons.
5. **Fifth minute:** Press Esc, try the quality, volume, and sensitivity settings, then Save & Quit and choose Continue to check that progress carries over. Use `tidebreak.missions.list()` to find any mission ID and `tidebreak.missions.start(id)` to sample it directly; the five-minute tour is for reaching systems, not completing the campaign.
