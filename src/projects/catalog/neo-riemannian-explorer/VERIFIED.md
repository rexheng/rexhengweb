# Neo-Riemannian Explorer — silhouette check

| Feature | Target | Delivered by |
|---|---|---|
| Octave width | 7 white keys flush, ~1.76×D wide | `WHITE_KEYS=7 * whiteKeyWidth=0.25*D` + 6·gap ≈ 1.78*D |
| White-key aspect | Wider at base than tall, long depth | whiteKeyWidth=0.25*D, whiteKeyHeight=0.14*D, whiteKeyDepth=0.58*D — reads as piano key in three-quarter view |
| Black keys | 5 keys in 2-3 cluster, proud of white surface, set back from front edge | BLACK_KEY_OFFSETS positions them at C#/D#/F#/G#/A#; blackKeyHeight=0.20*D vs whiteKeyHeight=0.14*D makes them stand ~0.06*D proud; blackKeyZOffset=0.10*D sets them back |
| Frame | Dark wooden base visible behind and under keys | baseWidth slightly wider than the octave; baseDepth 0.70*D vs whiteKeyDepth 0.58*D leaves a back-lip visible; wood material `#2b1f16` |
| Brand accent | Small purple plate at the back | logoPlate material uses `#8a6bbf` with emissive intensity 0.35 — just barely glows so it reads in dim lighting without dominating |

No ability — the project is a music-theory web app, no sensible physics
gag. `ability: null` is valid per the validator.
