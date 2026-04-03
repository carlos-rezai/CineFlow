# Design System Document: The Cinematic Editorial

## 1. Overview & Creative North Star

### Creative North Star: "The Digital Curator"

This design system is engineered to transform a standard movie collection app into a high-end, editorial experience. We are moving away from the "utility-first" look of standard databases to the "atmosphere-first" world of premium cinema. The goal is to make the user feel like they are browsing a private vault or a curated gallery, similar to the Criterion Channel or high-end physical media collections.

The system breaks the traditional template look through **intentional asymmetry**, **tonal depth**, and **cinematic scale**. We emphasize high-contrast typography and large, immersive imagery, allowing the movie posters to act as the primary structural elements of the layout.

---

## 2. Colors

The palette is rooted in deep blacks and charcoal greys to simulate the "lights-out" theater experience, with a vibrant "Electric Cyan" primary accent that mimics the glow of a projector.

### Core Tokens

- **Background/Surface:** `#131313` (The void)
- **Primary (Accent):** `#a8e8ff` (The glow)
- **Secondary (Muted):** `#bbc8d0` (Soft metal)
- **Tertiary (Warmth):** `#ffd9a1` (Amber/Film light)

### The "No-Line" Rule

**Explicit Instruction:** Do not use 1px solid borders to section off the UI. In this system, boundaries are defined exclusively through background color shifts or tonal transitions.

- Use `surface-container-low` (`#1c1b1b`) to define a section against the main `surface`.
- Use `surface-container-high` (`#2a2a2a`) for interactive elements.
- Lines feel like a wireframe; tonal shifts feel like architecture.

### Surface Hierarchy & Nesting

Treat the UI as a series of physical layers—like stacked sheets of tinted glass.

1. **Base Layer:** `surface` (`#131313`)
2. **Sectional Layer:** `surface-container-low` (`#1c1b1b`)
3. **Card/Element Layer:** `surface-container-highest` (`#353534`)
4. **Floating/Glass Layer:** Use `surface_variant` at 60% opacity with a `20px` backdrop-blur.

### Signature Textures

Main CTAs and hero backgrounds should utilize subtle gradients rather than flat fills. Transition from `primary` (`#a8e8ff`) to `primary_container` (`#00d4ff`) to give buttons a "lit from within" quality.

---

## 3. Typography

The system utilizes a dual-font strategy to balance cinematic drama with modern legibility.

- **Display & Headlines (Manrope):** Chosen for its geometric precision and modern "editorial" feel. Use `display-lg` (3.5rem) for hero movie titles to create a sense of scale.
- **Body & Labels (Inter):** The workhorse for metadata. Inter provides high legibility at small sizes, crucial for "Cast," "Director," and "Synopsis" sections.

### Hierarchy Guidelines

- **High Contrast:** Use `display-md` for headers against `body-sm` for descriptions. The gap in scale creates a professional, intentional look.
- **Letter Spacing:** Increase letter-spacing on `label-md` and `label-sm` by 5-10% to give technical data (like "4K" or "164 MIN") a premium, tracked-out feel.

---

## 4. Elevation & Depth

We reject the "drop shadow" defaults. Hierarchy is achieved through **Tonal Layering**.

- **The Layering Principle:** Place a `surface-container-lowest` (`#0e0e0e`) card on a `surface-container-low` section to create a soft, "inset" feel.
- **Ambient Shadows:** For floating elements (Modals, Overlays), use an extra-diffused shadow.
  - _Specs:_ `Y: 20px, Blur: 40px, Opacity: 8%`.
  - _Color:_ Use a tinted version of `on-surface` rather than pure black to simulate light bouncing off the UI.
- **The "Ghost Border" Fallback:** If a container requires more definition (e.g., a search bar), use the `outline-variant` (`#3c494e`) at **15% opacity**. This creates a suggestion of an edge without breaking the dark aesthetic.
- **Glassmorphism:** Use for persistent navigation or quick-action overlays. Combine a semi-transparent `surface` with a heavy blur to let the vibrant movie poster colors bleed through the UI, making the experience feel integrated.

---

## 5. Components

### Cards (The "Poster-First" Approach)

- **Style:** No borders. `XL` rounded corners (`0.75rem`).
- **Treatment:** Posters should have a subtle inner glow (1px inner stroke, 10% opacity white) to catch the "light."
- **Info:** Text should sit _under_ the card or on a glassmorphic overlay on the bottom 20% of the poster.

### Buttons

- **Primary:** Gradient fill (`primary` to `primary_container`). `MD` roundedness. No border.
- **Secondary:** Ghost style. Use the "Ghost Border" (outline-variant at 20%) with `on_surface` text.
- **Tertiary:** Pure text with `title-sm` styling, using the `primary` color.

### Chips (Genre & Mood Filters)

- **Unselected:** `surface-container-highest` background, no border.
- **Selected:** `primary` background with `on-primary` text.
- **Shape:** `Full` roundedness (9999px) for a soft, pill-like feel.

### Input Fields

- **Treatment:** Instead of a box, use a `surface-container-low` fill with a bottom-only "Ghost Border." This mimics high-end stationery or boutique digital interfaces.

### Navigation (Bottom Bar)

- **Treatment:** 80% opacity `surface` with a `backdrop-filter: blur(12px)`. This keeps the "cinematic" posters visible as they scroll behind the navigation.

---

## 6. Do's and Don'ts

### Do:

- **Do** use asymmetrical margins. A larger left margin for a header can make a page feel like a magazine spread.
- **Do** use `tertiary` (Gold/Amber) for "Rating" or "Award" highlights to signify prestige.
- **Do** prioritize whitespace. In a dark UI, space is what provides the "premium" feel.

### Don't:

- **Don't** use pure `#000000` for anything other than the deepest shadows. Use `surface` (`#131313`) to maintain depth.
- **Don't** use standard dividers. If you must separate list items, use a 12px vertical gap or a subtle change in surface tone.
- **Don't** use high-contrast white text for body copy. Use `on_surface_variant` (`#bbc9cf`) to reduce eye strain and maintain the cinematic mood.
