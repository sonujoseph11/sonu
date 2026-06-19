/**
 * MilitaryMap.tsx — Production-Grade Framer Component
 *
 * Interactive animated 3D globe (orthographic SVG sphere).
 * Real geographic data (Natural Earth 110m). Drag to rotate, auto-spins when idle.
 * Zero external dependencies — pure SVG + sphere math.
 *
 * @framerDisableUnlink
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 700
 * @framerIntrinsicHeight 500
 */

import * as React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

/* ========================================================================== */
/* Types */
/* ========================================================================== */

interface MarkerItem {
    label: string
    description: string
    latitude: number
    longitude: number
    color: string
}

interface CountryItem {
    code: string
    name: string
    enabled: boolean
}

interface MapStyleConfig {
    oceanColor: string
    landFill: string
    landStroke: string
    strokeWidth: number
    hoverColor: string
    disabledColor: string
}

interface TooltipConfig {
    show: boolean
    background: string
    textColor: string
    borderColor: string
}

interface GridConfig {
    show: boolean
    color: string
    opacity: number
}

interface LayoutConfig {
    cornerRadius: number
    padding: number
    showBorder: boolean
    borderColor: string
}

interface InteractionConfig {
    autoRotate: boolean
    autoRotateSpeed: number
    rotateX: number
    rotateY: number
    rotateZ: number
    enableDrag: boolean
    dragSensitivity: number
    glowColor: string
    glowIntensity: number
    showStars: boolean
    showLabels: boolean
}

interface Props {
    markers: MarkerItem[]
    countries: CountryItem[]
    mapStyle: MapStyleConfig
    tooltip: TooltipConfig
    grid: GridConfig
    layout: LayoutConfig
    interaction: InteractionConfig
}

interface HoveredMarker {
    screenX: number
    screenY: number
    label: string
    description: string
}

interface HoveredCountry {
    screenX: number
    screenY: number
    name: string
    code: string
}

interface ProjectedPoint {
    sx: number // screen x
    sy: number // screen y
    rx: number // rotated 3D x (depth)
    ry: number // rotated 3D y
    rz: number // rotated 3D z
    v: boolean // visible (depth >= 0)
}

interface CountryEntry {
    id: string
    name: string
    type: string
    coords: any
    rings: number[][][] // flat list of rings for hit-testing
    bbox: { minLng: number; maxLng: number; minLat: number; maxLat: number }
}

/* ========================================================================== */
/* Country Data — ISO numeric → [ISO3, name] */
/* ========================================================================== */

const CD: Record<string, [string, string]> = {
    "004": ["AFG", "Afghanistan"],
    "008": ["ALB", "Albania"],
    "012": ["DZA", "Algeria"],
    "024": ["AGO", "Angola"],
    "032": ["ARG", "Argentina"],
    "036": ["AUS", "Australia"],
    "040": ["AUT", "Austria"],
    "031": ["AZE", "Azerbaijan"],
    "050": ["BGD", "Bangladesh"],
    "056": ["BEL", "Belgium"],
    "204": ["BEN", "Benin"],
    "064": ["BTN", "Bhutan"],
    "068": ["BOL", "Bolivia"],
    "070": ["BIH", "Bosnia and Herz."],
    "072": ["BWA", "Botswana"],
    "076": ["BRA", "Brazil"],
    "096": ["BRN", "Brunei"],
    "100": ["BGR", "Bulgaria"],
    "854": ["BFA", "Burkina Faso"],
    "108": ["BDI", "Burundi"],
    "116": ["KHM", "Cambodia"],
    "120": ["CMR", "Cameroon"],
    "124": ["CAN", "Canada"],
    "140": ["CAF", "Central African Rep."],
    "148": ["TCD", "Chad"],
    "152": ["CHL", "Chile"],
    "156": ["CHN", "China"],
    "170": ["COL", "Colombia"],
    "178": ["COG", "Congo"],
    "180": ["COD", "Dem. Rep. Congo"],
    "188": ["CRI", "Costa Rica"],
    "384": ["CIV", "Côte d'Ivoire"],
    "191": ["HRV", "Croatia"],
    "192": ["CUB", "Cuba"],
    "196": ["CYP", "Cyprus"],
    "203": ["CZE", "Czechia"],
    "208": ["DNK", "Denmark"],
    "262": ["DJI", "Djibouti"],
    "214": ["DOM", "Dominican Rep."],
    "218": ["ECU", "Ecuador"],
    "818": ["EGY", "Egypt"],
    "222": ["SLV", "El Salvador"],
    "226": ["GNQ", "Eq. Guinea"],
    "232": ["ERI", "Eritrea"],
    "233": ["EST", "Estonia"],
    "748": ["SWZ", "Eswatini"],
    "231": ["ETH", "Ethiopia"],
    "242": ["FJI", "Fiji"],
    "246": ["FIN", "Finland"],
    "250": ["FRA", "France"],
    "266": ["GAB", "Gabon"],
    "270": ["GMB", "Gambia"],
    "268": ["GEO", "Georgia"],
    "276": ["DEU", "Germany"],
    "288": ["GHA", "Ghana"],
    "300": ["GRC", "Greece"],
    "304": ["GRL", "Greenland"],
    "320": ["GTM", "Guatemala"],
    "324": ["GIN", "Guinea"],
    "624": ["GNB", "Guinea-Bissau"],
    "328": ["GUY", "Guyana"],
    "332": ["HTI", "Haiti"],
    "340": ["HND", "Honduras"],
    "348": ["HUN", "Hungary"],
    "352": ["ISL", "Iceland"],
    "356": ["IND", "India"],
    "360": ["IDN", "Indonesia"],
    "364": ["IRN", "Iran"],
    "368": ["IRQ", "Iraq"],
    "372": ["IRL", "Ireland"],
    "376": ["ISR", "Israel"],
    "380": ["ITA", "Italy"],
    "388": ["JAM", "Jamaica"],
    "392": ["JPN", "Japan"],
    "400": ["JOR", "Jordan"],
    "398": ["KAZ", "Kazakhstan"],
    "404": ["KEN", "Kenya"],
    "408": ["PRK", "North Korea"],
    "410": ["KOR", "South Korea"],
    "414": ["KWT", "Kuwait"],
    "417": ["KGZ", "Kyrgyzstan"],
    "418": ["LAO", "Laos"],
    "428": ["LVA", "Latvia"],
    "422": ["LBN", "Lebanon"],
    "426": ["LSO", "Lesotho"],
    "430": ["LBR", "Liberia"],
    "434": ["LBY", "Libya"],
    "440": ["LTU", "Lithuania"],
    "442": ["LUX", "Luxembourg"],
    "450": ["MDG", "Madagascar"],
    "454": ["MWI", "Malawi"],
    "458": ["MYS", "Malaysia"],
    "466": ["MLI", "Mali"],
    "478": ["MRT", "Mauritania"],
    "484": ["MEX", "Mexico"],
    "498": ["MDA", "Moldova"],
    "496": ["MNG", "Mongolia"],
    "499": ["MNE", "Montenegro"],
    "504": ["MAR", "Morocco"],
    "508": ["MOZ", "Mozambique"],
    "104": ["MMR", "Myanmar"],
    "516": ["NAM", "Namibia"],
    "524": ["NPL", "Nepal"],
    "528": ["NLD", "Netherlands"],
    "554": ["NZL", "New Zealand"],
    "558": ["NIC", "Nicaragua"],
    "562": ["NER", "Niger"],
    "566": ["NGA", "Nigeria"],
    "578": ["NOR", "Norway"],
    "512": ["OMN", "Oman"],
    "586": ["PAK", "Pakistan"],
    "591": ["PAN", "Panama"],
    "598": ["PNG", "Papua New Guinea"],
    "600": ["PRY", "Paraguay"],
    "604": ["PER", "Peru"],
    "608": ["PHL", "Philippines"],
    "616": ["POL", "Poland"],
    "620": ["PRT", "Portugal"],
    "634": ["QAT", "Qatar"],
    "642": ["ROU", "Romania"],
    "643": ["RUS", "Russia"],
    "646": ["RWA", "Rwanda"],
    "682": ["SAU", "Saudi Arabia"],
    "686": ["SEN", "Senegal"],
    "688": ["SRB", "Serbia"],
    "694": ["SLE", "Sierra Leone"],
    "702": ["SGP", "Singapore"],
    "703": ["SVK", "Slovakia"],
    "705": ["SVN", "Slovenia"],
    "706": ["SOM", "Somalia"],
    "710": ["ZAF", "South Africa"],
    "728": ["SSD", "South Sudan"],
    "724": ["ESP", "Spain"],
    "144": ["LKA", "Sri Lanka"],
    "729": ["SDN", "Sudan"],
    "740": ["SUR", "Suriname"],
    "752": ["SWE", "Sweden"],
    "756": ["CHE", "Switzerland"],
    "760": ["SYR", "Syria"],
    "158": ["TWN", "Taiwan"],
    "762": ["TJK", "Tajikistan"],
    "834": ["TZA", "Tanzania"],
    "764": ["THA", "Thailand"],
    "626": ["TLS", "Timor-Leste"],
    "768": ["TGO", "Togo"],
    "780": ["TTO", "Trinidad and Tobago"],
    "788": ["TUN", "Tunisia"],
    "792": ["TUR", "Turkey"],
    "795": ["TKM", "Turkmenistan"],
    "800": ["UGA", "Uganda"],
    "804": ["UKR", "Ukraine"],
    "784": ["ARE", "UAE"],
    "826": ["GBR", "United Kingdom"],
    "840": ["USA", "United States"],
    "858": ["URY", "Uruguay"],
    "860": ["UZB", "Uzbekistan"],
    "862": ["VEN", "Venezuela"],
    "704": ["VNM", "Vietnam"],
    "887": ["YEM", "Yemen"],
    "894": ["ZMB", "Zambia"],
    "716": ["ZWE", "Zimbabwe"],
    "275": ["PSE", "Palestine"],
    "807": ["MKD", "North Macedonia"],
    "051": ["ARM", "Armenia"],
    "112": ["BLR", "Belarus"],
    "174": ["COM", "Comoros"],
    "084": ["BLZ", "Belize"],
    "090": ["SLB", "Solomon Islands"],
    "540": ["NCL", "New Caledonia"],
    "548": ["VUT", "Vanuatu"],
    "010": ["ATA", "Antarctica"],
    "-99": ["XKX", "Kosovo"],
}

const ENUM_CODES: string[] = []
const ENUM_TITLES: string[] = []
;(() => {
    const seen: Record<string, boolean> = {}
    const list: [string, string][] = []
    for (const k of Object.keys(CD)) {
        const [a3, nm] = CD[k]
        if (!seen[a3]) {
            seen[a3] = true
            list.push([a3, nm])
        }
    }
    list.sort((a, b) => a[0].localeCompare(b[0]))
    for (const [c, n] of list) {
        ENUM_CODES.push(c)
        ENUM_TITLES.push(c + " \u2014 " + n)
    }
})()

/* ========================================================================== */
/* 3D Sphere Math */
/* ========================================================================== */

const D2R = Math.PI / 180
const R2D = 180 / Math.PI

function clamp(v: number, lo: number, hi: number) {
    return v < lo ? lo : v > hi ? hi : v
}

/**
 * Project a (longitude, latitude) point onto the screen using orthographic
 * projection, with three independent rotations applied in order:
 *
 *   1. lambda — rotation around Z axis (polar/spin axis), pre-baked into (lng - lambda)
 *   2. phi    — rotation around Y axis (screen-right), tilts north pole toward camera
 *   3. gamma  — rotation around X axis (camera/depth axis), rolls the view
 *
 * Convention:
 *   Unrotated: (lng=0, lat=0) at (+X), north pole at (+Z), (lng=90,lat=0) at (+Y).
 *   After rotation: +X is depth toward viewer, +Y is screen-right, +Z is screen-up.
 *   Visible iff rotated-X >= 0.
 */
function project(
    lng: number,
    lat: number,
    lambda: number,
    phi: number,
    gamma: number,
    R: number,
    cx: number,
    cy: number
): ProjectedPoint {
    const lr = (lng - lambda) * D2R
    const la = lat * D2R
    const cl = Math.cos(la)
    // Unrotated unit-sphere position (post-Z-rotation by lambda)
    const x0 = cl * Math.cos(lr)
    const y0 = cl * Math.sin(lr)
    const z0 = Math.sin(la)
    // Rotate around Y by phi (tilts north pole forward)
    const cp = Math.cos(phi * D2R)
    const sp = Math.sin(phi * D2R)
    const x1 = x0 * cp + z0 * sp
    const y1 = y0
    const z1 = -x0 * sp + z0 * cp
    // Rotate around X by gamma (rolls around the viewer-facing axis)
    const cg = Math.cos(gamma * D2R)
    const sg = Math.sin(gamma * D2R)
    const rx = x1
    const ry = y1 * cg - z1 * sg
    const rz = y1 * sg + z1 * cg
    return {
        sx: cx + R * ry,
        sy: cy - R * rz,
        rx,
        ry,
        rz,
        v: rx >= 0,
    }
}

/**
 * Inverse projection: screen (px, py) → (lng, lat), or null if outside globe.
 */
function unproject(
    px: number,
    py: number,
    lambda: number,
    phi: number,
    gamma: number,
    R: number,
    cx: number,
    cy: number
): { lng: number; lat: number } | null {
    const Ry = (px - cx) / R
    const Rz = -(py - cy) / R
    const r2 = Ry * Ry + Rz * Rz
    if (r2 > 1) return null
    // Inverse X rotation (roll): undo gamma in the (y, z) plane
    const cg = Math.cos(gamma * D2R)
    const sg = Math.sin(gamma * D2R)
    const y1 = Ry * cg + Rz * sg
    const z1 = -Ry * sg + Rz * cg
    // Visible-side depth (rotation preserves length, so y1²+z1² == r2)
    const x1 = Math.sqrt(Math.max(0, 1 - r2))
    // Inverse Y rotation: undo phi in the (x, z) plane
    const cp = Math.cos(phi * D2R)
    const sp = Math.sin(phi * D2R)
    const x0 = x1 * cp - z1 * sp
    const y0 = y1
    const z0 = x1 * sp + z1 * cp
    const lat = Math.asin(clamp(z0, -1, 1)) * R2D
    let lng = Math.atan2(y0, x0) * R2D + lambda
    lng = ((((lng + 180) % 360) + 360) % 360) - 180
    return { lng, lat }
}

/**
 * Find limb intersection between visible point a and invisible point b.
 * Linear-interpolates in 3D to find rx=0 crossing, then normalizes onto the
 * limb circle so the projected point lies exactly on the globe outline.
 */
function limbIntersect(
    a: ProjectedPoint,
    b: ProjectedPoint,
    R: number,
    cx: number,
    cy: number
): ProjectedPoint | null {
    const dr = a.rx - b.rx
    if (Math.abs(dr) < 1e-12) return null
    const t = a.rx / dr
    if (t < 0 || t > 1) return null
    let ry = a.ry + t * (b.ry - a.ry)
    let rz = a.rz + t * (b.rz - a.rz)
    const norm = Math.sqrt(ry * ry + rz * rz)
    if (norm < 1e-9) return null
    ry /= norm
    rz /= norm
    return {
        sx: cx + R * ry,
        sy: cy - R * rz,
        rx: 0,
        ry,
        rz,
        v: true,
    }
}

/**
 * Clip a closed ring to the visible hemisphere. Returns one or more visible
 * sub-paths (arrays of projected points), each of which can be drawn as a
 * filled SVG sub-path closed with Z.
 *
 * IMPLEMENTATION NOTE: We MUST start iteration at an edge that is itself a
 * non-visible→visible transition. If we naively iterate from index 0, a ring
 * whose visible portion happens to wrap across the array boundary gets split
 * into two disconnected sub-paths, and the closing chord on each piece cuts
 * straight across the visible disc — producing the "random lines" artifact.
 */
function ringToSegments(
    ring: number[][],
    lambda: number,
    phi: number,
    gamma: number,
    R: number,
    cx: number,
    cy: number
): ProjectedPoint[][] {
    const n = ring.length
    if (n < 3) return []
    const proj: ProjectedPoint[] = new Array(n)
    let visCount = 0
    for (let i = 0; i < n; i++) {
        const p = ring[i]
        proj[i] = project(p[0], p[1], lambda, phi, gamma, R, cx, cy)
        if (proj[i].v) visCount++
    }
    if (visCount === 0) return []
    if (visCount === n) return [proj.slice()]

    // Find a starting edge i→i+1 where A is invisible and B is visible.
    // Iterating from there means every segment we open will also close, with
    // no segments left dangling at loop-end.
    let startIdx = -1
    for (let i = 0; i < n; i++) {
        if (!proj[i].v && proj[(i + 1) % n].v) {
            startIdx = i
            break
        }
    }
    // Should always exist when 0 < visCount < n; defensive fallback otherwise
    if (startIdx === -1) return [proj.slice()]

    const segments: ProjectedPoint[][] = []
    let cur: ProjectedPoint[] = []

    for (let k = 0; k < n; k++) {
        const i = (startIdx + k) % n
        const j = (startIdx + k + 1) % n
        const A = proj[i]
        const B = proj[j]

        if (A.v && B.v) {
            // Continuing a visible run. A is already in cur from the prior
            // edge — only push B to avoid duplicating vertices.
            cur.push(B)
        } else if (A.v && !B.v) {
            // Exit transition: cur ends with A; close it with the limb point.
            const inter = limbIntersect(A, B, R, cx, cy)
            if (inter) cur.push(inter)
            if (cur.length >= 2) segments.push(cur)
            cur = []
        } else if (!A.v && B.v) {
            // Entry transition: open a fresh segment with the limb point + B.
            const inter = limbIntersect(A, B, R, cx, cy)
            if (inter) cur.push(inter)
            cur.push(B)
        }
        // both invisible: skip
    }
    // By construction the last edge ends at the chosen invisible-after-visible
    // boundary, so cur is always empty here and we don't need a tail flush.

    return segments
}

function segmentsToPath(segs: ProjectedPoint[][]): string {
    if (segs.length === 0) return ""
    let out = ""
    for (const seg of segs) {
        for (let i = 0; i < seg.length; i++) {
            const p = seg[i]
            out +=
                (i === 0 ? "M" : "L") + p.sx.toFixed(1) + "," + p.sy.toFixed(1)
        }
        out += "Z"
    }
    return out
}

function buildSphericalPath(
    type: string,
    coords: any,
    lambda: number,
    phi: number,
    gamma: number,
    R: number,
    cx: number,
    cy: number
): string {
    if (!coords) return ""
    if (type === "Polygon") {
        let out = ""
        for (const ring of coords) {
            out += segmentsToPath(
                ringToSegments(ring, lambda, phi, gamma, R, cx, cy)
            )
        }
        return out
    }
    if (type === "MultiPolygon") {
        let out = ""
        for (const poly of coords) {
            for (const ring of poly) {
                out += segmentsToPath(
                    ringToSegments(ring, lambda, phi, gamma, R, cx, cy)
                )
            }
        }
        return out
    }
    return ""
}

/* ========================================================================== */
/* TopoJSON Decoder */
/* ========================================================================== */

function decArcs(t: any): number[][][] {
    const tf = t.transform
    if (!tf) return t.arcs
    const sx = tf.scale[0],
        sy = tf.scale[1],
        dx = tf.translate[0],
        dy = tf.translate[1]
    return t.arcs.map((a: number[][]) => {
        let x = 0,
            y = 0
        return a.map((p: number[]) => {
            x += p[0]
            y += p[1]
            return [x * sx + dx, y * sy + dy]
        })
    })
}

function resolveRing(idx: number[], arcs: number[][][]): number[][] {
    const out: number[][] = []
    for (const i of idx) {
        const a = i >= 0 ? arcs[i] : arcs[~i].slice().reverse()
        for (let j = out.length > 0 ? 1 : 0; j < a.length; j++) out.push(a[j])
    }
    return out
}

function extractFeatures(t: any): any[] {
    const arcs = decArcs(t)
    const gs = t.objects.countries?.geometries
    if (!gs) return []
    return gs.map((g: any) => {
        let c: any = null
        if (g.type === "Polygon")
            c = g.arcs.map((r: number[]) => resolveRing(r, arcs))
        else if (g.type === "MultiPolygon")
            c = g.arcs.map((p: number[][]) =>
                p.map((r: number[]) => resolveRing(r, arcs))
            )
        return { id: String(g.id ?? ""), type: g.type, coords: c }
    })
}

/* ========================================================================== */
/* Hover hit-test (point-in-polygon over lng/lat) */
/* ========================================================================== */

function pointInRing(x: number, y: number, ring: number[][]): boolean {
    let inside = false
    const n = ring.length
    for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = ring[i][0],
            yi = ring[i][1]
        const xj = ring[j][0],
            yj = ring[j][1]
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
            inside = !inside
    }
    return inside
}

function findCountryAt(
    lng: number,
    lat: number,
    index: CountryEntry[]
): CountryEntry | null {
    for (const c of index) {
        if (lng < c.bbox.minLng || lng > c.bbox.maxLng) continue
        if (lat < c.bbox.minLat || lat > c.bbox.maxLat) continue
        let inside = false
        for (const ring of c.rings) {
            if (pointInRing(lng, lat, ring)) inside = !inside
        }
        if (inside) return c
    }
    return null
}

/* ========================================================================== */
/* Utilities */
/* ========================================================================== */

/**
 * Build an rgba() string from any color input, with the alpha forced to `a`.
 * Critical: Framer's color picker emits "rgba(...)" strings for any color that
 * has alpha. We must REPLACE that alpha — not return the input unchanged —
 * otherwise gradient stops with different requested alphas all collapse to the
 * same value and gradients become flat fills.
 */
function rgba(c: string, a: number): string {
    if (typeof c !== "string" || !c) return "rgba(0,0,0," + a + ")"
    const s = c.trim()
    // rgb(r,g,b) or rgba(r,g,b,a) — extract first three numeric components
    if (s.indexOf("rgb") === 0) {
        const m = s.match(/-?[\d.]+/g)
        if (m && m.length >= 3) {
            return "rgba(" + m[0] + "," + m[1] + "," + m[2] + "," + a + ")"
        }
        return "rgba(0,0,0," + a + ")"
    }
    // hsl(h,s%,l%) or hsla(h,s%,l%,a)
    if (s.indexOf("hsl") === 0) {
        const m = s.match(/-?[\d.]+/g)
        if (m && m.length >= 3) {
            // Use hsla directly — browsers accept it everywhere SVG colors work
            return "hsla(" + m[0] + "," + m[1] + "%," + m[2] + "%," + a + ")"
        }
        return "rgba(0,0,0," + a + ")"
    }
    // Hex
    const h = s.replace("#", "")
    if (h.length !== 3 && h.length !== 6 && h.length !== 8) {
        // Unknown format — fall back to a neutral transparent so we don't
        // leak a bogus color into the SVG.
        return "rgba(0,0,0," + a + ")"
    }
    const f =
        h.length === 3
            ? h
                  .split("")
                  .map((x) => x + x)
                  .join("")
            : h.slice(0, 6)
    return (
        "rgba(" +
        parseInt(f.slice(0, 2), 16) +
        "," +
        parseInt(f.slice(2, 4), 16) +
        "," +
        parseInt(f.slice(4, 6), 16) +
        "," +
        a +
        ")"
    )
}

// Seeded PRNG for stable star positions
function mulberry32(seed: number) {
    let s = seed >>> 0
    return () => {
        s = (s + 0x6d2b79f5) >>> 0
        let t = s
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

const DATA_URL =
    "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"

/* ========================================================================== */
/* Component */
/* ========================================================================== */

export default function MilitaryMap(props: Props) {
    const { markers, countries, mapStyle, tooltip, grid, layout, interaction } =
        props

    const containerRef = React.useRef<HTMLDivElement>(null)
    const svgRef = React.useRef<SVGSVGElement>(null)
    const pathRefs = React.useRef<Map<string, SVGPathElement>>(new Map())
    const ghostPathRefs = React.useRef<Map<string, SVGPathElement>>(new Map())
    const markerRefs = React.useRef<Map<number, SVGGElement>>(new Map())
    const gridPathRef = React.useRef<SVGPathElement>(null)

    const [isClient, setIsClient] = React.useState(false)
    const [dims, setDims] = React.useState({ w: 700, h: 500 })
    const [feats, setFeats] = React.useState<any[] | null>(null)
    const [err, setErr] = React.useState(false)
    const [hM, setHM] = React.useState<HoveredMarker | null>(null)
    const [hC, setHC] = React.useState<HoveredCountry | null>(null)

    // Live rotation state held in refs to avoid React reconciliation per frame.
    // Mapping to user-facing axis controls:
    //   rotateZ → lambda (around polar / vertical axis = "spin")
    //   rotateY → phi    (around screen-right axis = "tilt")
    //   rotateX → gamma  (around camera-depth axis = "roll")
    const rotRef = React.useRef({
        lambda: interaction.rotateZ,
        phi: interaction.rotateY,
        gamma: interaction.rotateX,
    })
    const dragRef = React.useRef({
        active: false,
        startX: 0,
        startY: 0,
        startLambda: 0,
        startPhi: 0,
    })
    const lastMouseRef = React.useRef<{ x: number; y: number } | null>(null)
    const userInteractedRef = React.useRef<number>(0) // timestamp of last drag end

    /* SSR guard */
    React.useEffect(() => {
        setIsClient(true)
    }, [])

    /* Sync rotation to rotateX/Y/Z props whenever they change in Framer.
       Skipped while user is actively dragging so we don't yank the globe. */
    React.useEffect(() => {
        if (!dragRef.current.active) {
            rotRef.current.lambda = interaction.rotateZ
            rotRef.current.phi = interaction.rotateY
            rotRef.current.gamma = interaction.rotateX
        }
    }, [interaction.rotateX, interaction.rotateY, interaction.rotateZ])

    /* Resize observer */
    React.useEffect(() => {
        if (!isClient) return
        const el = containerRef.current
        if (!el) return
        const ro = new ResizeObserver((e) => {
            const r = e[0]?.contentRect
            if (r && r.width > 0 && r.height > 0) {
                React.startTransition(() => {
                    setDims({ w: r.width, h: r.height })
                })
            }
        })
        ro.observe(el)
        return () => ro.disconnect()
    }, [isClient])

    /* Load topojson */
    React.useEffect(() => {
        if (!isClient) return
        let dead = false
        fetch(DATA_URL)
            .then((r) => {
                if (!r.ok) throw 0
                return r.json()
            })
            .then((t) => {
                if (!dead) {
                    React.startTransition(() => {
                        setFeats(extractFeatures(t))
                    })
                }
            })
            .catch(() => {
                if (!dead) {
                    React.startTransition(() => {
                        setErr(true)
                    })
                }
            })
        return () => {
            dead = true
        }
    }, [isClient])

    /* Geometry */
    const { w: W, h: H } = dims
    const pad = layout.padding
    const innerW = Math.max(0, W - pad * 2)
    const innerH = Math.max(0, H - pad * 2)
    const R = Math.max(20, Math.min(innerW, innerH) / 2 - 8)
    const cx = W / 2
    const cy = H / 2

    /* Build country index (used for both rendering and hover hit-test) */
    const countryIndex: CountryEntry[] = React.useMemo(() => {
        if (!feats) return []
        const out: CountryEntry[] = []
        for (const f of feats) {
            const pad3 = String(f.id).padStart(3, "0")
            const e = CD[pad3]
            const a3 = e ? e[0] : pad3
            const nm = e ? e[1] : a3
            if (a3 === "ATA") continue
            // Flatten rings + bbox
            const rings: number[][][] = []
            let minLng = Infinity,
                maxLng = -Infinity,
                minLat = Infinity,
                maxLat = -Infinity
            const visit = (ring: number[][]) => {
                rings.push(ring)
                for (const p of ring) {
                    if (p[0] < minLng) minLng = p[0]
                    if (p[0] > maxLng) maxLng = p[0]
                    if (p[1] < minLat) minLat = p[1]
                    if (p[1] > maxLat) maxLat = p[1]
                }
            }
            if (f.type === "Polygon") {
                for (const r of f.coords) visit(r)
            } else if (f.type === "MultiPolygon") {
                for (const poly of f.coords) for (const r of poly) visit(r)
            }
            out.push({
                id: a3,
                name: nm,
                type: f.type,
                coords: f.coords,
                rings,
                bbox: { minLng, maxLng, minLat, maxLat },
            })
        }
        return out
    }, [feats])

    /* Country config map (for fill / enabled lookups) */
    const cfgMap = React.useMemo(() => {
        const m = new Map<string, CountryItem>()
        countries.forEach((c) => m.set(c.code, c))
        return m
    }, [countries])

    /* Stars (seeded so they don't reshuffle per render) */
    const stars = React.useMemo(() => {
        if (!interaction.showStars) return []
        const rnd = mulberry32(0x5e6d_a17c)
        const N = 70
        const out: { x: number; y: number; r: number; o: number }[] = []
        for (let i = 0; i < N; i++) {
            const x = rnd() * W
            const y = rnd() * H
            // skip if inside the globe (with margin)
            const dx = x - cx,
                dy = y - cy
            if (dx * dx + dy * dy < (R + 12) * (R + 12)) continue
            out.push({
                x,
                y,
                r: 0.4 + rnd() * 0.9,
                o: 0.18 + rnd() * 0.6,
            })
        }
        return out
    }, [W, H, cx, cy, R, interaction.showStars])

    /* Animation loop — drives all per-frame DOM updates imperatively */
    React.useEffect(() => {
        if (!isClient || countryIndex.length === 0) return
        if (W <= 0 || H <= 0 || R <= 0) return

        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        let raf = 0
        let lastTime =
            typeof performance !== "undefined" ? performance.now() : 0
        const idleMs = 1200 // resume auto-rotate this long after drag ends

        const step = (now: number) => {
            const dt = Math.min(0.05, (now - lastTime) / 1000)
            lastTime = now

            const sinceUser = now - userInteractedRef.current
            if (
                interaction.autoRotate &&
                !dragRef.current.active &&
                sinceUser > idleMs
            ) {
                rotRef.current.lambda += interaction.autoRotateSpeed * dt
            }

            const { lambda, phi, gamma } = rotRef.current

            // Update country paths
            for (const c of countryIndex) {
                const d = buildSphericalPath(
                    c.type,
                    c.coords,
                    lambda,
                    phi,
                    gamma,
                    R,
                    cx,
                    cy
                )
                const p = pathRefs.current.get(c.id)
                if (p) p.setAttribute("d", d)
                const g = ghostPathRefs.current.get(c.id)
                if (g) g.setAttribute("d", d)
            }

            // Update grid (graticule)
            if (grid.show && gridPathRef.current) {
                gridPathRef.current.setAttribute(
                    "d",
                    buildGraticule(lambda, phi, gamma, R, cx, cy)
                )
            }

            // Update markers
            for (let i = 0; i < markers.length; i++) {
                const m = markers[i]
                const el = markerRefs.current.get(i)
                if (!el) continue
                const p = project(
                    m.longitude,
                    m.latitude,
                    lambda,
                    phi,
                    gamma,
                    R,
                    cx,
                    cy
                )
                if (p.v) {
                    // depth fade near the limb
                    const fade = clamp(p.rx * 4, 0, 1)
                    el.style.opacity = String(fade)
                    el.style.display = ""
                    el.setAttribute(
                        "transform",
                        "translate(" +
                            p.sx.toFixed(1) +
                            "," +
                            p.sy.toFixed(1) +
                            ")"
                    )
                } else {
                    el.style.opacity = "0"
                    el.style.display = "none"
                }
            }

            // Re-evaluate hover (rotation may have moved a country under cursor)
            if (lastMouseRef.current && !dragRef.current.active && !isCanvas) {
                const m = lastMouseRef.current
                const ll = unproject(m.x, m.y, lambda, phi, gamma, R, cx, cy)
                if (ll) {
                    const c = findCountryAt(ll.lng, ll.lat, countryIndex)
                    if (c) {
                        if (!hC || hC.code !== c.id) {
                            React.startTransition(() => {
                                setHC({
                                    screenX: m.x,
                                    screenY: m.y,
                                    name: c.name,
                                    code: c.id,
                                })
                            })
                        } else if (hC.screenX !== m.x || hC.screenY !== m.y) {
                            // Position update only — cheap
                            React.startTransition(() => {
                                setHC({ ...hC, screenX: m.x, screenY: m.y })
                            })
                        }
                    } else if (hC) {
                        React.startTransition(() => {
                            setHC(null)
                        })
                    }
                } else if (hC) {
                    React.startTransition(() => {
                        setHC(null)
                    })
                }
            }

            raf = requestAnimationFrame(step)
        }

        raf = requestAnimationFrame(step)
        return () => cancelAnimationFrame(raf)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        isClient,
        countryIndex,
        markers,
        R,
        cx,
        cy,
        W,
        H,
        grid.show,
        interaction.autoRotate,
        interaction.autoRotateSpeed,
    ])

    /* Sync hover highlight to actual <path> fills */
    React.useEffect(() => {
        for (const c of countryIndex) {
            const el = pathRefs.current.get(c.id)
            if (!el) continue
            const cc = cfgMap.get(c.id)
            const enabled = cc ? cc.enabled : true
            const isHov = hC?.code === c.id
            const fill = isHov
                ? mapStyle.hoverColor
                : !enabled && cc
                  ? mapStyle.disabledColor
                  : mapStyle.landFill
            el.setAttribute("fill", fill)
        }
    }, [
        countryIndex,
        cfgMap,
        hC,
        mapStyle.hoverColor,
        mapStyle.disabledColor,
        mapStyle.landFill,
    ])

    /* Pointer handlers */
    const localMouse = (e: React.PointerEvent) => {
        const r = containerRef.current?.getBoundingClientRect()
        if (!r) return { x: 0, y: 0 }
        return { x: e.clientX - r.left, y: e.clientY - r.top }
    }

    const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
        // Drag disabled by user — leave the globe alone
        if (!interaction.enableDrag) return
        const m = localMouse(e)
        const dx = m.x - cx,
            dy = m.y - cy
        // Only start drag when pressing on the globe itself (inside disc + small margin)
        if (dx * dx + dy * dy > (R + 8) * (R + 8)) return
        dragRef.current = {
            active: true,
            startX: m.x,
            startY: m.y,
            startLambda: rotRef.current.lambda,
            startPhi: rotRef.current.phi,
        }
        try {
            ;(e.currentTarget as any).setPointerCapture(e.pointerId)
        } catch {}
        React.startTransition(() => {
            setHC(null)
            setHM(null)
        })
    }

    const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
        const m = localMouse(e)
        lastMouseRef.current = m

        if (dragRef.current.active) {
            const sens = interaction.dragSensitivity
            const dx = m.x - dragRef.current.startX
            const dy = m.y - dragRef.current.startY
            // Drag right → globe content moves right with the cursor
            // (lambda DECREASES so longitudes shift toward +screen-x)
            rotRef.current.lambda = dragRef.current.startLambda - dx * sens
            rotRef.current.phi = clamp(
                dragRef.current.startPhi + dy * sens,
                -85,
                85
            )
            return
        }

        // Hover-only: country detection happens in rAF loop
    }

    const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
        if (dragRef.current.active) {
            dragRef.current.active = false
            userInteractedRef.current =
                typeof performance !== "undefined"
                    ? performance.now()
                    : Date.now()
            try {
                ;(e.currentTarget as any).releasePointerCapture(e.pointerId)
            } catch {}
        }
    }

    const onPointerLeave = () => {
        lastMouseRef.current = null
        if (!dragRef.current.active) {
            React.startTransition(() => {
                setHC(null)
                setHM(null)
            })
        }
    }

    /* Marker hover handlers (raycast against actual marker positions) */
    const handleMarkerEnter = (i: number, e: React.MouseEvent<SVGGElement>) => {
        const m = markers[i]
        const r = containerRef.current?.getBoundingClientRect()
        if (!r) return
        React.startTransition(() => {
            setHM({
                screenX: e.clientX - r.left,
                screenY: e.clientY - r.top,
                label: m.label,
                description: m.description,
            })
        })
    }
    const handleMarkerMove = (i: number, e: React.MouseEvent<SVGGElement>) => {
        const m = markers[i]
        const r = containerRef.current?.getBoundingClientRect()
        if (!r) return
        React.startTransition(() => {
            setHM({
                screenX: e.clientX - r.left,
                screenY: e.clientY - r.top,
                label: m.label,
                description: m.description,
            })
        })
    }
    const handleMarkerLeave = () => {
        React.startTransition(() => {
            setHM(null)
        })
    }

    /* Destructure config for cleaner JSX */
    const { oceanColor, landFill, landStroke, strokeWidth, disabledColor } =
        mapStyle
    const { show: showGrid, color: gridCol, opacity: gridOp } = grid
    const { cornerRadius, showBorder, borderColor: bCol } = layout
    const {
        show: showTooltip,
        background: ttBg,
        textColor: ttCol,
        borderColor: ttBord,
    } = tooltip
    const { glowColor, glowIntensity, enableDrag, showLabels } = interaction

    const loading = !feats && !err
    const uid = React.useRef(Math.random().toString(36).slice(2, 6)).current
    const fG = "g" + uid
    const fL = "l" + uid
    const gO = "o" + uid
    const gShade = "s" + uid
    const gAtm = "a" + uid
    const clipDisc = "c" + uid

    return (
        <div
            ref={containerRef}
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                boxSizing: "border-box",
                borderRadius: cornerRadius,
                padding: pad,
                background: "transparent",
                border: showBorder ? "1px solid " + bCol : "none",
                fontFamily:
                    '"SF Mono", ui-monospace, SFMono-Regular, "Cascadia Mono", Menlo, Monaco, Consolas, monospace',
                color: "#d8ddd9",
                touchAction: "none",
                userSelect: "none",
                WebkitUserSelect: "none",
            }}
        >
            <style>
                {".mm-c{transition:fill 140ms ease,filter 140ms ease}" +
                    ".mm-c:hover{filter:brightness(1.18)}" +
                    "@keyframes mm-pulse{0%,100%{transform:scale(1);opacity:.55}50%{transform:scale(1.6);opacity:.05}}" +
                    ".mm-pulse{animation:mm-pulse 2.4s ease-out infinite;transform-box:fill-box;transform-origin:center}"}
            </style>

            {loading && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "rgba(216,221,217,0.4)",
                        fontSize: 11,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase" as const,
                    }}
                >
                    Loading globe data…
                </div>
            )}
            {err && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "column" as const,
                        gap: 6,
                        color: rgba("#ff6b6b", 0.7),
                        fontSize: 11,
                    }}
                >
                    <span>Map data unavailable</span>
                    <span style={{ fontSize: 9, opacity: 0.6 }}>
                        Check network access to cdn.jsdelivr.net
                    </span>
                </div>
            )}

            <svg
                ref={svgRef}
                width={W}
                height={H}
                viewBox={"0 0 " + W + " " + H}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onPointerLeave={onPointerLeave}
                style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    cursor: enableDrag
                        ? dragRef.current.active
                            ? "grabbing"
                            : "grab"
                        : "default",
                    willChange: "transform",
                    transform: "translateZ(0)",
                    backfaceVisibility: "hidden" as const,
                }}
            >
                <defs>
                    <filter
                        id={fG}
                        x="-200%"
                        y="-200%"
                        width="500%"
                        height="500%"
                    >
                        <feGaussianBlur stdDeviation="3" result="b" />
                        <feMerge>
                            <feMergeNode in="b" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <filter
                        id={fL}
                        x="-50%"
                        y="-50%"
                        width="200%"
                        height="200%"
                    >
                        <feGaussianBlur stdDeviation="3" result="b" />
                        <feColorMatrix
                            in="b"
                            type="matrix"
                            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.16 0"
                        />
                    </filter>

                    {/* Subtle ambient lighting on the disc */}
                    <radialGradient id={gShade} cx="38%" cy="32%" r="78%">
                        <stop offset="0%" stopColor={rgba("#ffffff", 0.12)} />
                        <stop offset="55%" stopColor={rgba("#ffffff", 0.0)} />
                        <stop offset="92%" stopColor={rgba("#000000", 0.32)} />
                        <stop offset="100%" stopColor={rgba("#000000", 0.55)} />
                    </radialGradient>

                    {/* Atmosphere halo */}
                    <radialGradient id={gAtm} cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor={rgba(glowColor, 0)} />
                        <stop
                            offset={
                                ((R / Math.max(R + 60, 1)) * 100).toFixed(1) +
                                "%"
                            }
                            stopColor={rgba(glowColor, 0)}
                        />
                        <stop
                            offset={
                                (((R + 6) / Math.max(R + 60, 1)) * 100).toFixed(
                                    1
                                ) + "%"
                            }
                            stopColor={rgba(glowColor, 0.4 * glowIntensity)}
                        />
                        <stop offset="100%" stopColor={rgba(glowColor, 0)} />
                    </radialGradient>

                    {/* Subtle ocean tonal gradient */}
                    <linearGradient id={gO} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={rgba("#2c3137", 0.35)} />
                        <stop offset="50%" stopColor={rgba("#171a1e", 0.06)} />
                        <stop offset="100%" stopColor={rgba("#0f1114", 0.3)} />
                    </linearGradient>

                    {/* Disc clip — confines geometry inside the globe outline */}
                    <clipPath id={clipDisc}>
                        <circle cx={cx} cy={cy} r={R} />
                    </clipPath>
                </defs>

                {/* Stars */}
                {interaction.showStars &&
                    stars.map((s, i) => (
                        <circle
                            key={"s" + i}
                            cx={s.x.toFixed(1)}
                            cy={s.y.toFixed(1)}
                            r={s.r.toFixed(2)}
                            fill={rgba("#ffffff", s.o)}
                        />
                    ))}

                {/* Atmosphere halo */}
                <circle
                    cx={cx}
                    cy={cy}
                    r={R + 60}
                    fill={"url(#" + gAtm + ")"}
                    pointerEvents="none"
                />

                {/* Ocean disc */}
                <circle cx={cx} cy={cy} r={R} fill={oceanColor} />
                <circle cx={cx} cy={cy} r={R} fill={"url(#" + gO + ")"} />

                {/* Clipped content */}
                <g clipPath={"url(#" + clipDisc + ")"}>
                    {/* Soft land glow — kept very subtle to avoid haloing */}
                    <g opacity={0.07} filter={"url(#" + fL + ")"}>
                        {countryIndex.map((c) => (
                            <path
                                key={"g" + c.id}
                                ref={(el) => {
                                    if (el) ghostPathRefs.current.set(c.id, el)
                                    else ghostPathRefs.current.delete(c.id)
                                }}
                                fill={landFill}
                                stroke="none"
                                pointerEvents="none"
                            />
                        ))}
                    </g>

                    {/* Graticule */}
                    {showGrid && (
                        <path
                            ref={gridPathRef}
                            fill="none"
                            stroke={gridCol}
                            strokeWidth={0.5}
                            strokeOpacity={gridOp}
                            vectorEffect="non-scaling-stroke"
                            pointerEvents="none"
                        />
                    )}

                    {/* Countries */}
                    {countryIndex.map((c) => {
                        const cc = cfgMap.get(c.id)
                        const enabled = cc ? cc.enabled : true
                        const initialFill =
                            !enabled && cc ? disabledColor : landFill
                        return (
                            <path
                                key={c.id}
                                ref={(el) => {
                                    if (el) pathRefs.current.set(c.id, el)
                                    else pathRefs.current.delete(c.id)
                                }}
                                className="mm-c"
                                fill={initialFill}
                                stroke={landStroke}
                                strokeWidth={strokeWidth}
                                vectorEffect="non-scaling-stroke"
                                style={{ cursor: "default" }}
                            />
                        )
                    })}
                </g>

                {/* Globe lighting overlay — sits above geometry, below markers */}
                <circle
                    cx={cx}
                    cy={cy}
                    r={R}
                    fill={"url(#" + gShade + ")"}
                    pointerEvents="none"
                />

                {/* Crisp limb stroke */}
                <circle
                    cx={cx}
                    cy={cy}
                    r={R}
                    fill="none"
                    stroke={rgba(glowColor, 0.35 * glowIntensity)}
                    strokeWidth={1}
                    pointerEvents="none"
                />

                {/* Markers */}
                {markers.map((m, i) => {
                    const sz = 5
                    const col = m.color || "#E53E3E"
                    return (
                        <g
                            key={"m" + i + "-" + m.label}
                            ref={(el) => {
                                if (el) markerRefs.current.set(i, el)
                                else markerRefs.current.delete(i)
                            }}
                            style={{ cursor: "pointer", opacity: 0 }}
                            onMouseEnter={(e) => handleMarkerEnter(i, e)}
                            onMouseMove={(e) => handleMarkerMove(i, e)}
                            onMouseLeave={handleMarkerLeave}
                        >
                            {/* Pulse ring */}
                            <circle
                                className="mm-pulse"
                                r={sz * 1.4}
                                fill={rgba(col, 0.55)}
                            />
                            {/* Outer glow */}
                            <circle r={sz * 2.1} fill={rgba(col, 0.14)} />
                            {/* Core */}
                            <circle r={sz} fill={col} />
                            {/* Specular highlight */}
                            <circle
                                cx={-sz * 0.35}
                                cy={-sz * 0.35}
                                r={sz * 0.35}
                                fill={rgba("#ffffff", 0.55)}
                            />
                            {/* Always-visible small label */}
                            {showLabels && m.label && (
                                <text
                                    x={sz * 2.2}
                                    y={sz * 0.4 + 1}
                                    fill="#e7ece9"
                                    fontSize={10}
                                    fontWeight={600}
                                    fontFamily='"SF Mono", ui-monospace, SFMono-Regular, "Cascadia Mono", Menlo, Monaco, Consolas, monospace'
                                    letterSpacing="0.04em"
                                    stroke={oceanColor}
                                    strokeWidth={3}
                                    strokeLinejoin="round"
                                    paintOrder="stroke"
                                    style={{
                                        pointerEvents: "none",
                                        userSelect: "none",
                                    }}
                                >
                                    {m.label}
                                </text>
                            )}
                        </g>
                    )
                })}
            </svg>

            {/* Marker tooltip — label + description */}
            {showTooltip && hM && (
                <div
                    style={{
                        position: "absolute",
                        left: hM.screenX + 14,
                        top: hM.screenY - 14,
                        transform: "translateY(-100%)",
                        background: ttBg,
                        color: ttCol,
                        border: "1px solid " + ttBord,
                        borderRadius: 10,
                        padding: "8px 12px",
                        pointerEvents: "none",
                        zIndex: 20,
                        boxShadow: "0 6px 24px " + rgba("#000", 0.45),
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                        display: "flex",
                        flexDirection: "column" as const,
                        gap: 2,
                        maxWidth: 220,
                    }}
                >
                    <div
                        style={{
                            fontSize: 12,
                            fontWeight: 700,
                            letterSpacing: "0.04em",
                            whiteSpace: "nowrap" as const,
                        }}
                    >
                        {hM.label}
                    </div>
                    {hM.description && (
                        <div
                            style={{
                                fontSize: 10,
                                fontWeight: 400,
                                opacity: 0.65,
                                letterSpacing: "0.02em",
                                lineHeight: 1.35,
                            }}
                        >
                            {hM.description}
                        </div>
                    )}
                </div>
            )}

            {/* Country tooltip */}
            {showTooltip && !hM && hC && (
                <div
                    style={{
                        position: "absolute",
                        left: hC.screenX + 14,
                        top: hC.screenY - 10,
                        transform: "translateY(-100%)",
                        background: ttBg,
                        color: ttCol,
                        border: "1px solid " + ttBord,
                        borderRadius: 10,
                        padding: "7px 10px",
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: "0.03em",
                        whiteSpace: "nowrap" as const,
                        pointerEvents: "none",
                        zIndex: 20,
                        boxShadow: "0 6px 24px " + rgba("#000", 0.45),
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                    }}
                >
                    {hC.name}
                </div>
            )}
        </div>
    )
}

/* ========================================================================== */
/* Graticule (longitude/latitude grid) on the rotated sphere */
/* ========================================================================== */

function buildGraticule(
    lambda: number,
    phi: number,
    gamma: number,
    R: number,
    cx: number,
    cy: number
): string {
    let out = ""
    // Parallels (lat = const)
    for (let lat = -60; lat <= 60; lat += 30) {
        let started = false
        let prev: ProjectedPoint | null = null
        for (let lng = -180; lng <= 180; lng += 4) {
            const p = project(lng, lat, lambda, phi, gamma, R, cx, cy)
            if (p.v) {
                if (!started || (prev && !prev.v)) {
                    out += "M" + p.sx.toFixed(1) + "," + p.sy.toFixed(1)
                    started = true
                } else {
                    out += "L" + p.sx.toFixed(1) + "," + p.sy.toFixed(1)
                }
            }
            prev = p
        }
    }
    // Meridians (lng = const)
    for (let lng = -180; lng < 180; lng += 30) {
        let started = false
        let prev: ProjectedPoint | null = null
        for (let lat = -80; lat <= 80; lat += 4) {
            const p = project(lng, lat, lambda, phi, gamma, R, cx, cy)
            if (p.v) {
                if (!started || (prev && !prev.v)) {
                    out += "M" + p.sx.toFixed(1) + "," + p.sy.toFixed(1)
                    started = true
                } else {
                    out += "L" + p.sx.toFixed(1) + "," + p.sy.toFixed(1)
                }
            }
            prev = p
        }
    }
    return out
}

/* ========================================================================== */
/* Default Props */
/* ========================================================================== */

const defaultMarkers: MarkerItem[] = [
    {
        label: " From Kerala,India",
        description: "Relay node \u2022 Active",
        latitude: 20.5937,
        longitude: 78.9629,
        color: "#E53E3E",
    },
]

const defaultCountries: CountryItem[] = [
    { code: "USA", name: "United States", enabled: true },
    { code: "CAN", name: "Canada", enabled: true },
    { code: "BRA", name: "Brazil", enabled: true },
    { code: "GBR", name: "United Kingdom", enabled: true },
    { code: "FRA", name: "France", enabled: true },
    { code: "DEU", name: "Germany", enabled: true },
    { code: "UKR", name: "Ukraine", enabled: true },
    { code: "RUS", name: "Russia", enabled: true },
    { code: "TUR", name: "Turkey", enabled: true },
    { code: "IND", name: "India", enabled: true },
    { code: "CHN", name: "China", enabled: true },
    { code: "JPN", name: "Japan", enabled: true },
    { code: "AUS", name: "Australia", enabled: true },
    { code: "ZAF", name: "South Africa", enabled: true },
]

/* ========================================================================== */
/* Property Controls */
/* ========================================================================== */

addPropertyControls(MilitaryMap, {
    interaction: {
        type: ControlType.Object,
        title: "Interaction",
        description: "Rotation, drag, atmosphere",
        controls: {
            autoRotate: {
                type: ControlType.Boolean,
                title: "Auto-Rotate",
                defaultValue: true,
            },
            autoRotateSpeed: {
                type: ControlType.Number,
                title: "Spin Speed",
                description: "Degrees per second around the polar axis",
                defaultValue: 6,
                min: 0,
                max: 60,
                step: 0.5,
            },
            rotateX: {
                type: ControlType.Number,
                title: "Rotate X",
                description: "Roll around the camera axis (depth)",
                defaultValue: 0,
                min: -180,
                max: 180,
                step: 1,
            },
            rotateY: {
                type: ControlType.Number,
                title: "Rotate Y",
                description: "Tilt around the horizontal axis",
                defaultValue: 0,
                min: -85,
                max: 85,
                step: 1,
            },
            rotateZ: {
                type: ControlType.Number,
                title: "Rotate Z",
                description: "Spin around the polar axis (longitude)",
                defaultValue: 0,
                min: -180,
                max: 180,
                step: 1,
            },
            enableDrag: {
                type: ControlType.Boolean,
                title: "Drag to Rotate",
                description:
                    "Allow visitors to grab and rotate the globe with mouse or touch.",
                defaultValue: true,
            },
            dragSensitivity: {
                type: ControlType.Number,
                title: "Drag Sens.",
                defaultValue: 0.4,
                min: 0.05,
                max: 1.5,
                step: 0.05,
                hidden: (p: any) => p.enableDrag === false,
            },
            glowColor: {
                type: ControlType.Color,
                title: "Atmosphere",
                defaultValue: "#7ec8ff",
            },
            glowIntensity: {
                type: ControlType.Number,
                title: "Atm. Strength",
                defaultValue: 0.3,
                min: 0,
                max: 1.5,
                step: 0.05,
            },
            showStars: {
                type: ControlType.Boolean,
                title: "Stars",
                defaultValue: true,
            },
            showLabels: {
                type: ControlType.Boolean,
                title: "Marker Labels",
                description:
                    "Show small text labels next to each marker on the globe.",
                defaultValue: true,
            },
        },
    },

    mapStyle: {
        type: ControlType.Object,
        title: "Map Style",
        description: "Colors for ocean, land, borders, and hover",
        controls: {
            oceanColor: {
                type: ControlType.Color,
                title: "Ocean",
                defaultValue: "#111417",
            },
            landFill: {
                type: ControlType.Color,
                title: "Land",
                defaultValue: "#23282d",
            },
            landStroke: {
                type: ControlType.Color,
                title: "Borders",
                defaultValue: "#4d555d",
            },
            strokeWidth: {
                type: ControlType.Number,
                title: "Border Width",
                defaultValue: 0.5,
                min: 0.1,
                max: 3,
                step: 0.05,
            },
            hoverColor: {
                type: ControlType.Color,
                title: "Hover",
                defaultValue: "#5f686f",
            },
            disabledColor: {
                type: ControlType.Color,
                title: "Disabled",
                defaultValue: "#1a1e22",
            },
        },
    },

    countries: {
        type: ControlType.Array,
        title: "Countries",
        description:
            "Countries added here can be toggled on/off to dim them visually. Countries not listed remain fully visible.",
        control: {
            type: ControlType.Object,
            controls: {
                code: {
                    type: ControlType.Enum,
                    title: "Country",
                    options: ENUM_CODES,
                    optionTitles: ENUM_TITLES,
                    defaultValue: "USA",
                },
                name: {
                    type: ControlType.String,
                    title: "Display Name",
                    defaultValue: "United States",
                },
                enabled: {
                    type: ControlType.Boolean,
                    title: "Enabled",
                    defaultValue: true,
                },
            },
        },
        defaultValue: defaultCountries,
    },

    markers: {
        type: ControlType.Array,
        title: "Markers",
        description:
            "Map pins with coordinates, tooltip text, and styling. Markers on the back of the globe auto-hide.",
        control: {
            type: ControlType.Object,
            controls: {
                label: {
                    type: ControlType.String,
                    title: "Heading",
                    defaultValue: "New Marker",
                },
                description: {
                    type: ControlType.String,
                    title: "Subtext",
                    defaultValue: "",
                },
                latitude: {
                    type: ControlType.Number,
                    title: "Latitude",
                    defaultValue: 48.8566,
                    min: -85,
                    max: 85,
                    step: 0.0001,
                },
                longitude: {
                    type: ControlType.Number,
                    title: "Longitude",
                    defaultValue: 2.3522,
                    min: -180,
                    max: 180,
                    step: 0.0001,
                },
                color: {
                    type: ControlType.Color,
                    title: "Color",
                    defaultValue: "#E53E3E",
                },
            },
        },
        defaultValue: defaultMarkers,
    },

    tooltip: {
        type: ControlType.Object,
        title: "Tooltip",
        description: "Hover tooltip appearance",
        controls: {
            show: {
                type: ControlType.Boolean,
                title: "Visible",
                defaultValue: true,
            },
            background: {
                type: ControlType.Color,
                title: "Background",
                defaultValue: "rgba(18, 20, 23, 0.92)",
            },
            textColor: {
                type: ControlType.Color,
                title: "Text Color",
                defaultValue: "#e7ece9",
            },
            borderColor: {
                type: ControlType.Color,
                title: "Border",
                defaultValue: "rgba(140, 150, 145, 0.32)",
            },
        },
    },

    grid: {
        type: ControlType.Object,
        title: "Grid",
        description: "Latitude and longitude graticule on the sphere",
        controls: {
            show: {
                type: ControlType.Boolean,
                title: "Visible",
                defaultValue: true,
            },
            color: {
                type: ControlType.Color,
                title: "Color",
                defaultValue: "#5b636a",
            },
            opacity: {
                type: ControlType.Number,
                title: "Opacity",
                defaultValue: 0.18,
                min: 0,
                max: 1,
                step: 0.01,
            },
        },
    },

    layout: {
        type: ControlType.Object,
        title: "Layout",
        description: "Container shape and border",
        controls: {
            cornerRadius: {
                type: ControlType.Number,
                title: "Corner Radius",
                defaultValue: 0,
                min: 0,
                max: 40,
                step: 1,
            },
            padding: {
                type: ControlType.Number,
                title: "Padding",
                defaultValue: 12,
                min: 0,
                max: 40,
                step: 1,
            },
            showBorder: {
                type: ControlType.Boolean,
                title: "Show Border",
                defaultValue: false,
            },
            borderColor: {
                type: ControlType.Color,
                title: "Border Color",
                defaultValue: "rgba(120, 128, 126, 0.24)",
            },
        },
    },

    _contact: {
        type: ControlType.Link,
        title: "Need help?",
        defaultValue: "zlatkomarjanovic.zm@gmail.com",
    },
})
