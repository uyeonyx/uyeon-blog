// 익명 작성자의 그림 — 시드가 같으면 언제나 같은 무늬가 나온다.
//
// 이미지를 만들어 저장하지 않고 시드에서 매번 계산한다. 저장할 파일도, 외부 아바타 서비스도,
// CSP 예외도 필요 없다. 시드는 서버가 anon_id 쿠키에서 파생한 값이라 클라이언트가 고를 수 없다.
//
// 배경은 로그인 아바타 자리와 같은 중립색으로 두고 무늬에만 색을 준다 — 시드에서 뽑은 색을
// 배경까지 칠하면 라이트/다크 한쪽에서 반드시 튄다.

/** 좌우 대칭이므로 왼쪽 3열(5행 × 3열)만 정하면 나머지는 거울로 채워진다 */
const GRID = 5
const HALF = 3
const CELLS = GRID * HALF
/**
 * 원 밖으로 나가는 모서리를 줄이는 여백. 격자를 원에 꽉 채우면 네 귀퉁이가 잘려나가
 * 대칭이 깨져 보인다.
 */
const PADDING = 0.5
/**
 * 켜진 칸이 너무 적을 때 얹는 최소 무늬 — 세로 획 하나가 생긴다.
 * 비트가 우연히 거의 다 0인 시드가 2%쯤 나오는데, 그대로 두면 점 몇 개짜리 그림이 된다.
 */
const FLOOR_MASK = 0b010010010010010
const FLOOR_THRESHOLD = 4

interface Pattern {
  hue: number
  /** [row][col] — 0이면 빈칸, 1·2는 서로 다른 톤 */
  cells: number[][]
}

function countBits(value: number, width: number): number {
  let total = 0
  for (let i = 0; i < width; i++) total += (value >>> i) & 1
  return total
}

function buildPattern(seed: string): Pattern {
  // 16진 16자 = 64비트를 32비트씩 나눠 쓴다. 앞쪽은 색, 뒤쪽은 무늬.
  const colorBits = Number.parseInt(seed.slice(0, 8), 16) || 0
  let shapeBits = Number.parseInt(seed.slice(8, 16), 16) || 0
  if (countBits(shapeBits, CELLS) < FLOOR_THRESHOLD) {
    shapeBits |= FLOOR_MASK
  }

  const cells: number[][] = []
  for (let row = 0; row < GRID; row++) {
    const line: number[] = []
    for (let col = 0; col < HALF; col++) {
      const index = row * HALF + col
      // 15칸에 비트 하나씩. 톤은 인접 비트로 갈라 같은 색 덩어리가 뭉치지 않게 한다.
      const on = (shapeBits >>> index) & 1
      const tone = (colorBits >>> index) & 1
      line.push(on ? tone + 1 : 0)
    }
    cells.push(line)
  }

  return { hue: colorBits % 360, cells }
}

export default function AnonAvatar({ seed, size = 32 }: { seed: string; size?: number }) {
  const { hue, cells } = buildPattern(seed)
  // 명도를 중간에 두어 흰 배경과 검은 배경 양쪽에서 같은 정도로 읽히게 한다
  const tones = [`hsl(${hue} 58% 52%)`, `hsl(${hue} 45% 68%)`]

  return (
    // 감싸는 div가 원형을 만든다. svg에 직접 rounded-full을 주면 배경만 둥글어지고
    // 내부 <rect>는 잘리지 않아 네모난 무늬가 그대로 튀어나온다.
    <span
      aria-hidden="true"
      className="block shrink-0 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={`${-PADDING} ${-PADDING} ${GRID + PADDING * 2} ${GRID + PADDING * 2}`}
        width={size}
        height={size}
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        {cells.map((line, row) =>
          line.map((tone, col) => {
            if (tone === 0) return null
            const mirrored = GRID - 1 - col
            const fill = tones[tone - 1]
            const key = `${row}-${col}`
            return (
              <g key={key} fill={fill}>
                <rect x={col} y={row} width="1" height="1" />
                {/* 가운데 열(col 2)은 자기 자신이므로 겹쳐 그리지 않는다 */}
                {mirrored !== col && <rect x={mirrored} y={row} width="1" height="1" />}
              </g>
            )
          })
        )}
      </svg>
    </span>
  )
}
