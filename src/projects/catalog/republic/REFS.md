# Republic — references

## Status

Reference image files are NOT committed to `refs/` in this worktree —
the sandboxed agent environment can fetch text via WebFetch but cannot
download binary PNG/JPG files. Each reference below is documented by
its Wikimedia Commons URL; a human or a subagent with image-download
access can mirror them into `refs/` later without changing proportions.

## Refs

| # | Filename (intended) | Source URL | What it shows | Notes |
|---|---|---|---|---|
| 1 | `refs/propylaea.jpg` | https://upload.wikimedia.org/wikipedia/commons/1/1c/The_Doric_columns_of_the_Propylaea_of_Athens_on_March_5%2C_2020.jpg | Full standing Doric columns at the Propylaea, Athens — primary silhouette reference. | 6000×4000. Public domain. Use for overall proportion + capital shape. |
| 2 | `refs/propylaea_inside.jpg` | https://upload.wikimedia.org/wikipedia/commons/0/0c/Doric_column_inside_the_Propylaea_Acropolis_Athens_Greece.jpg | Single Doric column, front, good shaft fluting detail. | 2853×4287. Shaft-close-up reference. |
| 3 | `refs/olimpia_palestra.jpg` | https://upload.wikimedia.org/wikipedia/commons/e/eb/02_2020_Grecia_photo_Paolo_Villa_FO199980_%28Olimpia_parco_archeologico_-_palestra_-_colonne_ordine_dorico_-_gym_-_doric_order_columns%29.jpg | Row of Doric columns at Olympia gymnasium. Shows base + flutes + entasis clearly. | 3264×4928. Use for base torus + plinth reference. |

## Colour swatches (documented, not sampled)

The references are weathered light marble, not bright white. Palette:

| Token | Hex | Reasoning |
|---|---|---|
| marble | `#e8e2d5` | Warm weathered white, from spec §6. |
| marbleShadow | `#b8aa90` | Ambient-occluded recesses, fluting interior. |
| accent (card) | `#c9b58a` | Warm sandstone — drives the UI chrome. |

## Canonical dimensions (from Doric order references)

Vitruvian Doric order ratios (Book IV of *De Architectura*):
- Shaft height ≈ 6–7× base diameter.
- Entasis: top radius ~0.85× bottom radius.
- Flutes: typically 20, each a shallow scalloped channel.
- Capital (abacus + echinus + necking): ~1× base diameter tall.
- Base/plinth: wider than the shaft by ~15%.

Spec §6 numbers adopted verbatim: total height ≈ 6.05×D ≈ 1.57m with
D=0.26m, which is tall enough to tower over the 1m humanoid without
being slow to render or physically unwieldy.
