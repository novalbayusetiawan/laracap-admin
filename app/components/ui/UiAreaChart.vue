<script setup lang="ts">
/**
 * Minimal SVG area/line chart — no chart library needed.
 * Renders a smooth area with gradient fill, hover dots and value labels.
 */
const props = defineProps<{
  labels: string[]
  series: { name: string, values: number[], color: string }[]
  height?: number
}>()

const W = 600
const H = computed(() => props.height ?? 160)
const PAD = 8

const maxVal = computed(() => Math.max(1, ...props.series.flatMap((s) => s.values)))

function points(values: number[]): [number, number][] {
  const n = values.length
  if (n === 0) return []
  const stepX = (W - PAD * 2) / Math.max(1, n - 1)
  return values.map((v, i) => [PAD + i * stepX, H.value - PAD - (v / maxVal.value) * (H.value - PAD * 2)])
}

function linePath(values: number[]): string {
  return points(values).map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
}

function areaPath(values: number[]): string {
  const pts = points(values)
  if (!pts.length) return ''
  const first = pts[0]!
  const last = pts[pts.length - 1]!
  return `${linePath(values)} L${last[0].toFixed(1)},${H.value - PAD} L${first[0].toFixed(1)},${H.value - PAD} Z`
}

const hoverIdx = ref<number | null>(null)
function onMove(e: MouseEvent) {
  const rect = (e.currentTarget as SVGElement).getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * W
  const n = props.labels.length
  const stepX = (W - PAD * 2) / Math.max(1, n - 1)
  hoverIdx.value = Math.min(n - 1, Math.max(0, Math.round((x - PAD) / stepX)))
}
</script>

<template>
  <div>
    <svg
      :viewBox="`0 0 ${W} ${H}`"
      class="w-full"
      preserveAspectRatio="none"
      @mousemove="onMove"
      @mouseleave="hoverIdx = null"
    >
      <defs>
        <linearGradient v-for="s in series" :id="`grad-${s.name}`" :key="s.name" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="s.color" stop-opacity="0.25" />
          <stop offset="100%" :stop-color="s.color" stop-opacity="0" />
        </linearGradient>
      </defs>
      <g v-for="s in series" :key="s.name">
        <path :d="areaPath(s.values)" :fill="`url(#grad-${s.name})`" />
        <path :d="linePath(s.values)" :stroke="s.color" stroke-width="2" fill="none" stroke-linejoin="round" />
        <circle
          v-if="hoverIdx !== null && points(s.values)[hoverIdx]"
          :cx="points(s.values)[hoverIdx]![0]"
          :cy="points(s.values)[hoverIdx]![1]"
          r="3.5"
          :fill="s.color"
        />
      </g>
    </svg>
    <div class="mt-1 flex items-center justify-between text-xs text-muted-foreground">
      <span>{{ labels[0] }}</span>
      <span v-if="hoverIdx !== null" class="font-medium text-foreground">
        {{ labels[hoverIdx] }} —
        <template v-for="(s, i) in series" :key="s.name">
          <span :style="{ color: s.color }">{{ s.name }}: {{ s.values[hoverIdx] ?? 0 }}</span><span v-if="i < series.length - 1"> · </span>
        </template>
      </span>
      <span>{{ labels[labels.length - 1] }}</span>
    </div>
    <div class="mt-2 flex gap-4 text-xs">
      <span v-for="s in series" :key="s.name" class="inline-flex items-center gap-1.5">
        <span class="h-2 w-2 rounded-full" :style="{ background: s.color }" />
        {{ s.name }}
      </span>
    </div>
  </div>
</template>
