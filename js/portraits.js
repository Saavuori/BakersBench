/* Baker's Bench — product portraits
 *
 * A drawn picture of the finished bake, one per recipe.
 *
 * These are deliberately NOT the same drawing as the pan diagram. The pan
 * diagram is a technical layout — flat, schematic, ember-on-steel, built to be
 * read for geometry. This is the opposite: a portrait of the loaf itself, in
 * real bread colours that stay put whatever the page theme does. A photograph
 * would not change hue when you flip to dark mode, and neither does this.
 *
 * Realism comes from three things, in order of how much they buy:
 *   1. feTurbulence + feDisplacementMap warping the silhouette, so no edge is
 *      ever a clean mathematical curve — that alone kills the "vector clipart"
 *      read more than any amount of detail work.
 *   2. A mottled noise layer multiplied over the crust for oven colour variance.
 *   3. Shape-specific truth: ears on a score, blisters on a baguette, seeds
 *      sitting ON the dome rather than floating, oil pooling in focaccia dimples.
 */

const Portraits = (() => {

  const VB = { w: 420, h: 250 };

  /* Deterministic scatter — same seeds land in the same place every render. */
  function rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  /* Scatter n marks over an ellipse, biased toward the lit upper face. */
  function scatter(n, cx, cy, rx, ry, seed, draw) {
    const r = rng(seed);
    let out = '';
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r());
      const x = cx + Math.cos(a) * rx * d;
      const y = cy + Math.sin(a) * ry * d * 0.92 - d * 3;
      out += draw(x, y, r(), i);
    }
    return out;
  }

  /* ── Shared paint ─────────────────────────────────────────────────── */

  const DEFS = `
  <defs>
    <linearGradient id="pt-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--panel-3)"/>
      <stop offset="100%" stop-color="var(--panel-2)"/>
    </linearGradient>
    <radialGradient id="pt-shadow" cx="50%" cy="50%">
      <stop offset="0%" stop-color="#1A0E05" stop-opacity=".42"/>
      <stop offset="70%" stop-color="#1A0E05" stop-opacity=".12"/>
      <stop offset="100%" stop-color="#1A0E05" stop-opacity="0"/>
    </radialGradient>

    <!-- crusts -->
    <radialGradient id="pt-crust" cx="36%" cy="24%" r="86%">
      <stop offset="0%"   stop-color="#E0A860"/>
      <stop offset="42%"  stop-color="#BE7C35"/>
      <stop offset="78%"  stop-color="#93551F"/>
      <stop offset="100%" stop-color="#6B3A14"/>
    </radialGradient>
    <radialGradient id="pt-crust-dark" cx="36%" cy="24%" r="86%">
      <stop offset="0%"   stop-color="#A97741"/>
      <stop offset="45%"  stop-color="#7E4C22"/>
      <stop offset="100%" stop-color="#4A2810"/>
    </radialGradient>
    <radialGradient id="pt-crust-soft" cx="34%" cy="22%" r="84%">
      <stop offset="0%"   stop-color="#F3D49C"/>
      <stop offset="48%"  stop-color="#DDA457"/>
      <stop offset="100%" stop-color="#A5661F"/>
    </radialGradient>
    <radialGradient id="pt-crust-pale" cx="34%" cy="22%" r="84%">
      <stop offset="0%"   stop-color="#F6E3BE"/>
      <stop offset="55%"  stop-color="#E6C286"/>
      <stop offset="100%" stop-color="#B98942"/>
    </radialGradient>
    <linearGradient id="pt-crumb" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FBF3E0"/>
      <stop offset="100%" stop-color="#EBDCBB"/>
    </linearGradient>
    <linearGradient id="pt-gloss" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stop-color="#FFF6E2" stop-opacity=".72"/>
      <stop offset="55%" stop-color="#FFF6E2" stop-opacity="0"/>
    </linearGradient>

    <!-- 1. warp the silhouette so nothing reads as a perfect curve -->
    <filter id="pt-warp" x="-14%" y="-14%" width="128%" height="128%">
      <feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves="4" seed="9" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="7"
                         xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="pt-warp-fine" x="-14%" y="-14%" width="128%" height="128%">
      <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="3" seed="4" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="3.4"
                         xChannelSelector="R" yChannelSelector="G"/>
    </filter>

    <!-- 2. crust mottle, multiplied over the body -->
    <filter id="pt-mottle" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.11 0.16" numOctaves="4" seed="21"/>
      <feColorMatrix type="matrix"
        values="0 0 0 0 0.30  0 0 0 0 0.16  0 0 0 0 0.05  0 0 0 0.55 0"/>
    </filter>
    <filter id="pt-flour" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.42" numOctaves="3" seed="6"/>
      <feColorMatrix type="matrix"
        values="0 0 0 0 1  0 0 0 0 0.98  0 0 0 0 0.92  0 0 0 0.7 -0.18"/>
    </filter>
    <filter id="pt-soft"><feGaussianBlur stdDeviation="7"/></filter>
    <filter id="pt-soft2"><feGaussianBlur stdDeviation="2.4"/></filter>
  </defs>`;

  const shadow = (cx, rx, ry = 15, cy = 222) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#pt-shadow)"/>`;

  /* Mottle + flour, clipped to whatever shape id you pass. */
  const skin = (clipId, { flour = 0, mottle = 0.5 } = {}) => `
    <g clip-path="url(#${clipId})">
      <rect x="0" y="0" width="${VB.w}" height="${VB.h}"
            filter="url(#pt-mottle)" opacity="${mottle}" style="mix-blend-mode:multiply"/>
      ${flour ? `<rect x="0" y="0" width="${VB.w}" height="${VB.h}"
            filter="url(#pt-flour)" opacity="${flour}"/>` : ''}
    </g>`;

  /* A score that has actually opened: dark cut, raised pale lip above it. */
  const score = (d, { w = 5, lip = 9, tone = '#F2DDB2', cut = '#4E2A0F', dy = -6 } = {}) => `
    <path d="${d}" fill="none" stroke="${cut}" stroke-width="${w}" stroke-linecap="round"
          transform="translate(0 ${-dy * 0.15})" opacity=".85"/>
    <path d="${d}" fill="none" stroke="${tone}" stroke-width="${lip}" stroke-linecap="round"
          transform="translate(0 ${dy})" opacity=".78" filter="url(#pt-soft2)"/>`;

  /* ── The breads ───────────────────────────────────────────────────── */

  const ART = {

    boule: () => `
      ${shadow(212, 132, 17)}
      <clipPath id="c-boule"><path d="M 82 206 C 74 128 128 58 212 58 C 296 58 350 128 342 206
        C 341 214 332 219 318 219 L 106 219 C 92 219 83 214 82 206 Z"/></clipPath>
      <path d="M 82 206 C 74 128 128 58 212 58 C 296 58 350 128 342 206
               C 341 214 332 219 318 219 L 106 219 C 92 219 83 214 82 206 Z"
            fill="url(#pt-crust)" filter="url(#pt-warp)"/>
      ${skin('c-boule', { flour: .34, mottle: .5 })}
      <g clip-path="url(#c-boule)">
        ${score('M 118 168 C 140 108 210 82 296 104', { w: 5.5, lip: 12, dy: -8 })}
        ${score('M 138 200 C 168 156 232 136 306 152', { w: 4, lip: 8, dy: -6, tone: '#E7CDA0' })}
        <ellipse cx="168" cy="96" rx="66" ry="34" fill="#FFF8EA" opacity=".2" filter="url(#pt-soft)"/>
      </g>`,

    /* Baked under a lid, so: taller and rounder than an open-oven boule, one
       deep slash that burst wide, and a glossy blistered crust from the steam. */
    'overnight-loaf': () => `
      ${shadow(210, 122, 15, 220)}
      <clipPath id="c-onl"><path d="M 92 200 C 82 118 132 52 210 52 C 288 52 338 118 328 200
        C 327 212 314 218 296 218 L 124 218 C 106 218 93 212 92 200 Z"/></clipPath>
      <path d="M 92 200 C 82 118 132 52 210 52 C 288 52 338 118 328 200
               C 327 212 314 218 296 218 L 124 218 C 106 218 93 212 92 200 Z"
            fill="url(#pt-crust)" filter="url(#pt-warp)"/>
      ${skin('c-onl', { flour: .16, mottle: .56 })}
      <g clip-path="url(#c-onl)">
        <!-- one slash, burst right open -->
        <path d="M 126 132 C 168 96 252 96 296 130" fill="none" stroke="#57300F"
              stroke-width="15" stroke-linecap="round" opacity=".9"/>
        <path d="M 126 126 C 168 90 252 90 296 124" fill="none" stroke="#F3DCAE"
              stroke-width="13" stroke-linecap="round" opacity=".8" filter="url(#pt-soft2)"/>
        <path d="M 130 116 C 170 84 250 84 292 114" fill="none" stroke="#C98037"
              stroke-width="7" stroke-linecap="round" opacity=".55"/>
        <!-- steam blisters -->
        ${scatter(34, 210, 150, 106, 62, 87, (x, y, t) =>
          `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(1.6 + t * 3.4).toFixed(1)}"
                    ry="${(1.2 + t * 2.4).toFixed(1)}" fill="#4A2510"
                    opacity="${(.14 + t * .3).toFixed(2)}"/>`)}
        <ellipse cx="164" cy="176" rx="60" ry="34" fill="#FFF3DC" opacity=".2" filter="url(#pt-soft)"/>
      </g>`,

    /* Wet dough, folded once and dropped in a pot — it never gets scored, so the
       top tears itself open where it likes and stays pale under the flour. */
    'jenny-no-knead': () => `
      ${shadow(210, 136, 16, 218)}
      <clipPath id="c-jnk"><path d="M 74 194 C 70 122 126 62 210 62 C 294 62 350 122 346 194
        C 345 208 328 216 302 216 L 118 216 C 92 216 75 208 74 194 Z"/></clipPath>
      <path d="M 74 194 C 70 122 126 62 210 62 C 294 62 350 122 346 194
               C 345 208 328 216 302 216 L 118 216 C 92 216 75 208 74 194 Z"
            fill="url(#pt-crust-pale)" filter="url(#pt-warp)"/>
      ${skin('c-jnk', { flour: .72, mottle: .34 })}
      <g clip-path="url(#c-jnk)">
        <!-- craquelure: it split on its own, so the lines wander and branch -->
        ${[['M 118 150 C 158 118 196 132 214 108 C 232 86 268 96 292 122', 5],
           ['M 132 182 C 172 158 204 172 232 152 C 258 134 292 148 312 166', 3.6],
           ['M 176 214 C 196 190 216 186 236 196', 2.8],
           ['M 214 108 C 222 138 208 158 190 176', 3]].map(([d, w]) => `
          <path d="${d}" fill="none" stroke="#9A6224" stroke-width="${w}"
                stroke-linecap="round" opacity=".62"/>
          <path d="${d}" fill="none" stroke="#FFF9EC" stroke-width="${w * 1.6}"
                stroke-linecap="round" opacity=".3"
                transform="translate(0 -${w * 1.3})" filter="url(#pt-soft2)"/>`).join('')}
        <rect x="0" y="0" width="${VB.w}" height="${VB.h}"
              filter="url(#pt-flour)" opacity=".5"/>
        <ellipse cx="164" cy="104" rx="66" ry="32" fill="#FFFDF6" opacity=".24" filter="url(#pt-soft)"/>
      </g>`,

    /* Deep-golden, high-domed, and burst around the equator where the crust set
       before the loaf had finished rising. */
    'emma-no-knead': () => `
      ${shadow(210, 128, 15, 218)}
      <clipPath id="c-enk"><path d="M 86 192 C 78 112 130 54 210 54 C 290 54 342 112 334 192
        C 333 206 318 215 296 215 L 124 215 C 102 215 87 206 86 192 Z"/></clipPath>
      <path d="M 86 192 C 78 112 130 54 210 54 C 290 54 342 112 334 192
               C 333 206 318 215 296 215 L 124 215 C 102 215 87 206 86 192 Z"
            fill="url(#pt-crust)" filter="url(#pt-warp)"/>
      ${skin('c-enk', { flour: .18, mottle: .58 })}
      <g clip-path="url(#c-enk)">
        <!-- the burst ring, brighter crumb showing through -->
        <path d="M 92 158 C 140 132 196 146 244 128 C 280 114 316 128 332 148"
              fill="none" stroke="#F7E0B0" stroke-width="14" stroke-linecap="round"
              opacity=".62" filter="url(#pt-soft2)"/>
        <path d="M 92 164 C 140 138 196 152 244 134 C 280 120 316 134 332 154"
              fill="none" stroke="#5A320F" stroke-width="5" stroke-linecap="round"
              opacity=".7"/>
        ${scatter(30, 210, 140, 108, 58, 123, (x, y, t) =>
          `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(1.8 + t * 3.6).toFixed(1)}"
                    ry="${(1.3 + t * 2.6).toFixed(1)}" fill="#4A2510"
                    opacity="${(.12 + t * .26).toFixed(2)}"/>`)}
        <ellipse cx="166" cy="98" rx="62" ry="30" fill="#FFF6E2" opacity=".24" filter="url(#pt-soft)"/>
      </g>`,

    'rye-batard': () => `
      ${shadow(210, 146, 15)}
      <clipPath id="c-bat"><ellipse cx="210" cy="150" rx="158" ry="72"/></clipPath>
      <ellipse cx="210" cy="150" rx="158" ry="72" fill="url(#pt-crust-dark)" filter="url(#pt-warp)"/>
      ${skin('c-bat', { flour: .42, mottle: .62 })}
      <g clip-path="url(#c-bat)">
        ${[0, 1, 2, 3].map(i => score(
          `M ${86 + i * 76} 176 L ${132 + i * 76} 116`,
          { w: 5, lip: 10, dy: -7, tone: '#E4C795', cut: '#3B1F0B' })).join('')}
        <ellipse cx="160" cy="108" rx="86" ry="30" fill="#FFF8EA" opacity=".16" filter="url(#pt-soft)"/>
      </g>`,

    baguette: () => `
      ${shadow(210, 178, 12, 200)}
      <clipPath id="c-bag"><path d="M 26 148 C 40 118 92 106 210 106 C 328 106 380 118 394 148
        C 380 178 328 190 210 190 C 92 190 40 178 26 148 Z"/></clipPath>
      <path d="M 26 148 C 40 118 92 106 210 106 C 328 106 380 118 394 148
               C 380 178 328 190 210 190 C 92 190 40 178 26 148 Z"
            fill="url(#pt-crust)" filter="url(#pt-warp-fine)"/>
      ${skin('c-bag', { flour: .12, mottle: .52 })}
      <g clip-path="url(#c-bag)">
        ${[0, 1, 2, 3, 4].map(i => score(
          `M ${52 + i * 72} 172 L ${104 + i * 72} 124`,
          { w: 6, lip: 12, dy: -7 })).join('')}
        ${scatter(48, 210, 146, 168, 34, 31, (x, y, t) =>
          `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(1.4 + t * 3).toFixed(1)}"
                    ry="${(1 + t * 2).toFixed(1)}" fill="#4A2510" opacity="${(.16 + t * .3).toFixed(2)}"/>`)}
        <ellipse cx="180" cy="122" rx="150" ry="14" fill="#FFF3DC" opacity=".26" filter="url(#pt-soft)"/>
      </g>`,

    /* A ciabatta is a flat floury slipper: irregular outline, ridged surface,
       and a real bloom of flour sitting on top of the crust rather than in it. */
    ciabatta: () => `
      ${shadow(206, 152, 13, 208)}
      <clipPath id="c-cia"><path d="M 52 118 C 70 92 118 84 172 88 C 232 92 300 80 344 96
        C 378 108 384 152 366 178 C 344 208 268 206 202 202 C 140 198 82 208 58 186
        C 38 168 38 138 52 118 Z"/></clipPath>
      <path d="M 52 118 C 70 92 118 84 172 88 C 232 92 300 80 344 96
               C 378 108 384 152 366 178 C 344 208 268 206 202 202 C 140 198 82 208 58 186
               C 38 168 38 138 52 118 Z"
            fill="url(#pt-crust-pale)" filter="url(#pt-warp)"/>
      ${skin('c-cia', { mottle: .5 })}
      <g clip-path="url(#c-cia)">
        <!-- a few irregular swells where the dough was stretched, not stripes -->
        ${[[112, -13, 9, 9], [148, 8, -11, 6], [186, -7, 12, 8]].map(([y, a, b, w]) =>
          `<path d="M 40 ${y} C 128 ${y + a} 250 ${y + b} 388 ${y + a * 0.4}"
                 fill="none" stroke="#A97434" stroke-width="${w}" opacity=".14"
                 filter="url(#pt-soft)"/>
           <path d="M 40 ${y - 6} C 128 ${y + a - 7} 250 ${y + b - 6} 388 ${y + a * 0.4 - 7}"
                 fill="none" stroke="#FFF6E0" stroke-width="${w - 3}" opacity=".2"
                 filter="url(#pt-soft)"/>`).join('')}
        <!-- flour sits ON the loaf, patchy, heaviest across the middle -->
        <g opacity=".85">
          <rect x="0" y="0" width="${VB.w}" height="${VB.h}" filter="url(#pt-flour)" opacity=".55"/>
          ${scatter(22, 206, 144, 150, 52, 77, (x, y, t) =>
            `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(14 + t * 26).toFixed(1)}"
                      ry="${(7 + t * 12).toFixed(1)}" fill="#FFFBF0"
                      opacity="${(.1 + t * .26).toFixed(2)}" filter="url(#pt-soft2)"/>`)}
        </g>
        <ellipse cx="170" cy="108" rx="110" ry="20" fill="#FFFCF2" opacity=".28" filter="url(#pt-soft)"/>
      </g>`,

    /* Proofed until the sides kiss, so each roll casts a soft shadow onto its
       neighbour and the whole thing reads as one pull-apart sheet. */
    'dinner-rolls': () => {
      const roll = (cx, cy, r, i) => `
        <ellipse cx="${cx}" cy="${cy + r * .1}" rx="${r * 1.02}" ry="${r * .88}"
                 fill="#7A4A18" opacity=".45" filter="url(#pt-soft2)"/>
        <clipPath id="c-dr${i}"><ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * .84}"/></clipPath>
        <ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * .84}"
                 fill="url(#pt-crust-soft)" filter="url(#pt-warp-fine)"/>
        ${skin(`c-dr${i}`, { mottle: .44 })}
        <g clip-path="url(#c-dr${i})">
          <ellipse cx="${cx}" cy="${cy + r * .72}" rx="${r * .95}" ry="${r * .34}"
                   fill="#95601F" opacity=".5" filter="url(#pt-soft2)"/>
          <ellipse cx="${cx - r * .26}" cy="${cy - r * .36}" rx="${r * .5}" ry="${r * .28}"
                   fill="#FFF7E6" opacity=".55" filter="url(#pt-soft2)"/>
          <ellipse cx="${cx - r * .34}" cy="${cy - r * .44}" rx="${r * .2}" ry="${r * .1}"
                   fill="#FFFDF6" opacity=".6" filter="url(#pt-soft2)"/>
        </g>`;
      return `
      ${shadow(210, 154, 15, 216)}
      ${roll(122, 162, 62, 0)}${roll(296, 162, 62, 1)}
      ${roll(210, 130, 68, 2)}`;
    },

    'burger-buns': () => `
      ${shadow(210, 118, 14, 214)}
      <ellipse cx="210" cy="196" rx="104" ry="22" fill="#C89551"/>
      <clipPath id="c-bb"><ellipse cx="210" cy="146" rx="112" ry="72"/></clipPath>
      <ellipse cx="210" cy="146" rx="112" ry="72" fill="url(#pt-crust-soft)" filter="url(#pt-warp-fine)"/>
      ${skin('c-bb', { mottle: .34 })}
      <g clip-path="url(#c-bb)">
        <ellipse cx="176" cy="106" rx="72" ry="34" fill="#FFF6E4" opacity=".44" filter="url(#pt-soft)"/>
        ${scatter(54, 210, 140, 98, 56, 55, (x, y, t) => `
          <ellipse cx="${x.toFixed(1)}" cy="${(y + 1.2).toFixed(1)}" rx="4.6" ry="2.8"
                   fill="#8A5A22" opacity=".35"
                   transform="rotate(${(t * 160 - 80).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>
          <ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="4.4" ry="2.6" fill="#F5E3B8"
                   transform="rotate(${(t * 160 - 80).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>
          <ellipse cx="${(x - .8).toFixed(1)}" cy="${(y - .7).toFixed(1)}" rx="2" ry="1.1"
                   fill="#FFFBEE" opacity=".8"
                   transform="rotate(${(t * 160 - 80).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`)}
      </g>`,

    pizza: () => `
      ${shadow(210, 140, 14, 214)}
      <clipPath id="c-pz"><ellipse cx="210" cy="140" rx="146" ry="92"/></clipPath>
      <ellipse cx="210" cy="140" rx="146" ry="92" fill="url(#pt-crust-soft)" filter="url(#pt-warp)"/>
      ${skin('c-pz', { flour: .1, mottle: .4 })}
      <g clip-path="url(#c-pz)">
        <!-- leopard-spotted cornicione -->
        ${scatter(40, 210, 140, 142, 88, 17, (x, y, t) => {
          const d = Math.hypot((x - 210) / 142, (y - 140) / 88);
          return d > .74 ? `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}"
            rx="${(3 + t * 6).toFixed(1)}" ry="${(2.4 + t * 4).toFixed(1)}"
            fill="#3E1F0A" opacity="${(.3 + t * .45).toFixed(2)}"/>` : '';
        })}
        <ellipse cx="210" cy="140" rx="112" ry="68" fill="#B3311C"/>
        <ellipse cx="210" cy="140" rx="112" ry="68" fill="#8E2313" opacity=".35"
                 filter="url(#pt-warp-fine)"/>
        ${scatter(13, 210, 140, 92, 54, 29, (x, y, t) => `
          <ellipse cx="${x.toFixed(1)}" cy="${(y + 2).toFixed(1)}" rx="${(15 + t * 9).toFixed(1)}"
                   ry="${(10 + t * 6).toFixed(1)}" fill="#C79A4A" opacity=".5"/>
          <ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(14 + t * 8).toFixed(1)}"
                   ry="${(9 + t * 5).toFixed(1)}" fill="#FBF0D6" filter="url(#pt-warp-fine)"/>
          <ellipse cx="${(x - 3).toFixed(1)}" cy="${(y - 3).toFixed(1)}" rx="${(5 + t * 3).toFixed(1)}"
                   ry="${(3 + t * 2).toFixed(1)}" fill="#FFFDF6" opacity=".55"/>`)}
        ${scatter(7, 210, 140, 84, 48, 71, (x, y, t) => `
          <path d="M ${x.toFixed(1)} ${y.toFixed(1)}
                   c -9 -8 -9 -17 0 -20 c 9 3 9 12 0 20 Z"
                fill="#2F5A24" opacity=".92"
                transform="rotate(${(t * 300).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`)}
      </g>`
  };

  /* Each bread is drawn in the same 420×250 space, then cropped to its own
     bounds so it fills the frame instead of floating in whitespace. */
  const BOX = {
    boule: '62 44 296 194',
    'overnight-loaf': '72 38 276 200',
    'jenny-no-knead': '56 48 308 186',
    'emma-no-knead': '68 40 284 194',
    'rye-batard': '40 66 340 178',
    baguette: '18 92 384 128',
    ciabatta: '32 76 356 148',
    'dinner-rolls': '52 54 316 188',
    'burger-buns': '86 66 248 168',
    pizza: '56 40 308 200'
  };

  function render(recipeId) {
    const art = ART[recipeId];
    if (!art) return '';
    const box = BOX[recipeId] || `0 0 ${VB.w} ${VB.h}`;
    return `<svg viewBox="${box}" role="img" class="portrait-svg"
                 preserveAspectRatio="xMidYMid meet">${DEFS}${art()}</svg>`;
  }

  return { render, has: id => !!ART[id] };
})();
