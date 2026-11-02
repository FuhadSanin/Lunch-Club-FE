---
name: print-illustration
description: Draw a new illustration for Lunch Board in its monochrome print style (ink outlines, flat black/grey/white fills, hand-drawn wobble, white specks), as code in scripts/art/ rendered to transparent PNGs. Use whenever the user asks for an illustration, a drawing, a vector or a picture of people, food or objects for the site or app, or asks to turn a photo into an illustration.
---

# Print illustration

Lunch Board's illustrations look like worn letterpress prints: black ink outlines, flat fills in only
black, one grey and white, a slight hand-drawn wobble, and white specks inside every filled area. The
lunch line (`public/illustrations/lunch-line.png`), its thought bubbles (`public/illustrations/thoughts/`)
and the tiffin (`public/illustrations/tiffin.png`) are the reference set. A new drawing must sit next
to them without looking like a different artist made it.

There is no image generator here. Every illustration is drawn as SVG in code, rendered to PNG with the
installed Chrome, looked at, and corrected.

## The style, exactly

| Element | Rule |
| --- | --- |
| Colours | `INK #1d1d1d`, `GREY #8f8f8f`, `WHITE #ffffff`. Nothing else, no gradients, no hue. Dark mode inverts the PNG (`dark:invert`), so a hue would come out wrong. |
| Outlines | Every shape has an ink outline, width `SW = 3.2` at the scene's own scale. Round joins and caps. |
| Fills | Flat. Use black for the heaviest things (hair, trousers, lacquer), grey for the middle (skin of some people, cloth), white for the lightest. Each figure mixes all three. |
| Texture | The `print` filter in `scripts/art/style.mjs`: displacement 3.4 at baseFrequency 0.028 for the wobble, then white specks from baseFrequency 0.3 noise with alpha `14R − 9.35`. These numbers were tuned by eye; denser or finer specks read as TV static. Do not change them per drawing. |
| Details | Seams, creases, rims and highlights are thin white lines (1.6–2.6) on black, or ink lines on white or grey. Lacquer and gloss: a grey streak (width 8–9) with a white core (width 2). |
| Background | Transparent. No frame, no ground colour, no shadow. A single ink ground line is allowed under an object. |
| Faces | Simple and kind: closed-eye arc, small smile arc, nose as a bump on the profile, an ear outline. No pupils, no blush, no detailed features. |

## Drawing people

People face right, side or three-quarter view, feet at `y = 0` and up negative, so a figure is
`g(x, groundY, body)`. Use the proportions the lunch line uses, so new people match its crowd:

- Head: face path from `y −574` (crown) to `−488` (chin), about 60 wide, nose tip at `x 42, y −521`.
  `face(skin, eye, mouth)` in `lunch-line.mjs` draws it; hair goes on top as its own shape.
- Neck `−494` to `−460`, shoulders about `−462`, waist `−320`, ankles `−28`, shoes to `0`.
- Draw in this order: anything behind (hood, ponytail), back leg, front leg, shoes, neck, torso,
  face, hair, collar and front details, arms, props. Arms come last so they sit in front.
- Each person is someone different: vary skin (white or grey), hair (crop, curls, bun, braid, bob,
  ponytail, headscarf, cap), clothes (hoodie, kurta, pinstripe shirt, turtleneck, tunic, T-shirt, vest,
  blazer) and pose (phone, hand on chin, mug, laptop, pockets, pointing, reaching). A crowd of clones
  is the commonest failure.
- Never label a drawn figure with a real person's name: a drawing cannot be matched to a real person
  fairly. Label what they think of, hold or do instead.

## Drawing food and objects

- Food sits in a simple vessel drawn side-on with a visible rim ellipse: bowl, plate, glass, paper
  wrap. The dish itself is a few shapes with a recognisable silhouette (drumstick with a white bone,
  bun with sesame ellipses, noodles as wavy lines, rice as small dashes). See `DISHES` in
  `lunch-line.mjs` for thali, biryani, burrito, bowl, salad, wrap, burger, ramen, drink and chicken.
- Objects follow their real silhouette and proportions; when the user supplies a photo, trace its
  structure (tiers, handle, lid) and translate the material into the three fills. See `tiffin.mjs`.
- Thought bubbles: `cloudPath()` in `lunch-line.mjs` (11 bumps), white fill, ink outline; trailing
  circles shrink towards the thinker.
- Tie objects to the product where it is honest: the order ticket on the tiffin, a phone with a list.

## How to make one

1. Read the brief and say in one line what the picture shows and how it carries Lunch Board's idea
   (many tastes, one order). If the user gave a reference image, use its style and composition ideas,
   never trace or copy someone else's artwork.
2. Create `scripts/art/<name>.mjs`. Import the helpers from `./style.mjs`
   (`p`, `ln`, `c`, `e`, `g`, `bone`, `clipped`, `svgDoc`, `writeSvg`, `rasterise`) and build the
   scene from functions, one per person or object. Export the scene size and any positions the page
   needs (as `lunch-line.mjs` exports `XS` and `TIERS`).
3. Render: `node scripts/art/<name>.mjs --png`. This writes `scripts/art/out/<name>.svg` and a
   transparent greyscale PNG in `public/illustrations/` at 1.5–2× the size it is shown. Add the
   command to the `art` script in `package.json`.
4. Look at the PNG with the Read tool. Check it against this list, fix, render again. Two or three
   rounds is normal:
   - Does every part read at the size it will be shown? (Zoom out: bubbles and props are small.)
   - Does anything cover a face, or touch something it should not (an arm across a head, a lid
     overlapping a post)?
   - Are the specks sparse and chunky, the same as the reference set?
   - Is every figure distinct, and is any arm stick-thin or any shape lumpy by accident?
5. Put it on the page as `<img>` with `dark:invert` (and `select-none`, real `width`/`height`, a
   descriptive `alt`). Do not use blend modes: the PNG is transparent. Interactive parts (a bubble
   that names its dish) are separate PNGs positioned in percentages of the scene, wrapped in shadcn
   components (`Tooltip`), and animated with `motion` (pop in, gentle float, respect reduced motion).
6. Check the page in light and dark mode in a real browser screenshot before reporting.

## Don't

- Don't add colour, gradients, drop shadows or a background box.
- Don't use emoji anywhere in the art or around it.
- Don't put real names on figures.
- Don't ship a photo and an illustration of the same thing side by side; the illustration replaces it.
- Don't edit the PNGs by hand. Change the script and render again, so the source stays the truth.
