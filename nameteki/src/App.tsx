import { useEffect, useMemo, useRef, useState } from 'react'

type Mode = 'STATIC' | 'SELF_EVAL' | 'CENTRAL_BANK' | 'VIRTUAL_CENTRAL_BANK'
type NodeKind = 'person' | 'company' | 'bank'
type Member = { id: string; name: string; kind: NodeKind; color: string; initials: string; role?: string; members?: string[] }
type EventRow = { id: number; title: string; detail: string; time: string; kind: 'trade' | 'system' | 'company' }
type ExplanationTopic = 'tank' | 'pipe' | 'flow' | 'model' | 'transaction' | 'company' | 'bank'
type PillarKey = 'flow' | 'investment' | 'propagation' | 'virtualization'
type EvolutionMode = 'SELF_EVAL' | 'CENTRAL_BANK' | 'VIRTUAL_CENTRAL_BANK'
type ExperienceMode = 'free' | 'scenario' | 'compare' | 'dynamics'
type Vocabulary = 'technical' | 'experience'
type ScenarioId = 'ichiro' | 'doctor'
type CompareSide = 'SECSY' | 'PICSY'

const explanations: Record<ExplanationTopic, { number: string; tab: string; title: string; body: string; note: string }> = {
  tank: {
    number: '01', tab: '水槽と貢献度', title: '水槽の水位は、その人に帰属する「貢献度」',
    body: '水の量 cᵢ は、ネットワーク全体の評価をたどったときに、価値が最終的に誰へどれだけ帰属するかを表します。合計は人数 N にそろえて正規化されます。誰かの努力点や、財布に入っているお金そのものではありません。',
    note: '貢献度は「人の価値」ではなく、この社会の評価のつながりから計算される相対的な値です。'
  },
  pipe: {
    number: '02', tab: 'パイプと評価', title: 'パイプは「誰の貢献を評価するか」',
    body: 'Eᵢⱼ は、メンバー i が自分の評価をメンバー j にどれだけ向けているか。矢印は i から j へ流れ、太さはその配分の大きさです。各行の合計が 1 なのは、ひとりの評価の持ち分を行き先に配分しきるためです。',
    note: 'ここでの「評価」は好き嫌いの点数ではなく、価値を配分するための比率です。'
  },
  flow: {
    number: '03', tab: '水の循環と定常状態', title: '水が巡り続け、流入と流出がつり合う',
    body: 'ある人への評価は、その人を評価する人たちの貢献度を通して価値を運びます。行列 E に沿って水を何度も送り出すと、この例では水位の分布が落ち着きます。その均衡が定常状態で、cE = c と表せます。',
    note: '矢印をたどるたびに価値が次の人へ伝わる——この反復をマルコフ過程として見ています。'
  },
  model: {
    number: '04', tab: 'この系が表すもの', title: '価値は、つながりの中で生まれ、帰属する',
    body: 'PICSYが考えるのは「価値を誰が生み、誰に帰属させるか」です。ひとりの働きだけでなく、評価を通じた人々のつながりをたどって、購買力の土台となる貢献を分配します。図は、価値が社会の中をどう伝わるかを考えるためのモデルです。',
    note: '現実の能力や人格を採点する図ではありません。評価のルールを変えると、価値の分布がどう変わるかを探ります。'
  },
  transaction: {
    number: '05', tab: '取引で何が変わる？', title: '取引は、価値の流れる経路を変える',
    body: '自己評価法では、買い手が売り手への評価を増やすと、評価行列の経路が変わります。その影響は取引相手だけにとどまらず、ネットワークを何度も巡り、定常状態の貢献度を変化させます。',
    note: '売り手への評価が高まると、売り手だけでなく、その人を評価している人々にも影響が伝わります。'
  },
  company: {
    number: '06', tab: 'カンパニー', title: 'カンパニーは、評価を受け取る窓口',
    body: '会社をひとつのノードとして扱うと、取引の相手を会社にまとめられます。仮想解体では、会社に集まった評価の先を創業者やメンバーへ展開し、価値の帰属先を見直します。',
    note: '会社ノードを選び、「カンパニーの仮想解体」から分配の変化を試せます。'
  },
  bank: {
    number: '07', tab: '中央銀行と分配', title: '中央銀行は、社会の基礎的な価値を配る',
    body: '中央銀行法では、メンバーの自己評価ではなく中央銀行への評価を予算の入口として使います。中央銀行の行から社会へ均等に配ることで、全員に共通の基礎分を与える考え方を表します。仮想中央銀行法では、その分配をネットワークに応じて個別化します。',
    note: '左のモードを切り替えると、分配ノードと評価の流れの違いを図で比べられます。'
  },
}

const pillars: Record<PillarKey, { label: string; title: string; body: string; example: string }> = {
  flow: {
    label: 'FLOW > STOCK', title: 'お金は溜まるものから、巡るものへ',
    body: '従来の貨幣（SECSY）は取引をスムーズにするための「流れ」に過ぎないはずでした。しかし貯蔵できる「ストック」として認識されたことで、フェティシズム（お金そのものへの執着）が生まれ、経済循環を停滞させます。PICSYは価値がフローとして流れ続ける仕組みを提案します。',
    example: 'ラーメン一杯 500円の価値は、店員・農家・出荷業者へと巡り続け、どこにも留まりません。',
  },
  investment: {
    label: 'EVERY TRANSACTION = INVESTMENT', title: 'すべての取引は、売り手への投資',
    body: 'PICSYでは、消費活動をすべて「売り手に対する現物出資」と捉えます。買い手は現物出資者として扱われ、取引相手の将来の成功が自分の購買力に還流します。これにより、レント（超過利潤）が一部に集中せず、ネットワークに薄く広く拡散します。',
    example: 'ラーメンを食べた客が将来大活躍すれば、ラーメン屋への評価が上がり、巡り巡ってあなたにも還元されます。',
  },
  propagation: {
    label: 'VALUE PROPAGATION', title: '価値は、サプライチェーンを伝播する',
    body: '社会全体の取引の連鎖は「評価行列」として記録され、その定常状態から「貢献度ベクトル」が導かれます。フローベースの貨幣なので、過去の取引履歴が購買力の基盤になります。',
    example: 'ラーメンの一杯には、出汁の鰹節業者・漁師・船の燃料へと続く取引の連鎖が埋め込まれています。',
  },
  virtualization: {
    label: 'COMPANIES → VIRTUAL', title: 'カンパニーは仮想的な窓口',
    body: '既存の社会では会社が資本を集約しますが、PICSYの「カンパニー」は価値を通過させるだけのインターフェイスです。背後の創業者・従業員・取引先に評価を分配するための仕組みで、いつでも仮想解体できます。',
    example: 'ラーメン屋（カンパニー）への評価は、いつでも店主・食材業者・配達員へと展開できます。',
  },
}

const applications = [
  { tag: '地域通貨', title: 'コミュニティ内の信頼で回るお金', body: 'LETSのような補完通貨は既存通貨の置き換えには至りません。PICSYは投資の性質を持つことで、根幹から置き換えを狙います。' },
  { tag: '社内通貨・チーム', title: '企業内で「他者への貢献」が可視化される', body: 'メンバーが他者を育てると自分の購買力が増えるので、教育・サポート・情報共有が報酬化されます。' },
  { tag: '寄付・知識社会', title: '寄付・OSS・無償コンテンツの評価', body: '趣味で作った無料のものがリミックスされて大きな価値を生んだとき、その貢献が後から還流し続けます。' },
]

function CompareRow({ row, focused }: { row: { label: string; secsy: string; picsy: string }; focused: CompareSide }) {
  return (
    <>
      <div className="compare-cell compare-row-head">{row.label}</div>
      <div className={`compare-cell secsy ${focused === 'SECSY' ? 'focused' : ''}`}>{row.secsy}</div>
      <div className={`compare-cell picsy ${focused === 'PICSY' ? 'focused' : ''}`}>{row.picsy}</div>
    </>
  )
}

function AnimatedNumber({ value, digits = 2 }: { value: number; digits?: number }) {
  const [display, setDisplay] = useState(value)
  const previous = useRef(value)
  useEffect(() => {
    const start = previous.current
    const end = value
    if (Math.abs(end - start) < 0.001) {
      setDisplay(end)
      previous.current = end
      return
    }
    const duration = 900
    const startTime = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      const next = start + (end - start) * eased
      setDisplay(next)
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    previous.current = end
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <span>{display.toFixed(digits)}</span>
}

const evolutionStages: { id: EvolutionMode; step: string; status: 'legacy' | 'improved' | 'best'; title: string; subtitle: string; issue: string; solution: string; result: string; whyItMatters: string; preview: { who: string; do: string; rule: string }; deepDive: string }[] = [
  {
    id: 'SELF_EVAL', step: 'STAGE 01', status: 'legacy',
    title: '自己評価法', subtitle: '基本モデル',
    issue: '購買力や価格が、自分や相手の過去の評価・取引量に依存する',
    solution: '—',
    result: '架空取引で自分に有利な状況を作り込めてしまう脆弱性',
    whyItMatters: '「取引ごとに誰がいくら払うか」が、買い手と売り手の過去の評価に左右される。フレキシブルだが、操作の余地が大きい。',
    preview: { who: '買い手 b', do: '自分の予算から売り手 s へ評価を移す', rule: 'E_bb を削り、E_bs を増やす' },
    deepDive: '定価 δ は、売り手の貢献度の前後差 c_s^{t+1} − c_s^t として定義されます。売り手 s の自己評価（予算制約）が高いほど、定価は低く抑えられる——つまり「高く評価してくれる人ほど、安く買える」構造です。',
  },
  {
    id: 'CENTRAL_BANK', step: 'STAGE 02', status: 'improved',
    title: '中央銀行法', subtitle: '改善モデル',
    issue: '自己評価法の「架空取引に弱い」という欠点',
    solution: '中央銀行という予算の入口を導入し、定価 δ = α·c_b 、購買力 E_b0·c_b へと単純化',
    result: '計算は直感的になるが、自然回収のたびにコミュニティ全体の貢献度が引き下げられる',
    whyItMatters: '中央銀行に行が均等に配られるため、誰もが等しい基盤（ソーシャルミニマム）から始められる。ただし「中央銀行という実体」が存在することが新たな副作用を生む。',
    preview: { who: '中央銀行 0', do: '自然回収された予算を等分配で全員へ', rule: 'E_0i = 1/N を全員に与える' },
    deepDive: '中央銀行法では自然回収で集めた予算を中央銀行に溜め、そこから E_0i = 1/N で社会へ戻します。貧富の差を縮め、死んだメンバーの貢献度を徐々にフェードアウトできる一方、回収のたびに全体の購買力が減るというデメリットが生まれます。',
  },
  {
    id: 'VIRTUAL_CENTRAL_BANK', step: 'STAGE 03', status: 'best',
    title: '仮想中央銀行法', subtitle: '完成モデル',
    issue: '中央銀行という実体が存在することで起きる悪影響',
    solution: '中央銀行を計算上だけ存在させ、対角成分ゼロの分配行列 D で個別化',
    result: '中央銀行法の利点（計算の単純さ）を保ちつつ、デメリットを取り除く',
    whyItMatters: '「中央銀行ノード」をあえて置かず、計算上だけ分配行列 D を作用させる。自己ループ（自分自身への配分）を排除することで、評価が他のメンバーへなめらかに流れ続ける。',
    preview: { who: '仮想中央銀行', do: '分配行列 D でパーソナライズされた基礎分を配る', rule: 'E′ = E − B + B·D/(N−1)' },
    deepDive: '単純に中央銀行を仮想解体すると、各メンバーが自分自身への自己ループを持ってしまいます。対角成分がゼロの D を掛けることで「自分以外のメンバー」へだけソーシャルミニマムを配り、自己評価を温存できます。これにより、中央銀行法の利点を保ちながら「実体を持つ中央銀行」のデメリットを消します。',
  },
]

const colors = ['#4d9e82', '#e3a64b', '#7e80be', '#e17461', '#5196aa', '#b57a9e']
const initialNodes: Member[] = [
  { id: 'aoi', name: '佐藤', kind: 'person', color: colors[0], initials: '佐' },
  { id: 'ren', name: '田中', kind: 'person', color: colors[1], initials: '田' },
  { id: 'yui', name: '鈴木', kind: 'person', color: colors[2], initials: '鈴' },
  { id: 'haru', name: '高橋', kind: 'person', color: colors[3], initials: '高' },
]
const initialMatrix = [
  [0.36, 0.34, 0.20, 0.10],
  [0.18, 0.38, 0.27, 0.17],
  [0.24, 0.18, 0.36, 0.22],
  [0.21, 0.29, 0.18, 0.32],
]
const modes: { id: Mode; label: string; short: string; icon: string }[] = [
  { id: 'STATIC', label: '静的モデル', short: '01', icon: '◉' },
  { id: 'SELF_EVAL', label: '自己評価法', short: '02', icon: '↗' },
  { id: 'CENTRAL_BANK', label: '中央銀行法', short: '03', icon: '⌂' },
  { id: 'VIRTUAL_CENTRAL_BANK', label: '仮想中央銀行法', short: '04', icon: '⟳' },
]

type ScenarioPhase = {
  id: string
  label: string
  chapter: string
  year: string
  nodes: Member[]
  matrix: number[][]
  timeStep: number
  narration: { title: string; body: string; highlight?: string }
  effects?: { id: string; pulse?: 'low' | 'medium' | 'high'; rippleFrom?: string }[]
  actions?: { id: string; label: string; icon?: string; tone?: 'default' | 'positive' | 'negative'; description: string; apply: (state: { nodes: Member[]; matrix: number[][]; events: EventRow[]; addEvent: (title: string, detail: string, kind: EventRow['kind']) => void }) => { nodes?: Member[]; matrix?: number[][]; timeStep?: number; flash?: 'positive' | 'negative' | 'propagation' } }[]
  autoAdvanceMs?: number
  outcomes?: { id: string; label: string; delta: number }[]
}

function rowIndex(target: number) {
  return target
}

const ichiroScenario = (): { id: ScenarioId; title: string; subtitle: string; tag: string; premise: string; outro?: string; phases: ScenarioPhase[] } => {
  const ramenShopMembersPhase1: Member[] = [
    { id: 'ichiro', name: 'イチロー', role: '高校生の消費者', kind: 'person', color: '#cfb88a', initials: '一' },
    { id: 'shop', name: '田中食堂', role: 'ラーメン店', kind: 'company', color: '#dba754', initials: '田', members: ['root', 'noodle', 'fish'] },
    { id: 'root', name: '田中', role: '店主', kind: 'person', color: '#7e80be', initials: '田' },
    { id: 'noodle', name: '松本製麺所', role: '製麺所', kind: 'company', color: '#5196aa', initials: '松', members: ['wheat', 'miller'] },
    { id: 'fish', name: '山川鰹節店', role: '出汁メーカー', kind: 'company', color: '#b57a9e', initials: '山', members: ['fisher'] },
    { id: 'wheat', name: '小林', role: '小麦農家', kind: 'person', color: '#7e80be', initials: '小' },
    { id: 'miller', name: '鈴木', role: '製粉所', kind: 'person', color: '#7e80be', initials: '鈴' },
    { id: 'fisher', name: '佐藤', role: '漁師', kind: 'person', color: '#7e80be', initials: '佐' },
  ]
  const ramenShopMembersPhase2: Member[] = ramenShopMembersPhase1.map((node) => node.id === 'ichiro' ? { ...node, name: 'イチロー', role: 'メジャーリーガー', color: '#e3a64b' } : node)
  const ramenShopMembersPhase3: Member[] = ramenShopMembersPhase1.map((node) => node.id === 'ichiro' ? { ...node, name: 'イチロー', role: '歴史的高貢献者', color: '#6b9678' } : node)
  const evenMatrix = (n: number) => Array.from({ length: n }, () => Array(n).fill(1 / n))
  const ramenRows = 8
  const chapter1 = evenMatrix(ramenRows)
  // Ichiro — 初の来店（まだ評価はほぼ均等。彼自身はまだ社会に価値を提供していない）
  chapter1[0][1] = 0.4; chapter1[0][0] = 0.1; chapter1[0][2] = 0.25; chapter1[0][3] = 0.25
  // 田中 — 製麺所・鰹節店・イチローへの小さな評価
  chapter1[2][3] = 0.45; chapter1[2][0] = 0.1; chapter1[2][1] = 0.1; chapter1[2][2] = 0.05; chapter1[2][4] = 0.3
  // 麺工房 — 小麦農家 / 製粉所
  chapter1[3][5] = 0.4; chapter1[3][6] = 0.3; chapter1[3][4] = 0.2; chapter1[3][3] = 0.1
  // 鰹節 — 漁師
  chapter1[4][7] = 0.55; chapter1[4][1] = 0.15; chapter1[4][4] = 0.2; chapter1[4][3] = 0.1
  // 残りの行は均等
  chapter1[5][5] = 0.45; chapter1[5][3] = 0.3; chapter1[5][6] = 0.15; chapter1[5][0] = 0.1
  chapter1[6][5] = 0.4; chapter1[6][6] = 0.25; chapter1[6][3] = 0.25; chapter1[6][0] = 0.1
  chapter1[7][4] = 0.5; chapter1[7][7] = 0.2; chapter1[7][1] = 0.2; chapter1[7][0] = 0.1

  // フェーズ2: イチローがメジャーへ昇格 → 評価ネットワークの「外部」から大量の価値が彼に流れ込み、彼の c が急増
  // → その変化が過去に彼を評価していたノード群（ラーメン屋・麺工房・鰹節）へ還流する
  const chapter2 = chapter1.map((row) => row.slice())
  // イチロ自身の c が高まる → 彼の行を偏らせる（外界が彼を支える構図）
  chapter2[0] = [0.45, 0.18, 0.12, 0.1, 0.05, 0.05, 0.03, 0.02]
  // 田中のイチローへの評価が上昇（かつての常連がスターになった）
  chapter2[2][0] = 0.32
  // 麺工房・鰹節のイチローへの評価も上昇
  chapter2[3][0] = 0.22
  chapter2[4][0] = 0.18

  // フェーズ3: 波及が落ち着き、定常状態へ近づく（各ノードの c が底上げされ、偏りが緩む）
  const chapter3 = chapter2.map((row, i) => row.map((value, j) => {
    if (i === 0 || j === 0) return value
    if (i === j) return Math.max(value, 0.15)
    return Math.min(0.4, value + 0.05)
  }))

  return {
    id: 'ichiro',
    title: 'イチローとラーメン屋',
    subtitle: '未来への投資と価値の伝播',
    tag: 'STORY · CHAPTER 04',
    premise: '無名の高校生のイチローが、よく通っていたラーメン屋で身体を鍛え、その後メジャーリーガーとして大活躍する——そのときラーメン屋と、サプライチェーン全体はどうなるか。',
    phases: [
      {
        id: 'daily', label: '日常の取引', chapter: 'PHASE 01', year: '高校時代', timeStep: 4, nodes: ramenShopMembersPhase1, matrix: chapter1,
        narration: {
          title: '500円のラーメンが、投資になる',
          body: 'イチローが初めてラーメン屋にやってきました。500円のラーメンを食べる——PICSYではこれは田中への小さな出資。',
          highlight: '買い手（イチロー）の自己評価が、売り手（田中）への評価へと静かに移ります。'
        },
        effects: [{ id: 'ichiro', pulse: 'low' }, { id: 'shop' }],
        actions: [
          {
            id: 'sell-ramen', label: 'ラーメンを売る', icon: '◴', description: 'イチローがラーメンを食べる。買い手（イチロー）の予算から、売り手（田中）への評価へと移ります。',
            apply: ({ matrix, addEvent }) => {
              if (!matrix.length) return {}
              const next = matrix.map((row) => row.slice())
              const ichiroIndex = 0
              const shopIndex = 1
              const transfer = 0.05
              next[ichiroIndex][ichiroIndex] = Math.max(0.05, (next[ichiroIndex][ichiroIndex] ?? 0) - transfer)
              next[ichiroIndex][shopIndex] = Math.min(0.7, (next[ichiroIndex][shopIndex] ?? 0) + transfer)
              addEvent('ラーメンを提供', '田中食堂 → 高校生・500円', 'trade')
              return { matrix: next, timeStep: 5, flash: 'positive' }
            },
          },
          {
            id: 'eat-repeatedly', label: '通算 5人前', icon: '◵', description: '毎日のように通ってくれた常連さん。通算5人前ぶんの評価が、店主と材料業者へ静かに積み上がります。',
            apply: ({ matrix, addEvent }) => {
              if (!matrix.length) return {}
              const next = matrix.map((row) => row.slice())
              next[0][1] = Math.min(0.7, (next[0][1] ?? 0) + 0.12)
              next[0][2] = Math.min(0.45, (next[0][2] ?? 0) + 0.05)
              next[0][3] = Math.min(0.45, (next[0][3] ?? 0) + 0.05)
              addEvent('常連の出現', '田中食堂への通算投資 +5人前', 'trade')
              return { matrix: next, timeStep: 8, flash: 'positive' }
            },
          },
        ],
      },
      {
        id: 'future', label: '未来の変化', chapter: 'PHASE 02', year: 'メジャー昇格', timeStep: 28, nodes: ramenShopMembersPhase2, matrix: chapter2,
        narration: {
          title: 'イチローが、社会で大活躍',
          body: '数年後、イチローはメジャーリーガーとして社会に大きな価値を提供し始めます。彼の貢献度が急上昇し、評価行列を通じて過去に彼を「出資」した人々に波及します。',
          highlight: 'ラーメンを食べた側の価値上昇が、食べた場所にまで戻ってくる。'
        },
        effects: [{ id: 'ichiro', pulse: 'high', rippleFrom: 'ichiro' }],
        actions: [
          {
            id: 'major-debut', label: 'メジャーリーグで大活躍！', icon: '✦', description: 'イチローの社会的貢献度が急上昇します。タンクが眩く発光——これがサプライチェーン全体への波及の引き金です。',
            apply: ({ matrix, addEvent }) => {
              if (!matrix.length) return {}
              const next = matrix.map((row) => row.slice())
              next[0] = [0.45, 0.18, 0.12, 0.1, 0.05, 0.05, 0.03, 0.02]
              addEvent('メジャー昇格', 'イチロー — 社会的貢献度が急上昇', 'system')
              return { matrix: next, nodes: ramenShopMembersPhase2, timeStep: 30, flash: 'propagation' }
            },
          },
          {
            id: 'time-skip', label: '時間を早送り（数年後）', icon: '↻', description: '5年間分の取引をまとめてシミュレート。イチローの価値はサプライチェーン全体に到達します。',
            apply: ({ matrix, addEvent }) => {
              if (!matrix.length) return {}
              const next = matrix.map((row, i) => row.map((value, j) => (i === j ? Math.min(0.55, value + 0.05) : Math.min(0.7, value + 0.03))))
              addEvent('時間の早送り', '5年間分を圧縮', 'system')
              return { matrix: next, nodes: ramenShopMembersPhase3, timeStep: 36, flash: 'propagation' }
            },
          },
        ],
      },
      {
        id: 'propagation', label: '伝播の発生', chapter: 'PHASE 03', year: '波及のあと', timeStep: 52, nodes: ramenShopMembersPhase3, matrix: chapter3,
        narration: {
          title: 'ラーメンの一杯が、農家と製粉所まで届く',
          body: '価値の波紋は、麺工房・鰹節業者・小麦農家・漁師へと広がります。一杯のラーメンが、サプライチェーン全体を潤しました。',
          highlight: 'PICSYでは「過去に出資した相手」の活躍が、自分の将来を潤します。'
        },
        effects: [{ id: 'ichiro', pulse: 'high', rippleFrom: 'ichiro' }, { id: 'shop', pulse: 'high' }, { id: 'noodle', pulse: 'high' }, { id: 'fish', pulse: 'high' }, { id: 'wheat', pulse: 'medium' }, { id: 'fisher', pulse: 'medium' }, { id: 'miller', pulse: 'medium' }],
        actions: [
          {
            id: 'observe', label: 'サプライチェーンを眺める', icon: '◉', description: 'ラーメン屋・麺工房・鰹節・農家・漁師——かつての取引相手が次々と潤っていく様子を観察できます。',
            apply: ({ addEvent }) => {
              addEvent('サプライチェーン観察', '取引履歴が巡って価値が還流', 'system')
              return { timeStep: 60, flash: 'positive' }
            },
          },
        ],
        outcomes: [
          { id: 'shop', label: 'ラーメン屋', delta: 0.6 },
          { id: 'noodle', label: '麺工房', delta: 0.4 },
          { id: 'fish', label: '鰹節', delta: 0.35 },
          { id: 'wheat', label: '小麦農家', delta: 0.18 },
          { id: 'fisher', label: '漁師', delta: 0.16 },
        ],
      },
    ],
  }
}

const doctorScenario = (choice: 'good' | 'bad'): { id: ScenarioId; title: string; subtitle: string; tag: string; premise: string; outro: string; phases: ScenarioPhase[] } => {
  const baseNodes: Member[] = [
    { id: 'doctor', name: choice === 'good' ? '良い医者・加藤' : '悪い医者・加藤', kind: 'person', color: choice === 'good' ? '#4d9e82' : '#e17461', initials: choice === 'good' ? '良' : '悪' },
    { id: 'patient', name: '佐々木', role: '患者', kind: 'person', color: '#e3a64b', initials: '佐' },
    { id: 'clinic', name: '加藤クリニック', kind: 'company', color: choice === 'good' ? '#7e80be' : '#dba754', initials: choice === 'good' ? '診' : '薬', members: ['doctor'] },
    { id: 'pharma', name: '製薬会社', kind: 'company', color: '#5196aa', initials: '薬', members: ['staff'] },
    { id: 'staff', name: '製薬スタッフ', kind: 'person', color: '#b57a9e', initials: 'ス' },
  ]
  const n = baseNodes.length
  const phase1 = Array.from({ length: n }, () => Array(n).fill(1 / n))
  // 医者 — 患者へ治療（評価）
  phase1[0][1] = choice === 'good' ? 0.45 : 0.15
  phase1[0][2] = choice === 'good' ? 0.2 : 0.5
  phase1[0][0] = 0.15
  phase1[0][3] = 0.2
  // 患者 — 医者へ感謝、製薬会社へ
  phase1[1][0] = choice === 'good' ? 0.5 : 0.2
  phase1[1][3] = choice === 'good' ? 0.2 : 0.55
  phase1[1][1] = 0.15
  phase1[1][2] = 0.15
  // クリニック
  phase1[2][0] = choice === 'good' ? 0.4 : 0.55
  phase1[2][3] = 0.3
  phase1[2][2] = 0.15
  phase1[2][1] = 0.15
  // 製薬会社 — スタッフへ
  phase1[3][4] = choice === 'good' ? 0.4 : 0.5
  phase1[3][1] = 0.2
  phase1[3][2] = choice === 'good' ? 0.15 : 0.25
  phase1[3][3] = 0.15
  phase1[3][0] = 0.1
  // スタッフ
  phase1[4][3] = 0.4
  phase1[4][2] = 0.25
  phase1[4][4] = 0.2
  phase1[4][1] = 0.15

  // フェーズ2 — 短期（5ヶ月後）: 悪い医者 = 即座に売上。良い医者 = 控えめな売上
  const phase2 = phase1.map((row) => row.slice())
  // 患者が医者への評価を変化（5ヶ月後のスナップショット）
  phase2[1][0] = choice === 'good' ? 0.3 : 0.1
  phase2[1][3] = choice === 'good' ? 0.1 : 0.7
  phase2[2][0] = choice === 'good' ? 0.25 : 0.65
  phase2[3][2] = choice === 'good' ? 0.2 : 0.45

  // フェーズ3 — 長期（5年後）: 良い医者の患者が社会で大活躍し、医者に還流
  const phase3 = phase2.map((row) => row.slice())
  // 患者の貢献度が上がる → 医者への還流が増える
  phase3[1][0] = choice === 'good' ? 0.65 : 0.05
  phase3[1][3] = choice === 'good' ? 0.05 : 0.85
  phase3[2][0] = choice === 'good' ? 0.55 : 0.2
  phase3[3][2] = choice === 'good' ? 0.1 : 0.6

  return {
    id: 'doctor',
    title: '良い医者 vs 悪い医者',
    subtitle: '経済インセンティブの長期逆転',
    tag: 'STORY · CHAPTER 04',
    premise: '患者の将来が、医者自身の購買力を決める。短期の利益と長期の還流——どちらが勝つか。',
    outro: choice === 'good' ? '良い医者は、5年後に大きな還流を受け取る。' : '悪い医者は、短期の売上を得るが、長期的には伸び悩む。',
    phases: [
      {
        id: 'short', label: '短期（5ヶ月後）', chapter: 'PHASE 01', year: '5ヶ月後', timeStep: 6, nodes: baseNodes, matrix: phase2,
        narration: {
          title: choice === 'good' ? '良い医者の売上は控えめ' : '悪い医者は即座に売上を得る',
          body: choice === 'good' ? '無駄な薬を売らないので、目先の売上は少ない。患者は感謝しているが、評価の連鎖が小さい。' : '薬をたくさん処方するので、目先の売上は大きい。患者の感謝は薄い。',
          highlight: choice === 'good' ? '短期的には損をしているように見える。' : '短期的には儲かっているように見える。'
        },
        effects: [{ id: 'doctor', pulse: choice === 'good' ? 'low' : 'high' }, { id: 'pharma', pulse: choice === 'good' ? 'low' : 'high' }],
        actions: [
          {
            id: 'prescribe', label: choice === 'good' ? '薬を処方する（最小限）' : '過剰な薬を処方する', icon: choice === 'good' ? '◔' : '◐', tone: choice === 'good' ? 'positive' : 'negative',
            description: choice === 'good' ? '必要な分だけを処方。患者の体を守りますが、目先の売上は増えません。' : '大量に処方して短期の売上を獲得しますが、患者の体は弱ります。',
            apply: ({ matrix, addEvent }) => {
              if (!matrix.length) return {}
              const next = matrix.map((row) => row.slice())
              if (choice === 'bad') {
                next[0][2] = Math.min(0.7, (next[0][2] ?? 0) + 0.12)
                next[2][3] = Math.min(0.55, (next[2][3] ?? 0) + 0.08)
                addEvent('薬を大量処方', '悪い医者 — 短期売上を獲得', 'trade')
                return { matrix: next, timeStep: 8, flash: 'negative' }
              }
              next[0][1] = Math.min(0.7, (next[0][1] ?? 0) + 0.18)
              addEvent('最小限の処方', '良い医者 — 患者の回復を優先', 'trade')
              return { matrix: next, timeStep: 8, flash: 'positive' }
            },
          },
          {
            id: 'cure', label: '根本治療に切り替える', icon: '✦', tone: choice === 'good' ? 'positive' : 'negative',
            description: choice === 'good' ? '病気の原因を取り除きます。患者は元気になりますが、薬屋の売上は減ります。' : '対症療法だけ。患者は薬漬けのままです。',
            apply: ({ matrix, addEvent }) => {
              if (!matrix.length) return {}
              const next = matrix.map((row) => row.slice())
              if (choice === 'good') {
                next[0][1] = Math.min(0.7, (next[0][1] ?? 0) + 0.25)
                next[2][3] = Math.max(0.05, (next[2][3] ?? 0) - 0.1)
                addEvent('根本治療', '良い医者 — 患者が回復', 'system')
                return { matrix: next, timeStep: 10, flash: 'positive' }
              }
              next[0][1] = Math.max(0.05, (next[0][1] ?? 0) - 0.1)
              next[2][3] = Math.min(0.65, (next[2][3] ?? 0) + 0.15)
              addEvent('対症療法', '悪い医者 — 患者は薬漬け', 'system')
              return { matrix: next, timeStep: 10, flash: 'negative' }
            },
          },
        ],
      },
      {
        id: 'long', label: '長期（5年後）', chapter: 'PHASE 02', year: '5年後', timeStep: 32, nodes: baseNodes, matrix: phase3,
        narration: {
          title: choice === 'good' ? '患者の活躍が医者に還る' : '患者の貢献度が伸びず、医者にも届かない',
          body: choice === 'good' ? '元気になった患者は将来、社会に多くの価値を提供。その貢献度が巡り巡って医者の購買力を押し上げる。' : '不必要な薬漬けで体が弱った患者は、将来の活躍が難しい。医者への還流も増えない。',
          highlight: choice === 'good' ? 'PICSYは「相手の未来を応援する」インセンティブを自然に作る。' : '短期的な売上は得ても、長期的な購買力は伸び悩む。'
        },
        effects: choice === 'good'
          ? [{ id: 'patient', pulse: 'high', rippleFrom: 'patient' }, { id: 'doctor', pulse: 'high' }]
          : [{ id: 'patient', pulse: 'low' }, { id: 'doctor', pulse: 'medium' }],
        actions: [
          {
            id: 'natural-recovery', label: '自然回収を進める', icon: '↻', description: '時間経過で発動する自然回収（γ）。患者の貢献度が落ちれば医者にも影響が伝わり、最終的な水位が逆転します。',
            apply: ({ matrix, addEvent }) => {
              if (!matrix.length) return {}
              const next = matrix.map((row) => row.slice())
              const reserve = rowIndex(1)
              next.forEach((row, i) => {
                const rate = 0.12
                row.forEach((value, j) => {
                  if (j === reserve) next[i][j] = Math.min(0.45, value + rate * (1 - value))
                  else next[i][j] = Math.max(0.02, value * (1 - rate))
                })
              })
              addEvent('自然回収', '全体から少しずつ回収・再分配', 'system')
              return { matrix: next, timeStep: 38, flash: choice === 'good' ? 'positive' : 'negative' }
            },
          },
          {
            id: 'observe-balance', label: '長期のバランスを見る', icon: '◉', description: '良い医者と悪い医者の水槽を並べて見ると、長期的にどちらが潤っているかがはっきり分かります。',
            apply: ({ addEvent }) => {
              addEvent('長期比較', '良い医者 vs 悪い医者', 'system')
              return { timeStep: 42, flash: choice === 'good' ? 'positive' : 'negative' }
            },
          },
        ],
        outcomes: choice === 'good'
          ? [
              { id: 'doctor', label: '良い医者の残高', delta: 0.42 },
              { id: 'patient', label: '患者の活躍', delta: 0.58 },
            ]
          : [
              { id: 'doctor', label: '悪い医者の残高', delta: -0.15 },
              { id: 'patient', label: '患者の停滞', delta: -0.18 },
            ],
      },
    ],
  }
}



const vocabularyMap: Record<string, { technical: string; experience: string }> = {
  'E_{ij}': { technical: '評価行列 Eᵢⱼ', experience: '「誰を信頼するか」の配分' },
  'c_i': { technical: '貢献度 cᵢ', experience: '「ありがとう」の蓄積' },
  'δ': { technical: '定価 δ', experience: '売り手の元気になる分' },
  'γ': { technical: '自然回収率 γ', experience: 'みんなの財布に均等に戻る割合' },
  'タンク': { technical: '貢献度タンク', experience: 'みんなの感謝がたまる入れ物' },
  'パイプ': { technical: '評価のパイプ', experience: '信頼のつながり' },
  '予算制約': { technical: '予算制約 Eᵢᵢ', experience: '今月使える信頼の枠' },
  '購買力': { technical: '購買力', experience: 'お買い物で使える力' },
  '中央銀行': { technical: '中央銀行', experience: 'みんなの共通財布' },
}

const compareRows: { label: string; secsy: string; picsy: string }[] = [
  { label: '取引の性質', secsy: '1対1で完結する売買', picsy: '相手の未来への「投資」' },
  { label: 'レント（超過利潤）', secsy: '資本家に集中する', picsy: 'ネットワーク全体に拡散' },
  { label: '企業の扱い', secsy: '利益と購買力を蓄積する実体', picsy: '価値を背後へ分配する窓口' },
  { label: '貯蓄', secsy: '溜め込むほど有利', picsy: '自然回収で循環が促される' },
  { label: '価値の行方', secsy: '滞留・偏在する', picsy: 'サプライチェーンを伝播' },
]

const dynamicCommunityNodes: Member[] = [
  { id: 'mina', name: '佐藤', role: 'パン職人', kind: 'person', color: '#d69c55', initials: '佐' },
  { id: 'taku', name: '田中', role: '店主', kind: 'person', color: '#5d9b82', initials: '田' },
  { id: 'sora', name: '鈴木', role: '農家', kind: 'person', color: '#7c85b9', initials: '鈴' },
  { id: 'haru', name: '高橋', role: '配達員', kind: 'person', color: '#cb7c69', initials: '高' },
  { id: 'ao', name: '伊藤', role: 'デザイナー', kind: 'person', color: '#5196aa', initials: '伊' },
  { id: 'riku', name: '山本', role: '住民', kind: 'person', color: '#ae7e9b', initials: '山' },
  { id: 'pool', name: 'ソーシャルミニマム', role: '一時的な再分配窓口', kind: 'bank', color: '#8a9c78', initials: 'SM' },
]

const dynamicInitialMatrix = [
  [0.12, 0.24, 0.16, 0.20, 0.12, 0.11, 0.05],
  [0.16, 0.18, 0.22, 0.18, 0.12, 0.09, 0.05],
  [0.12, 0.18, 0.18, 0.17, 0.18, 0.12, 0.05],
  [0.14, 0.16, 0.16, 0.20, 0.15, 0.14, 0.05],
  [0.12, 0.20, 0.14, 0.18, 0.17, 0.14, 0.05],
  [0.13, 0.18, 0.15, 0.19, 0.16, 0.14, 0.05],
  [0.22, 0.17, 0.18, 0.18, 0.15, 0.10, 0],
]

function buildDynamicWorld(rule: EvolutionMode) {
  const people = dynamicCommunityNodes.filter((node) => node.kind !== 'bank')
  const count = people.length
  const peopleMatrix = dynamicInitialMatrix.slice(0, count).map((row) => row.slice(0, count))
  if (rule !== 'CENTRAL_BANK') return { nodes: people, matrix: normalizeRows(peopleMatrix) }

  const bankNode: Member = { id: 'pool', name: '中央銀行', role: '実体を持つ分配主体', kind: 'bank', color: '#8a9c78', initials: '銀' }
  const reserveShare = 0.2
  const rows = peopleMatrix.map((row, i) => {
    const eligible = row.map((value, j) => j === i ? 0 : value)
    const sum = eligible.reduce((total, value) => total + value, 0) || 1
    return eligible.map((value) => value / sum * (1 - reserveShare)).concat(reserveShare)
  })
  const centralBankRow = Array(count).fill(1 / count).concat(0)
  return { nodes: [...people, bankNode], matrix: [...rows, centralBankRow] }
}

type DynamicSnapshot = { time: number; values: number[]; matrix: number[][]; event: string }

function normalizeRows(matrix: number[][]) {
  return matrix.map((row) => {
    const sum = row.reduce((acc, value) => acc + value, 0) || 1
    return row.map((value) => value / sum)
  })
}

function virtualizedEvaluationMatrix(matrix: number[][]) {
  const n = matrix.length
  if (n < 2) return matrix
  let d: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? 0 : 1))
  let effective = matrix
  for (let iteration = 0; iteration < 8; iteration += 1) {
    // B contains the self-evaluation budget on its diagonal. D has zero diagonal
    // and each row sums to N-1, so B D/(N-1) redistributes that budget to others.
    effective = matrix.map((row, i) => row.map((value, j) => {
      const budget = matrix[i][i] ?? 0
      return value - (i === j ? budget : 0) + (budget * d[i][j]) / (n - 1)
    }))
    const c = stationary(effective)
    d = Array.from({ length: n }, (_, i) => {
      const weights = Array.from({ length: n }, (_, j) => j === i ? 0 : 1 / Math.max(0.15, c[j] ?? 0))
      const sum = weights.reduce((total, value) => total + value, 0) || 1
      return weights.map((weight) => weight === 0 ? 0 : ((n - 1) * weight) / sum)
    })
  }
  return effective
}

function communityContributionVector(matrix: number[][], nodes: Member[], rule: EvolutionMode = 'SELF_EVAL') {
  if (nodes.some((node) => node.kind === 'bank')) return stationary(matrix)
  return stationary(rule === 'VIRTUAL_CENTRAL_BANK' ? virtualizedEvaluationMatrix(matrix) : matrix)
}

function collectAndRedistribute(matrix: number[][], nodes: Member[], rate: number, rule: EvolutionMode) {
  const pool = nodes.findIndex((node) => node.kind === 'bank')
  if (rule === 'CENTRAL_BANK' && pool >= 0) {
    return matrix.map((row, i) => {
      if (i === pool) return row.slice()
      const next = row.map((value, j) => j === pool ? value + rate * (1 - row[pool]) : value * (1 - rate))
      return next
    })
  }
  // Self-evaluation and virtual-central-bank modes use the same natural
  // recovery rule. Virtualization happens in E′ when computing c, not via an actor.
  return matrix.map((row, i) => {
    const next = row.slice()
    const selfShare = next[i] ?? 0
    next.forEach((value, j) => {
      if (j !== i) next[j] = value * (1 - rate)
    })
    next[i] = selfShare + rate * (1 - selfShare)
    return next
  })
}

function raiseInfluence(matrix: number[][], nodes: Member[], personId: string, rule: EvolutionMode) {
  const target = nodes.findIndex((node) => node.id === personId)
  const pool = nodes.findIndex((node) => node.kind === 'bank')
  if (target < 0) return matrix
  const next = matrix.map((row) => row.slice())
  next.forEach((row, i) => {
    if (i === target || i === pool) return
    const source = rule === 'CENTRAL_BANK' ? pool : i
    const amount = Math.min(0.085, row[source] * 0.7)
    row[source] -= amount
    row[target] += amount
  })
  // 佐藤自身は、作り手として仕入先・仲間へ価値を戻す。
  // 中央銀行法では対角成分が0なので、ほかの評価先から移す。
  if (rule === 'CENTRAL_BANK') {
    const donor = nodes.findIndex((node, index) => node.kind !== 'bank' && index !== target)
    if (donor >= 0) next[target][donor] = Math.max(0, next[target][donor] - 0.04)
  } else {
    next[target][target] = Math.max(0.05, next[target][target] - 0.04)
  }
  next[target][2] += 0.02
  next[target][3] += 0.02
  const sum = next[target].reduce((acc, value) => acc + value, 0) || 1
  next[target] = next[target].map((value) => value / sum)
  return normalizeRows(next)
}

function randomAgentActivity(matrix: number[][], nodes: Member[], intensity: number) {
  const people = nodes.map((node, index) => ({ node, index })).filter(({ node }) => node.kind !== 'bank')
  const pool = nodes.findIndex((node) => node.kind === 'bank')
  if (people.length < 2) return { matrix, event: 'エージェントが活動できる相手を待っています。', focus: [] as string[] }

  const next = matrix.map((row) => row.slice())
  const activities = 1 + Math.floor(intensity * 2)
  const notes: string[] = []
  const focus = new Set<string>()
  for (let activity = 0; activity < activities; activity += 1) {
    const buyerRecord = people[Math.floor(Math.random() * people.length)]
    const sellerCandidates = people.filter(({ index }) => index !== buyerRecord.index)
    const sellerRecord = sellerCandidates[Math.floor(Math.random() * sellerCandidates.length)]
    if (!buyerRecord || !sellerRecord) continue

    const row = next[buyerRecord.index]
    const usesPool = pool >= 0 && row[pool] >= 0.025
    const sourceIndex = usesPool ? pool : buyerRecord.index
    const amount = Math.min(row[sourceIndex] * 0.45, 0.018 + Math.random() * 0.035 * (0.7 + intensity))
    if (amount <= 0.001) continue
    row[sourceIndex] -= amount
    row[sellerRecord.index] += amount
    notes.push(`${usesPool ? '購入' : '評価'} ${buyerRecord.node.name} → ${sellerRecord.node.name}`)
    focus.add(buyerRecord.node.id)
    focus.add(sellerRecord.node.id)
  }

  return {
    matrix: normalizeRows(next),
    event: notes.length ? `エージェント取引：${notes.join(' ／ ')}` : 'エージェントが取引の機会を探しています。',
    focus: Array.from(focus),
  }
}

function stationary(matrix: number[][]) {
  const n = matrix.length
  if (!n) return []
  let vector = Array(n).fill(1 / n) as number[]
  for (let step = 0; step < 450; step += 1) {
    const next = Array(n).fill(0) as number[]
    for (let from = 0; from < n; from += 1) {
      for (let to = 0; to < n; to += 1) next[to] += vector[from] * matrix[from][to]
    }
    const sum = next.reduce((acc, x) => acc + x, 0) || 1
    vector = next.map((x) => (x / sum) * n)
  }
  return vector
}

function App() {
  const [mode, setMode] = useState<Mode>('SELF_EVAL')
  const [nodes, setNodes] = useState(initialNodes)
  const [matrix, setMatrix] = useState(initialMatrix)
  const [selected, setSelected] = useState('aoi')
  const [timeStep, setTimeStep] = useState(18)
  const [gamma, setGamma] = useState(0.08)
  const [playing, setPlaying] = useState(false)
  const [buyer, setBuyer] = useState('aoi')
  const [seller, setSeller] = useState('ren')
  const [amount, setAmount] = useState(0.12)
  const [companyOpen, setCompanyOpen] = useState(false)
  const [explanationTopic, setExplanationTopic] = useState<ExplanationTopic>('tank')
  const [evolutionStage, setEvolutionStage] = useState<EvolutionMode>('SELF_EVAL')
  const [experienceMode, setExperienceMode] = useState<ExperienceMode>('free')
  const [vocabulary, setVocabulary] = useState<Vocabulary>('experience')
  const [scenarioId, setScenarioId] = useState<ScenarioId>('ichiro')
  const [scenarioChoice, setScenarioChoice] = useState<'good' | 'bad'>('good')
  const [scenarioPhase, setScenarioPhase] = useState(0)
  const [scenarioPlaying, setScenarioPlaying] = useState(false)
  const [compareSide, setCompareSide] = useState<CompareSide>('PICSY')
  const [flashKind, setFlashKind] = useState<'positive' | 'negative' | 'propagation' | null>(null)
  const [dynamicTime, setDynamicTime] = useState(0)
  const [dynamicPlaying, setDynamicPlaying] = useState(false)
  const [dynamicRule, setDynamicRule] = useState<EvolutionMode>('VIRTUAL_CENTRAL_BANK')
  const [dynamicHistory, setDynamicHistory] = useState<DynamicSnapshot[]>([])
  const [dynamicEvent, setDynamicEvent] = useState('コミュニティの日常。佐藤への評価は、まだ小さい。')
  const [dynamicGamma, setDynamicGamma] = useState(0.06)
  const [dynamicAgents, setDynamicAgents] = useState(true)
  const [dynamicAgentIntensity, setDynamicAgentIntensity] = useState(0.5)
  const [dynamicFocusIds, setDynamicFocusIds] = useState<string[]>([])
  const dynamicEngine = useRef({ matrix: dynamicInitialMatrix, nodes: dynamicCommunityNodes, time: 0, gamma: 0.06 })
  const [events, setEvents] = useState<EventRow[]>([
    { id: 1, title: 'シミュレーション開始', detail: 'コミュニティが作成されました', time: '09:41:02', kind: 'system' },
    { id: 2, title: '自然回収', detail: 'すべてのメンバー · γ = 0.08', time: '09:41:18', kind: 'system' },
    { id: 3, title: '取引', detail: '田中 → 佐藤 · 0.12 credits', time: '09:42:06', kind: 'trade' },
  ])
  const visualMatrix = useMemo(() => experienceMode === 'dynamics' && dynamicRule === 'VIRTUAL_CENTRAL_BANK' ? virtualizedEvaluationMatrix(matrix) : matrix, [matrix, experienceMode, dynamicRule])
  const contributions = useMemo(() => experienceMode === 'dynamics'
    ? nodes.some((node) => node.kind === 'bank') ? stationary(matrix) : stationary(visualMatrix)
    : stationary(matrix), [matrix, nodes, experienceMode, dynamicRule, visualMatrix])
  const selectedIndex = Math.max(0, nodes.findIndex((node) => node.id === selected))
  const selectedNode = nodes[selectedIndex]
  const total = contributions.reduce((sum, value) => sum + value, 0)
  const company = nodes.find((node) => node.kind === 'company')
  const selectedBankIndex = nodes.findIndex((node) => node.kind === 'bank')
  const selectedReserveColumn = experienceMode === 'dynamics'
    ? dynamicRule === 'CENTRAL_BANK' ? selectedBankIndex : selectedIndex
    : mode === 'CENTRAL_BANK' || mode === 'VIRTUAL_CENTRAL_BANK' ? selectedBankIndex : selectedIndex
  const selectedReserveLabel = experienceMode === 'dynamics'
    ? dynamicRule === 'CENTRAL_BANK' ? 'Eᵢ₀' : 'Eᵢᵢ'
    : mode === 'CENTRAL_BANK' || mode === 'VIRTUAL_CENTRAL_BANK' ? 'Eᵢ₀' : 'Eᵢᵢ'

  const activeScenario = scenarioId === 'ichiro' ? ichiroScenario() : doctorScenario(scenarioChoice)
  const activePhase = activeScenario.phases[Math.min(scenarioPhase, activeScenario.phases.length - 1)]
  const isScenario = experienceMode === 'scenario'
  const isDynamics = experienceMode === 'dynamics'
  const visualEffects = isScenario
    ? activePhase.effects ?? []
    : isDynamics
      ? dynamicFocusIds.map((id, index) => ({ id, pulse: 'high' as const, ...(index === 0 ? { rippleFrom: id } : {}) }))
      : []

  dynamicEngine.current = { matrix, nodes, time: dynamicTime, gamma: dynamicGamma }

  useEffect(() => {
    if (!isScenario || !scenarioPlaying) return
    const timer = window.setInterval(() => {
      setScenarioPhase((current) => {
        const total = activeScenario.phases.length
        if (current + 1 >= total) {
          setScenarioPlaying(false)
          return current
        }
        return current + 1
      })
    }, 2400)
    return () => window.clearInterval(timer)
  }, [isScenario, scenarioPlaying, activeScenario])

  useEffect(() => {
    if (!isScenario) return
    const phase = activeScenario.phases[Math.min(scenarioPhase, activeScenario.phases.length - 1)]
    setNodes(phase.nodes)
    setMatrix(phase.matrix)
    setTimeStep(phase.timeStep)
    const focusId = phase.effects?.find((effect) => effect.pulse === 'high')?.id ?? phase.nodes[0]?.id
    if (focusId) setSelected(focusId)
  }, [isScenario, scenarioId, scenarioChoice, scenarioPhase])

  useEffect(() => {
    if (!isDynamics || !dynamicPlaying) return
    const timer = window.setInterval(() => {
      const current = dynamicEngine.current
      const activity = dynamicAgents
        ? randomAgentActivity(current.matrix, current.nodes, dynamicAgentIntensity)
        : { matrix: current.matrix, event: '自然回収が進んでいます。', focus: [] as string[] }
      const next = collectAndRedistribute(activity.matrix, current.nodes, current.gamma, dynamicRule)
      const time = current.time + 1
      const values = communityContributionVector(next, current.nodes, dynamicRule)
      const pool = current.nodes.findIndex((node) => node.kind === 'bank')
      const weakest = values
        .map((value, index) => ({ value, index, node: current.nodes[index] }))
        .filter(({ node }) => node.kind !== 'bank')
        .sort((a, b) => a.value - b.value)
        .slice(0, 2)
        .map(({ node }) => node.id)
      setMatrix(next)
      setDynamicTime(time)
      setTimeStep(time)
      const recoveryEvent = dynamicRule === 'SELF_EVAL'
        ? '自然回収 → 自己評価枠を回復'
        : dynamicRule === 'CENTRAL_BANK'
          ? '自然回収 → 中央銀行から全員へ均等分配'
          : '自然回収 → 低貢献メンバーへ個別分配'
      const event = `${activity.event} · ${recoveryEvent}${dynamicRule === 'VIRTUAL_CENTRAL_BANK' ? `：${weakest.map((id) => current.nodes.find((node) => node.id === id)?.name).join('・')}` : ''}`
      setDynamicHistory((history) => [...history.slice(-119), { time, values, matrix: next, event }])
      setDynamicEvent(event)
      const redistributionFocus = dynamicRule === 'VIRTUAL_CENTRAL_BANK' ? weakest : dynamicRule === 'CENTRAL_BANK' ? current.nodes.filter((node) => node.kind !== 'bank').map((node) => node.id) : []
      setDynamicFocusIds([...activity.focus, ...(pool >= 0 ? [current.nodes[pool].id] : []), ...redistributionFocus])
      setFlashKind('positive')
      window.setTimeout(() => setFlashKind(null), 1400)
      dynamicEngine.current = { matrix: next, nodes: current.nodes, time, gamma: current.gamma }
    }, 1600)
    return () => window.clearInterval(timer)
  }, [isDynamics, dynamicPlaying, dynamicAgents, dynamicAgentIntensity, dynamicRule])

  function runScenarioAction(actionId: string) {
    const phase = activeScenario.phases[Math.min(scenarioPhase, activeScenario.phases.length - 1)]
    const action = phase.actions?.find((item) => item.id === actionId)
    if (!action) return
    const result = action.apply({ nodes: phase.nodes, matrix, events, addEvent })
    if (result.matrix) {
      const normalized = result.matrix.map((row) => {
        const sum = row.reduce((a, b) => a + b, 0) || 1
        return row.map((value) => value / sum)
      })
      setMatrix(normalized)
    }
    if (result.nodes) setNodes(result.nodes)
    if (typeof result.timeStep === 'number') setTimeStep(result.timeStep)
    if (result.flash) {
      setFlashKind(result.flash)
      window.setTimeout(() => setFlashKind(null), 2400)
    }
    if (scenarioPhase + 1 < activeScenario.phases.length) {
      window.setTimeout(() => setScenarioPhase(scenarioPhase + 1), 700)
    }
  }

  function translate(text: string) {
    if (vocabulary !== 'experience') return text
    let result = text
    Object.entries(vocabularyMap).forEach(([key, value]) => {
      if (key.includes('{')) {
        const pattern = new RegExp(key.replace(/[{}]/g, '\\$&'), 'g')
        result = result.replace(pattern, value.experience)
      } else {
        const regex = new RegExp(`\\b${key}\\b`, 'g')
        result = result.replace(regex, value.experience)
      }
    })
    return result
  }

  function showExplanation(topic: ExplanationTopic) {
    setExplanationTopic(topic)
    window.setTimeout(() => document.getElementById('figure-reading')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 40)
  }

  function startDynamics() {
    const world = buildDynamicWorld(dynamicRule)
    const initial = world.matrix
    const values = communityContributionVector(initial, world.nodes, dynamicRule)
    setExperienceMode('dynamics')
    setScenarioPlaying(false)
    setDynamicPlaying(false)
    setNodes(world.nodes)
    setMatrix(initial)
    setMode(dynamicRule)
    setDynamicTime(0)
    setTimeStep(0)
    setDynamicHistory([{ time: 0, values, matrix: initial, event: 'コミュニティを開始' }])
    setDynamicEvent('コミュニティの日常。佐藤への評価は、まだ小さい。')
    setDynamicAgents(true)
    setDynamicAgentIntensity(0.5)
    setDynamicFocusIds([])
    setSelected('mina')
    dynamicEngine.current = { matrix: initial, nodes: world.nodes, time: 0, gamma: dynamicGamma }
  }

  function selectDynamicRule(rule: EvolutionMode) {
    const world = buildDynamicWorld(rule)
    const values = communityContributionVector(world.matrix, world.nodes, rule)
    setDynamicPlaying(false)
    setDynamicRule(rule)
    setMode(rule)
    setNodes(world.nodes)
    setMatrix(world.matrix)
    setDynamicTime(0)
    setTimeStep(0)
    setDynamicHistory([{ time: 0, values, matrix: world.matrix, event: `${modes.find((item) => item.id === rule)?.label} でコミュニティを開始` }])
    setDynamicEvent(`${modes.find((item) => item.id === rule)?.label}：メンバーの活動を始めます。`)
    setDynamicFocusIds([])
    setSelected('mina')
    dynamicEngine.current = { matrix: world.matrix, nodes: world.nodes, time: 0, gamma: dynamicGamma }
  }

  function switchExperience(nextMode: Exclude<ExperienceMode, 'dynamics'>) {
    setExperienceMode(nextMode)
    setDynamicPlaying(false)
    if (isDynamics) {
      setNodes(initialNodes)
      setMatrix(initialMatrix)
      setMode('SELF_EVAL')
      setSelected('aoi')
    }
    if (nextMode === 'scenario') {
      setScenarioPhase(0)
      setScenarioPlaying(false)
    }
  }

  function boostDynamicCreator() {
    const current = dynamicEngine.current
    const next = raiseInfluence(current.matrix, current.nodes, 'mina', dynamicRule)
    const time = current.time + 1
    const values = communityContributionVector(next, current.nodes, dynamicRule)
    setMatrix(next)
    setDynamicTime(time)
    setTimeStep(time)
    setDynamicHistory((history) => [...history.slice(-119), { time, values, matrix: next, event: '佐藤の新作パンが町で評判に！' }])
    setDynamicEvent('佐藤のパンが大評判！佐藤を評価する人たちから、取引の輪へと価値が広がる。')
    setDynamicFocusIds(['mina', 'taku', 'sora', 'haru'])
    setSelected('mina')
    setFlashKind('propagation')
    window.setTimeout(() => setFlashKind(null), 2400)
    dynamicEngine.current = { matrix: next, nodes: current.nodes, time, gamma: current.gamma }
    addEvent('地域で評判に', '佐藤の新作パン — 評価の輪が広がる', 'trade')
  }

  function stepRandomAgents() {
    const current = dynamicEngine.current
    const activity = randomAgentActivity(current.matrix, current.nodes, dynamicAgentIntensity)
    const time = current.time + 1
    const values = communityContributionVector(activity.matrix, current.nodes, dynamicRule)
    setMatrix(activity.matrix)
    setDynamicTime(time)
    setTimeStep(time)
    setDynamicHistory((history) => [...history.slice(-119), { time, values, matrix: activity.matrix, event: activity.event }])
    setDynamicEvent(activity.event)
    setDynamicFocusIds(activity.focus)
    setFlashKind('propagation')
    window.setTimeout(() => setFlashKind(null), 1800)
    dynamicEngine.current = { matrix: activity.matrix, nodes: current.nodes, time, gamma: current.gamma }
    addEvent('ランダムエージェント取引', activity.event, 'trade')
  }

  function applyDynamicRecovery() {
    const current = dynamicEngine.current
    const next = collectAndRedistribute(current.matrix, current.nodes, current.gamma, dynamicRule)
    const time = current.time + 1
    const values = communityContributionVector(next, current.nodes, dynamicRule)
    const pool = current.nodes.findIndex((node) => node.kind === 'bank')
    const weakest = values
      .map((value, index) => ({ value, node: current.nodes[index] }))
      .filter(({ node }) => node.kind !== 'bank')
      .sort((a, b) => a.value - b.value)
      .slice(0, 2)
      .map(({ node }) => node.id)
    setMatrix(next)
    setDynamicTime(time)
    setTimeStep(time)
    const event = dynamicRule === 'SELF_EVAL'
      ? '自然回収：各メンバーの自己評価枠を回復。'
      : dynamicRule === 'CENTRAL_BANK'
        ? '自然回収：中央銀行を通じてソーシャルミニマムを全員へ均等分配。'
        : `自然回収：貢献度が小さい ${weakest.map((id) => current.nodes.find((node) => node.id === id)?.name).join('・')} に個別分配。`
    setDynamicHistory((history) => [...history.slice(-119), { time, values, matrix: next, event }])
    setDynamicEvent(event)
    const redistributionFocus = dynamicRule === 'VIRTUAL_CENTRAL_BANK' ? weakest : dynamicRule === 'CENTRAL_BANK' ? current.nodes.filter((node) => node.kind !== 'bank').map((node) => node.id) : []
    setDynamicFocusIds([...(pool >= 0 ? [current.nodes[pool].id] : []), ...redistributionFocus])
    setFlashKind('positive')
    window.setTimeout(() => setFlashKind(null), 1800)
    dynamicEngine.current = { matrix: next, nodes: current.nodes, time, gamma: current.gamma }
    addEvent('自然回収', event, 'system')
  }

  function selectDynamicSnapshot(index: number) {
    const snapshot = dynamicHistory[index]
    if (!snapshot) return
    setDynamicPlaying(false)
    setDynamicHistory((history) => history.slice(0, index + 1))
    setMatrix(snapshot.matrix)
    setDynamicTime(snapshot.time)
    setTimeStep(snapshot.time)
    setDynamicEvent(snapshot.event)
    setDynamicFocusIds(snapshot.time === 0 ? [] : ['mina', 'pool'])
    dynamicEngine.current = { matrix: snapshot.matrix, nodes: dynamicCommunityNodes, time: snapshot.time, gamma: dynamicGamma }
  }

  function jumpToEvolution(stage: EvolutionMode) {
    setEvolutionStage(stage)
    window.setTimeout(() => document.getElementById('evolution-journey')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 40)
  }

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      setTimeStep((step) => step + 1)
      setMatrix((current) => recoverMatrix(current, mode, gamma))
    }, 1600)
    return () => window.clearInterval(timer)
  }, [playing, mode, gamma, nodes])

  function recoverMatrix(source: number[][], activeMode: Mode, rate: number) {
    return source.map((row, i) => {
      if (activeMode === 'STATIC') return row
      if ((activeMode === 'CENTRAL_BANK' || activeMode === 'VIRTUAL_CENTRAL_BANK') && nodes[i]?.kind === 'bank') return row
      const reserveIndex = activeMode === 'CENTRAL_BANK' || activeMode === 'VIRTUAL_CENTRAL_BANK' ? nodes.findIndex((node) => node.kind === 'bank') : i
      if (reserveIndex < 0) return row
      const next = row.map((value, j) => (j === reserveIndex ? value : value * (1 - rate)))
      next[reserveIndex] += rate * (1 - row[reserveIndex])
      const sum = next.reduce((a, b) => a + b, 0) || 1
      return next.map((value) => value / sum)
    })
  }

  function transact() {
    const from = nodes.findIndex((node) => node.id === buyer)
    const to = nodes.findIndex((node) => node.id === seller)
    if (from < 0 || to < 0 || from === to) return
    const reserve = mode === 'CENTRAL_BANK' || mode === 'VIRTUAL_CENTRAL_BANK' ? nodes.findIndex((node) => node.kind === 'bank') : from
    if (reserve < 0 || amount <= 0 || (matrix[from]?.[reserve] ?? 0) < amount) return
    setMatrix((current) => {
      const updated = current.map((row) => [...row])
      updated[from][reserve] -= amount
      updated[from][to] += amount
      return updated.map((row) => {
        const sum = row.reduce((a, b) => a + b, 0) || 1
        return row.map((value) => value / sum)
      })
    })
    setTimeStep((step) => step + 1)
    const buyerName = nodes[from].name
    const sellerName = nodes[to].name
    addEvent('取引', `${sellerName} → ${buyerName} · ${amount.toFixed(2)} credits`, 'trade')
  }

  function switchMode(nextMode: Mode) {
    if (nextMode === mode) return
    if (isDynamics) {
      if (nextMode !== 'STATIC') selectDynamicRule(nextMode)
      return
    }
    const nextUsesBank = nextMode === 'CENTRAL_BANK' || nextMode === 'VIRTUAL_CENTRAL_BANK'
    const currentBankIndex = nodes.findIndex((node) => node.kind === 'bank')
    if (nextUsesBank && currentBankIndex < 0) {
      const bankNode: Member = { id: 'central-bank', name: nextMode === 'CENTRAL_BANK' ? '中央銀行' : '仮想中央銀行', kind: 'bank', color: '#8a9c78', initials: '銀' }
      const people = nodes.filter((node) => node.kind !== 'bank').length
      setNodes((current) => [...current, bankNode])
      setMatrix((current) => {
        const rows = current.map((row) => {
          const adjusted = row.map((value) => value * 0.75)
          adjusted.push(0.25)
          return adjusted
        })
        const distribution = nextMode === 'VIRTUAL_CENTRAL_BANK'
          ? contributions.map((value) => value / (total || 1))
          : Array(people).fill(1 / (people || 1))
        rows.push(distribution.concat(0))
        return rows
      })
      setSelected('central-bank')
    } else if (nextUsesBank && currentBankIndex >= 0) {
      setNodes((current) => current.map((node) => node.kind === 'bank' ? { ...node, name: nextMode === 'CENTRAL_BANK' ? '中央銀行' : '仮想中央銀行' } : node))
      setMatrix((current) => current.map((row, rowIndex) => {
        if (rowIndex !== currentBankIndex) return row
        const recipients = row.map((_, index) => index).filter((index) => index !== currentBankIndex)
        const weights = recipients.map((index) => contributions[index] ?? 0)
        const sum = weights.reduce((totalWeight, value) => totalWeight + value, 0) || 1
        const next = Array(row.length).fill(0) as number[]
        recipients.forEach((index, recipientIndex) => {
          next[index] = nextMode === 'VIRTUAL_CENTRAL_BANK' ? weights[recipientIndex] / sum : 1 / recipients.length
        })
        return next
      }))
    } else if (!nextUsesBank && currentBankIndex >= 0) {
      const bankIndex = currentBankIndex
      setNodes((current) => current.filter((node) => node.kind !== 'bank'))
      setMatrix((current) => current.filter((_, i) => i !== bankIndex).map((row) => {
        const next = row.filter((_, j) => j !== bankIndex)
        const sum = next.reduce((a, b) => a + b, 0) || 1
        return next.map((value) => value / sum)
      }))
      if (selected === 'central-bank') setSelected('aoi')
    }
    setMode(nextMode)
  }

  function addEvent(title: string, detail: string, kind: EventRow['kind']) {
    const now = new Date().toLocaleTimeString('ja-JP', { hour12: false })
    setEvents((list) => [{ id: Date.now(), title, detail, time: now, kind }, ...list].slice(0, 6))
  }

  function addMember() {
    const index = nodes.filter((node) => node.kind === 'person').length + 1
    const id = `member-${Date.now()}`
    const newNode: Member = { id, name: `メンバー ${index}`, kind: 'person', color: colors[(index - 1) % colors.length], initials: `${index}` }
    const count = nodes.length
    const bankIndex = nodes.findIndex((node) => node.kind === 'bank')
    setNodes((list) => [...list, newNode])
    setMatrix((current) => {
      if (bankIndex >= 0) {
        const next = current.map((row, rowIndex) => {
          const expanded = [...row, 0]
          if (rowIndex === bankIndex) {
            const share = 1 / Math.max(1, count)
            expanded.forEach((_, column) => { expanded[column] = column === bankIndex ? 0 : share })
          }
          return expanded
        })
        const newRow = Array(count + 1).fill(0)
        newRow[bankIndex] = 0.25
        const recipients = nodes.map((node, nodeIndex) => ({ node, nodeIndex })).filter(({ node, nodeIndex }) => node.kind === 'person' && nodeIndex !== bankIndex)
        if (recipients.length) recipients.forEach(({ nodeIndex }) => { newRow[nodeIndex] = 0.75 / recipients.length })
        else newRow[bankIndex] = 1
        next.push(newRow)
        return next
      }
      const next = current.map((row) => [...row, 1 / (count + 1)])
      next.push(Array(count + 1).fill(1 / (count + 1)))
      return next.map((row) => row.map(() => 1 / (count + 1)))
    })
    setSelected(id)
    addEvent('メンバー追加', `${newNode.name} がコミュニティに参加しました`, 'system')
  }

  function establishCompany() {
    if (company) {
      setCompanyOpen(true)
      return
    }
    const companyNode: Member = { id: 'studio', name: 'みんなの工房', kind: 'company', color: '#5c9b87', initials: '工', members: nodes.filter((n) => n.kind === 'person').slice(0, 3).map((n) => n.id) }
    const count = nodes.length
    setNodes((list) => [...list, companyNode])
    setMatrix((current) => {
      const next = current.map((row) => [...row, 0.08])
      next.push(Array(count + 1).fill(1 / (count + 1)))
      return next.map((row) => {
        const sum = row.reduce((a, b) => a + b, 0)
        return row.map((value) => value / sum)
      })
    })
    setSelected('studio')
    addEvent('カンパニー設立', 'みんなの工房 · メンバー 3 人', 'company')
  }

  function dissolveCompany() {
    const companyIndex = nodes.findIndex((node) => node.kind === 'company')
    if (companyIndex < 0) return
    const companyNode = nodes[companyIndex]
    const shares = companyNode.members ?? []
    const weights = shares.map(() => 1 / (shares.length || 1))
    const keptNodes = nodes.filter((_, i) => i !== companyIndex)
    const keptShares = shares.map((id) => keptNodes.findIndex((node) => node.id === id)).filter((i) => i >= 0)
    const next = matrix.filter((_, i) => i !== companyIndex).map((row) => {
      const holding = row[companyIndex] ?? 0
      const adjusted = row.filter((_, j) => j !== companyIndex)
      keptShares.forEach((memberIndex, index) => { adjusted[memberIndex] += holding * (weights[index] ?? 0) })
      const sum = adjusted.reduce((a, b) => a + b, 0) || 1
      return adjusted.map((value) => value / sum)
    })
    setNodes(keptNodes)
    setMatrix(next)
    setSelected('aoi')
    setCompanyOpen(false)
    addEvent('仮想解体', '工房への評価を創業メンバーに分配しました', 'company')
  }

  function stepForward() {
    setTimeStep((step) => step + 1)
    setMatrix((current) => recoverMatrix(current, mode, gamma))
  }

  function setNodeWeight(rowIndex: number, colIndex: number, value: number) {
      setMatrix((current) => current.map((row, i) => {
      if (i !== rowIndex) return row
      const next = [...row]
      next[colIndex] = value
      const rest = next.reduce((sum, item, j) => sum + (j === colIndex ? 0 : item), 0)
      if (rest > 0) next.forEach((item, j) => { if (j !== colIndex) next[j] = item * ((1 - value) / rest) })
      else next.forEach((_, j) => { if (j !== colIndex) next[j] = (1 - value) / (next.length - 1 || 1) })
      next[colIndex] = value
      return next
    }))
  }

  const positions = useMemo(() => nodes.map((_, index) => {
    const node = nodes[index]
    if (node.kind === 'bank') return { x: 50, y: 50 }
    const members = nodes.filter((item) => item.kind !== 'bank')
    const memberIndex = members.findIndex((item) => item.id === node.id)
    const angle = (-Math.PI / 2) + (memberIndex * Math.PI * 2) / members.length
    return { x: 50 + Math.cos(angle) * (nodes.length > 5 ? 36 : 32), y: 50 + Math.sin(angle) * (nodes.length > 5 ? 35 : 33) }
  }), [nodes])

  const dynamicMaxValue = Math.max(1, ...dynamicHistory.flatMap((snapshot) => snapshot.values.slice(0, dynamicCommunityNodes.length - 1)))
  const dynamicChartPath = (nodeIndex: number) => {
    if (dynamicHistory.length < 2) return ''
    return dynamicHistory.map((snapshot, index) => {
      const x = 8 + (index / Math.max(1, dynamicHistory.length - 1)) * 584
      const y = 87 - ((snapshot.values[nodeIndex] ?? 0) / dynamicMaxValue) * 74
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    }).join(' ')
  }

  const currentHistory = dynamicHistory[dynamicHistory.length - 1]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><span></span><span></span><span></span></div><span>PICSY<span className="brand-dot">.</span></span></div>
        <div className="workspace"><div className="workspace-icon">S</div><div><strong>小さなコミュニティ</strong><span>ワークスペース</span></div><span className="chevron">⌄</span></div>
        <div className="side-label">SIMULATION</div>
        <nav className="mode-nav" aria-label="シミュレーションモード">
          {modes.map((item) => <button key={item.id} onClick={() => switchMode(item.id)} className={`mode-link ${mode === item.id ? 'active' : ''}`}><span className="mode-icon">{item.icon}</span><span>{item.label}</span><span className="mode-number">{item.short}</span></button>)}
        </nav>
        <div className="mode-evolution-hint">
          <span className="evolution-kicker">進化のステップ</span>
          <div className="evolution-pipeline">
            {evolutionStages.map((stage, index) => <button key={stage.id} className={`evolution-pip ${mode === stage.id ? 'current' : ''} ${stage.status}`} onClick={() => { switchMode(stage.id); jumpToEvolution(stage.id); }} title={`${stage.title} の背景を読む`}><span>{index + 1}</span><i /></button>)}
          </div>
          <p>自己評価 → 中央銀行 → 仮想中央銀行 — 段階的に洗練されてきました。</p>
        </div>
        <div className="side-divider" />
        <div className="side-label">COMMUNITY <button className="tiny-add" onClick={addMember} aria-label="メンバーを追加">＋</button></div>
        <div className="member-list">
          {nodes.filter((node) => node.kind !== 'bank').map((node) => <button key={node.id} onClick={() => setSelected(node.id)} className={`member-link ${selected === node.id ? 'selected' : ''}`}><span className="member-avatar" style={{ '--member-color': node.color } as React.CSSProperties}>{node.initials}</span><span>{node.name}</span><span className={`member-status ${node.kind}`} /></button>)}
        </div>
        <div className="sidebar-bottom"><button className="help-card" onClick={() => showExplanation('model')}><div className="help-icon">✳</div><div><strong>PICSYのしくみ</strong><span>図の読み解きガイド</span></div><span className="help-arrow">↗</span></button><div className="profile"><div className="profile-avatar">K</div><div className="profile-copy"><strong>Kei Nakamura</strong><span>研究者プラン</span></div><span className="profile-more">···</span></div></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><div className="breadcrumb">ワークスペース <span>/</span> <b>シミュレーション</b></div><div className="top-actions"><span className="saved-indicator"><i /> 自動保存済み</span><button className="icon-button" aria-label="通知">♧<i /></button><button className="share-button" onClick={() => { void navigator.clipboard?.writeText(window.location.href) }}>共有 <span>↗</span></button></div></header>
        <div className="page-content">
          <section className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> INTERACTIVE MODEL <span className="eyebrow-id">No. 01 — 04</span></div><h1>価値の流れを、<em>見て・触れて・理解する。</em></h1><p className="heading-description">人と人との評価が、社会全体の価値をどう形づくるのか。<br className="desktop-break" />水槽とポンプのモデルで、PICSYの世界を探検しましょう。</p></div><button className="learn-button" onClick={() => showExplanation('model')}><span>▶</span> 図の読み解き <kbd>⌘ /</kbd></button></section>

          <section className="experience-tabs" aria-label="体験モード">
            <div className="experience-tabs-row" role="tablist">
              <button className={`experience-tab ${experienceMode === 'free' ? 'active' : ''}`} onClick={() => switchExperience('free')} role="tab" aria-selected={experienceMode === 'free'}><span className="experience-tab-num">FREE</span><b>自由シミュレーション</b><small>水槽モデルで自由に試す</small></button>
              <button className={`experience-tab ${experienceMode === 'scenario' ? 'active' : ''}`} onClick={() => switchExperience('scenario')} role="tab" aria-selected={experienceMode === 'scenario'}><span className="experience-tab-num">STORY</span><b>ストーリーシナリオ</b><small>物語でPICSYを体感する</small></button>
              <button className={`experience-tab ${experienceMode === 'compare' ? 'active' : ''}`} onClick={() => switchExperience('compare')} role="tab" aria-selected={experienceMode === 'compare'}><span className="experience-tab-num">COMPARE</span><b>SECSY比較</b><small>既存貨幣と並列に比べる</small></button>
              <button className={`experience-tab ${experienceMode === 'dynamics' ? 'active' : ''}`} onClick={startDynamics} role="tab" aria-selected={experienceMode === 'dynamics'}><span className="experience-tab-num">TIME FLOW</span><b>時間変化デモ</b><small>価値が巡り、再分配される</small></button>
            </div>
            <div className="experience-vocab">
              <span className="experience-vocab-kicker">用語</span>
              <button className={`experience-vocab-btn ${vocabulary === 'experience' ? 'active' : ''}`} onClick={() => setVocabulary('experience')}>体験モード</button>
              <button className={`experience-vocab-btn ${vocabulary === 'technical' ? 'active' : ''}`} onClick={() => setVocabulary('technical')}>数式モード</button>
            </div>
          </section>

          {isDynamics && (
            <section className="time-flow-demo card" aria-label="価値の時間変化">
              <header className="time-flow-head">
                <div className="time-flow-title">
                  <div className="concept-overline"><span /> VALUE IN MOTION</div>
                  <h2>ひとりの成功が、まちの水位を変えていく。</h2>
                  <p>佐藤のパンが評判になると、彼女を支えていた人々の貢献度も変わる。時間を進めて、その価値の波及を見てみよう。</p>
                </div>
                <div className="time-flow-clock"><span>COMMUNITY TIME</span><b>t = {String(dynamicTime).padStart(2, '0')}</b><i>MONTHS</i></div>
              </header>
              <div className="dynamic-rule-picker">
                <div className="dynamic-rule-picker-head"><span>同じコミュニティでルールを切り替える</span><small>各ルールの時間変化を同じ条件で観察できます</small></div>
                <div className="dynamic-rule-buttons" role="tablist" aria-label="時間変化デモの計算ルール">
                  {evolutionStages.map((stage) => <button key={stage.id} className={`dynamic-rule-button ${dynamicRule === stage.id ? 'active' : ''} ${stage.status}`} onClick={() => selectDynamicRule(stage.id)} role="tab" aria-selected={dynamicRule === stage.id}><span>{stage.step}</span><b>{stage.title}</b></button>)}
                </div>
                <p>{dynamicRule === 'SELF_EVAL' ? '自然回収で各人の使った評価を自己評価へ戻します。Eᵢᵢは予算枠で、取引相手ではありません。自己取引は式上、同じ成分から引いて足すため行列変化はありません。' : dynamicRule === 'CENTRAL_BANK' ? '中央銀行に予算を集め、E₀ᵢ = 1/N でソーシャルミニマムを全員へ等分に戻します。Eᵢᵢ = 0 のため予算枠は Eᵢ₀ です。' : <>E′ = E − B + BD/(N−1)。B の対角予算を、対角成分ゼロの D で自分以外へ配ります。Dᵢᵢ=0は分配先の条件であり、自己評価法ベースの取引相手ルールとは別です。中央銀行ノードは登場しません。</>}</p>
              </div>
              <div className="dynamic-event-banner"><span className="dynamic-event-orb">{dynamicFocusIds.includes('pool') ? '↘' : dynamicFocusIds.includes('mina') ? '✦' : '◷'}</span><div><span className="dynamic-now">いま起きていること</span><b>{dynamicEvent}</b></div></div>
              <div className="dynamic-chart-wrap">
                <div className="dynamic-chart-head"><div><b>貢献度の移り変わり</b><span>水位が上がると、その人の社会的価値が増えたことを表します</span></div><div className="dynamic-chart-summary"><span>メンバー</span><b>{nodes.filter((node) => node.kind !== 'bank').length}</b></div></div>
                <svg className="dynamic-chart" viewBox="0 0 600 100" preserveAspectRatio="none" role="img" aria-label="コミュニティメンバーの貢献度が時間とともに変化するグラフ">
                  {[0, 1, 2, 3].map((line) => <line key={line} x1="8" x2="592" y1={13 + line * 24} y2={13 + line * 24} className="chart-grid-line" />)}
                  {dynamicCommunityNodes.filter((node) => node.kind !== 'bank').map((node, index) => <path key={node.id} d={dynamicChartPath(index)} fill="none" stroke={node.color} strokeWidth={node.id === 'mina' ? 2.5 : 1.5} strokeLinecap="round" strokeLinejoin="round" className={`chart-line ${node.id === 'mina' ? 'mina-line' : ''}`} />)}
                  {dynamicHistory.length > 0 && dynamicCommunityNodes.filter((node) => node.kind !== 'bank').map((node, index) => {
                    const last = dynamicHistory[dynamicHistory.length - 1]
                    const x = 8 + ((dynamicHistory.length - 1) / Math.max(1, dynamicHistory.length - 1)) * 584
                    const y = 87 - ((last.values[index] ?? 0) / dynamicMaxValue) * 74
                    return <circle key={node.id} cx={x} cy={y} r={node.id === 'mina' ? 3.5 : 2.5} fill={node.color} className="chart-dot" />
                  })}
                </svg>
                <div className="dynamic-chart-legend">{dynamicCommunityNodes.filter((node) => node.kind !== 'bank').map((node, index) => <span key={node.id} className={node.id === 'mina' ? 'legend-mina' : ''}><i style={{ background: node.color }} />{node.name}<b>{(currentHistory?.values[index] ?? 0).toFixed(2)}</b></span>)}</div>
                <div className="dynamic-scrubber"><span>はじまり</span><input aria-label="時間を選択" type="range" min="0" max={Math.max(0, dynamicHistory.length - 1)} value={Math.max(0, dynamicHistory.length - 1)} onChange={(event) => selectDynamicSnapshot(Number(event.target.value))} /><span>いま · {dynamicHistory.length} events</span></div>
              </div>
              <div className="dynamic-mechanism">
                <div className="mechanism-step creator-step"><span className="mechanism-icon">✦</span><div><span>01 · 活躍</span><b>佐藤への評価が集まる</b><small>パンが話題に → 佐藤の水位が上がる</small></div></div>
                <span className="mechanism-arrow">→</span>
                <div className="mechanism-step ripple-step"><span className="mechanism-icon">⟳</span><div><span>02 · 波及</span><b>仕入先・仲間にも届く</b><small>佐藤が評価する相手へ価値が流れる</small></div></div>
                <span className="mechanism-arrow">→</span>
                <div className="mechanism-step recovery-step"><span className="mechanism-icon">↘</span><div><span>03 · 自然回収</span><b>{dynamicRule === 'SELF_EVAL' ? '自分の予算枠へ戻す' : dynamicRule === 'CENTRAL_BANK' ? '全員へソーシャルミニマム' : '低い貢献度へ個別分配'}</b><small>{dynamicRule === 'SELF_EVAL' ? '自己評価 Eᵢᵢ を回復' : dynamicRule === 'CENTRAL_BANK' ? '中央銀行から均等に分配' : '仮想分配行列で再配分'}</small></div></div>
              </div>
              <div className="dynamic-actions">
                <div className="dynamic-actions-buttons">
                  <button className="dynamic-action-button success" onClick={boostDynamicCreator}><span>✦</span> 佐藤のパンが町で大評判！</button>
                  <button className="dynamic-action-button recovery" onClick={applyDynamicRecovery}><span>↻</span> {dynamicRule === 'SELF_EVAL' ? '自然回収（自己評価へ）' : '自然回収して再分配'}</button>
                  <button className="dynamic-action-button random-step" onClick={stepRandomAgents}><span>⇄</span> エージェントを1回動かす</button>
                  <button className={`dynamic-action-button playback ${dynamicPlaying ? 'playing' : ''}`} onClick={() => setDynamicPlaying((playing) => !playing)}><span>{dynamicPlaying ? 'Ⅱ' : '▶'}</span>{dynamicPlaying ? '時間を止める' : '時間を流す'}</button>
                </div>
                <div className="dynamic-sliders">
                  <button className={`agent-switch ${dynamicAgents ? 'active' : ''}`} onClick={() => setDynamicAgents((active) => !active)} aria-pressed={dynamicAgents}><span className="switch-lamp" />ランダムなエージェント活動 <b>{dynamicAgents ? 'ON' : 'OFF'}</b></button>
                  <label className="dynamic-gamma"><span>回収率 γ <b>{dynamicGamma.toFixed(2)}</b></span><input aria-label="自然回収率 gamma" type="range" min="0.01" max="0.2" step="0.01" value={dynamicGamma} onChange={(event) => { const gamma = Number(event.target.value); setDynamicGamma(gamma); dynamicEngine.current.gamma = gamma }} /></label>
                  <label className="dynamic-gamma"><span>エージェントの活発さ <b>{dynamicAgentIntensity.toFixed(2)}</b></span><input aria-label="エージェントの活発さ" type="range" min="0" max="1" step="0.05" value={dynamicAgentIntensity} onChange={(event) => setDynamicAgentIntensity(Number(event.target.value))} /></label>
                </div>
              </div>
              <div className="dynamic-caption"><span>見どころ</span>エージェントがランダムに相手を選び、取引や評価を続けます。佐藤の成功で周囲が変わり、選んだルールに応じて自然回収の行き先が変わります。<small>{dynamicRule === 'SELF_EVAL' ? '自己評価法の自然回収は Eᵢᵢ を回復します。ランダム取引で評価先が動き続けます。' : dynamicRule === 'CENTRAL_BANK' ? '中央銀行は実体を持つノードとして現れます。Eᵢ₀ に回収し、中央銀行の行から均等に分配します。' : '仮想中央銀行ノードはありません。E′ = E − B + BD/(N−1) を適用し、Dᵢᵢ=0 の分配を行列上で表現します。'}</small></div>
            </section>
          )}

          {experienceMode === 'scenario' && (
            <section className="scenario-stage card" aria-label="ストーリーシナリオ">
              <header className="scenario-head">
                <div className="scenario-head-copy">
                  <div className="concept-overline"><span /> STORY SCENARIO</div>
                  <h2>{translate(activeScenario.title)}<span> · </span><small>{translate(activeScenario.subtitle)}</small></h2>
                  <p>{translate(activeScenario.premise)}</p>
                </div>
                <div className="scenario-meta">
                  <span className="scenario-tag">{activeScenario.tag}</span>
                  <div className="scenario-choice" role="tablist" aria-label="シナリオ選択">
                    <button className={`scenario-choice-btn ${scenarioId === 'ichiro' ? 'active' : ''}`} onClick={() => { setScenarioId('ichiro'); setScenarioPhase(0); setScenarioPlaying(false); }}>① イチローとラーメン屋</button>
                    <button className={`scenario-choice-btn ${scenarioId === 'doctor' ? 'active' : ''}`} onClick={() => { setScenarioId('doctor'); setScenarioPhase(0); setScenarioPlaying(false); }}>② 良い医者 vs 悪い医者</button>
                  </div>
                  {scenarioId === 'doctor' && (
                    <div className="scenario-doctor-choice">
                      <span>あなたの選択</span>
                      <div className="scenario-doctor-buttons">
                        <button className={`scenario-doctor-btn good ${scenarioChoice === 'good' ? 'active' : ''}`} onClick={() => { setScenarioChoice('good'); setScenarioPhase(0); setScenarioPlaying(false); }}>良い医者（根本治療）</button>
                        <button className={`scenario-doctor-btn bad ${scenarioChoice === 'bad' ? 'active' : ''}`} onClick={() => { setScenarioChoice('bad'); setScenarioPhase(0); setScenarioPlaying(false); }}>悪い医者（薬を売りつける）</button>
                      </div>
                    </div>
                  )}
                </div>
              </header>
              <ol className="scenario-phases">
                {activeScenario.phases.map((phase, index) => (
                  <li key={phase.id} className={`scenario-phase ${scenarioPhase === index ? 'active' : ''}`}>
                    <button className="phase-trigger" onClick={() => setScenarioPhase(index)}>
                      <span className="phase-marker">{index + 1}</span>
                      <div className="phase-heading"><span className="phase-meta">{phase.chapter} · {phase.year}</span><b>{translate(phase.label)}</b></div>
                      <span className="phase-state">{scenarioPhase === index ? '再生中' : scenarioPhase > index ? '済' : '待機'}</span>
                    </button>
                    {scenarioPhase === index && (
                      <div className="phase-narration">
                        <h3>{translate(phase.narration.title)}</h3>
                        <p>{translate(phase.narration.body)}</p>
                        {phase.narration.highlight && <div className="phase-highlight">{translate(phase.narration.highlight)}</div>}
                        {phase.actions && phase.actions.length > 0 && (
                          <div className="phase-actions">
                            <span className="phase-actions-kicker">あなたの操作</span>
                            <div className="phase-actions-row">
                              {phase.actions.map((action) => (
                                <button key={action.id} className={`phase-action tone-${action.tone ?? 'default'}`} onClick={() => runScenarioAction(action.id)}>
                                  <span className="phase-action-icon">{action.icon ?? '◷'}</span>
                                  <div className="phase-action-copy"><b>{translate(action.label)}</b><small>{translate(action.description)}</small></div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {phase.outcomes && phase.outcomes.length > 0 && (
                          <div className="phase-outcomes">
                            <span className="phase-outcomes-kicker">最終的な変化</span>
                            <ul>{phase.outcomes.map((outcome) => {
                              const member = phase.nodes.find((node) => node.id === outcome.id)
                              const value = member ? contributions[nodes.findIndex((node) => node.id === member.id)] ?? 0 : 0
                              return <li key={outcome.id}><span className="outcome-dot" style={{ background: member?.color ?? '#5b8c70' }} />{outcome.label}<b className={outcome.delta >= 0 ? 'pos' : 'neg'}>{outcome.delta >= 0 ? '+' : ''}{outcome.delta.toFixed(2)}</b><i>現在 {value.toFixed(2)}</i></li>
                            })}</ul>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
              <div className="scenario-controls">
                <button className="phase-button play" onClick={() => { setScenarioPhase(0); setScenarioPlaying(true); }}>▶ 最初から再生</button>
                <button className="phase-button step" onClick={() => setScenarioPhase((current) => Math.min(activeScenario.phases.length - 1, current + 1))} disabled={scenarioPhase >= activeScenario.phases.length - 1}>次のフェーズ ↗</button>
                <button className="phase-button reset" onClick={() => { setScenarioPhase(0); setScenarioPlaying(false); }}>リセット ↺</button>
                <div className="scenario-progress"><span style={{ width: `${((scenarioPhase + 1) / activeScenario.phases.length) * 100}%` }} /></div>
              </div>
            </section>
          )}

          {experienceMode === 'compare' && (
            <section className="compare-stage card" aria-label="SECSY比較">
              <header className="compare-head">
                <div className="concept-overline"><span /> SECSY vs PICSY</div>
                <h2>同じ取引が、<em>既存の貨幣</em> と <em>PICSY</em> でどう変わるか。</h2>
                <p>SECSY（既存の決済貨幣）では価値が滞留・偏在し、PICSYではネットワーク全体に伝播します。</p>
              </header>
              <div className="compare-toggle" role="tablist" aria-label="比較する視点">
                <button className={`compare-toggle-btn ${compareSide === 'SECSY' ? 'active' : ''}`} onClick={() => setCompareSide('SECSY')} role="tab" aria-selected={compareSide === 'SECSY'}>SECSY（既存）</button>
                <button className={`compare-toggle-btn ${compareSide === 'PICSY' ? 'active' : ''}`} onClick={() => setCompareSide('PICSY')} role="tab" aria-selected={compareSide === 'PICSY'}>PICSY（提案）</button>
              </div>
              <div className="compare-table">
                <div className="compare-cell compare-head-cell">比較項目</div>
                <div className={`compare-cell ${compareSide === 'SECSY' ? 'focused' : ''}`}>SECSY（既存）</div>
                <div className={`compare-cell ${compareSide === 'PICSY' ? 'focused' : ''}`}>PICSY</div>
                {compareRows.map((row) => <CompareRow key={row.label} row={row} focused={compareSide} />)}
              </div>
              <div className="compare-stage-split">
                <div className={`compare-stage-side secsy ${compareSide === 'SECSY' ? 'focused' : ''}`}>
                  <span className="compare-stage-tag">SECSY · 従来の貨幣</span>
                  <h4>水は中央に留まり、末端には届かない</h4>
                  <p>取引のたびに企業ノードに価値が溜まり、創業者・従業員・取引先には行き渡らない。</p>
                </div>
                <div className={`compare-stage-side picsy ${compareSide === 'PICSY' ? 'focused' : ''}`}>
                  <span className="compare-stage-tag">PICSY · 伝播投資貨幣</span>
                  <h4>カンパニーを通過して、背後へなめらかに染み渡る</h4>
                  <p>カンパニーノードを通過した価値は即座に背後の創業者・従業員・取引先に分配されます。</p>
                </div>
              </div>
            </section>
          )}

          <section className="concept-strip card" aria-label="PICSYの理念">
            <div className="concept-intro">
              <div className="concept-overline"><span /> WHAT IS PICSY?</div>
              <h2>PICSYは、価値を「溜める」ではなく「巡らせる」お金です。</h2>
              <p>従来の貨幣は貯蔵できる <b>ストック</b> として認識され、フェティシズム（お金そのものへの執着）や停滞を生みました。<br />PICSYは、評価ネットワークを流れる <b>フロー</b> として価値を定義しなおし、取引をすべて <b>投資</b> とみなします。</p>
            </div>
            <div className="concept-pillars">
              {(Object.keys(pillars) as PillarKey[]).map((key) => <article key={key} className="concept-pillar"><div className="pillar-tag">{pillars[key].label}</div><h3>{pillars[key].title}</h3><p>{pillars[key].body}</p><div className="pillar-example"><span>たとえば</span>{pillars[key].example}</div></article>)}
            </div>
          </section>

          <section className="mode-banner"><div className="mode-banner-icon">{modes.find((item) => item.id === mode)?.icon}</div><div className="mode-banner-copy"><div><span className="banner-kicker">NOW EXPLORING</span><span className="banner-pip" /></div><h2>{modes.find((item) => item.id === mode)?.label}<span> · </span><small>{mode === 'STATIC' ? 'マルコフ過程の定常状態' : mode === 'SELF_EVAL' ? '評価がめぐる、自己評価のしくみ' : mode === 'CENTRAL_BANK' ? 'ソーシャルミニマムを分配する' : '中央銀行を仮想的に解体する'}</small></h2></div><button className="banner-info" onClick={() => showExplanation(mode === 'CENTRAL_BANK' || mode === 'VIRTUAL_CENTRAL_BANK' ? 'bank' : mode === 'SELF_EVAL' ? 'transaction' : 'flow')} title="このモードについて説明を読む" aria-label="このモードについて説明を読む">i</button></section>

          <div className="dashboard-grid">
            <section className="canvas-card card"><div className="card-topline"><div><div className="section-title">コミュニティ・ネットワーク <span className="live-tag"><i /> LIVE</span></div><div className="subtle-text">ノードを選択して、メンバーの価値を探索</div></div><div className="canvas-actions"><button className="canvas-action" onClick={() => setSelected('aoi')} title="全体表示">⊙</button><button className="canvas-action" title="全画面表示">⛶</button><button className="canvas-menu">···</button></div></div>
              <div className={`network-stage ${flashKind ? `flash-${flashKind}` : ''} ${isScenario ? 'scenario-mode' : ''}`}>
                <div className="canvas-grid" />
                {isDynamics && dynamicRule === 'VIRTUAL_CENTRAL_BANK' && <div className="virtual-distribution-mark" aria-label="仮想分配行列。実体ノードはありません"><b>D</b><span>行列上の分配</span></div>}
                <button className="network-label label-a" onClick={() => setExplanationTopic('pipe')} onMouseEnter={() => setExplanationTopic('pipe')} onFocus={() => setExplanationTopic('pipe')} aria-label="評価行列とパイプの説明を表示">評価 E<sub>ij</sub><span>ⓘ</span></button><button className="network-label label-b" onClick={() => setExplanationTopic('tank')} onMouseEnter={() => setExplanationTopic('tank')} onFocus={() => setExplanationTopic('tank')} aria-label="貢献度と水槽の説明を表示">貢献度 c<sub>i</sub><span>ⓘ</span></button>
                <div className="ripple-layer" aria-hidden="true">
                  {visualEffects.filter((e) => e.pulse === 'high' && e.rippleFrom).map((e) => {
                    const idx = nodes.findIndex((node) => node.id === e.rippleFrom)
                    if (idx < 0) return null
                    const point = positions[idx]
                    if (!point) return null
                    return <span key={e.id} className="ripple-wave" style={{ left: `${point.x}%`, top: `${point.y}%`, '--node-color': nodes[idx].color } as React.CSSProperties} />
                  })}
                </div>
                <svg className="network-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="メンバー間の評価ネットワーク">
                  <defs>
                    <marker id="arrow" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto"><path d="M0,0 L4,2 L0,4" fill="#a8b9b0" /></marker>
                    <linearGradient id="flow-gradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0" stopColor="#86c39d" stopOpacity="0" />
                      <stop offset="0.5" stopColor="#86c39d" stopOpacity="1" />
                      <stop offset="1" stopColor="#86c39d" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="flow-gradient-hot" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0" stopColor="#ffc46e" stopOpacity="0" />
                      <stop offset="0.5" stopColor="#ffc46e" stopOpacity="1" />
                      <stop offset="1" stopColor="#ffc46e" stopOpacity="0" />
                    </linearGradient>
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="0.6" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                  </defs>
                  {visualMatrix.map((row, i) => row.map((weight, j) => {
                    if (i === j || weight < 0.13) return null
                    const start = positions[i]; const end = positions[j]
                    if (!start || !end) return null
                    const strong = selected === nodes[i].id || selected === nodes[j].id
                    const inbound = selected === nodes[j].id
                    const outbound = selected === nodes[i].id
                    const isFlashPath = visualEffects.some((e) => e.rippleFrom && (e.rippleFrom === nodes[i].id || e.rippleFrom === nodes[j].id))
                    const flowId = isFlashPath ? 'flow-gradient-hot' : 'flow-gradient'
                    const flowSpeed = Math.max(0.8, 6 - weight * 5)
                    return <g key={`${i}-${j}`} className={`edge-group ${strong ? 'edge-group-highlight' : ''} ${inbound ? 'edge-inbound' : ''} ${outbound ? 'edge-outbound' : ''} ${isFlashPath ? 'edge-hot' : ''}`}>
                      <path className="edge" d={`M ${start.x} ${start.y} Q ${(start.x + end.x) / 2 + (start.y - end.y) * 0.08} ${(start.y + end.y) / 2 + (end.x - start.x) * 0.08} ${end.x} ${end.y}`} strokeWidth={Math.max(0.25, weight * 3.2)} markerEnd="url(#arrow)" onMouseEnter={() => setExplanationTopic('pipe')} onClick={() => setExplanationTopic('pipe')} tabIndex={0} role="button" aria-label={`${nodes[i].name}から${nodes[j].name}への評価 ${weight.toFixed(2)}。クリックで評価の説明を表示`}><title>{nodes[i].name} から {nodes[j].name} への評価 {weight.toFixed(2)} — クリックで説明</title></path>
                      <path className={`edge-flow ${isFlashPath ? 'edge-flow-hot' : ''}`} stroke={`url(#${flowId})`} strokeWidth={Math.max(0.6, weight * 2.6)} fill="none" filter="url(#glow)" strokeDasharray={`${Math.max(2, weight * 9)} ${Math.max(8, 22 - weight * 12)}`} d={`M ${start.x} ${start.y} Q ${(start.x + end.x) / 2 + (start.y - end.y) * 0.08} ${(start.y + end.y) / 2 + (end.x - start.x) * 0.08} ${end.x} ${end.y}`}>
                        <animate attributeName="stroke-dashoffset" from="30" to="0" dur={`${flowSpeed}s`} repeatCount="indefinite" />
                      </path>
                    </g>
                  }))}
                </svg>
                {nodes.map((node, index) => {
                  const point = positions[index]
                  const value = contributions[index] ?? 0
                  const fill = Math.max(9, Math.min(92, value / (total || 1) * 100))
                  const effect = visualEffects.find((e) => e.id === node.id)
                  const pulse = effect?.pulse ?? 'none'
                  return <button key={node.id} onClick={() => { setSelected(node.id); setExplanationTopic(node.kind === 'company' ? 'company' : node.kind === 'bank' ? 'bank' : 'tank') }} onMouseEnter={() => setExplanationTopic(node.kind === 'company' ? 'company' : node.kind === 'bank' ? 'bank' : 'tank')} className={`tank-node pulse-${pulse} ${effect?.rippleFrom ? 'ripple-source' : ''} ${selected === node.id ? 'node-selected' : ''} ${node.kind === 'company' ? 'company-node' : ''} ${node.kind === 'bank' ? 'bank-node' : ''}`} style={{ left: `${point.x}%`, top: `${point.y}%`, '--node-color': node.color, '--fill-level': `${fill}%`, '--node-scale': `${0.88 + Math.min(value, 1.3) * 0.13}` } as React.CSSProperties} aria-label={`${node.name} 貢献度 ${value.toFixed(2)}。クリックで詳細と図の説明を表示`}>
                    <span className="tank-glass">
                      <span className="tank-liquid"><i /></span>
                      <span className="tank-initial">{node.initials}</span>
                      {effect?.rippleFrom && <span className="tank-rings" aria-hidden="true"><span /><span /><span /></span>}
                    </span>
                    <span className="tank-name">{node.name}</span>
                    {node.role && <span className="tank-role">{node.role}</span>}
                    <span className="tank-value"><AnimatedNumber value={value} /> <i>c</i></span>
                    {effect?.rippleFrom && <span className={`pulse-aura pulse-${pulse}`} aria-hidden="true" />}
                  </button>
                })}
                {mode === 'CENTRAL_BANK' && !nodes.some((node) => node.kind === 'bank') && <div className="bank-presence"><span>⌂</span> ソーシャルミニマム <b>均等分配</b></div>}
                <div className="network-legend"><span><i className="legend-line" /> 評価の流れ</span><span><i className="legend-dot" /> 貢献度</span><span><i className="legend-flow" /> 値の流量</span></div>
                <div className="canvas-coordinates">COMMUNITY / {nodes.filter((n) => n.kind === 'person').length} MEMBERS</div>
              </div>
              <div className="canvas-caption" aria-live="polite"><span className="caption-mark">↳</span><div><b>{explanations[explanationTopic].tab}</b><p>{explanations[explanationTopic].body}</p></div><button onClick={() => showExplanation(explanationTopic)}>詳しく読む <span>↓</span></button></div>
              <div className="canvas-footer"><div className="network-stats"><div><span className="stat-dot green" /><span>メンバー</span><b>{nodes.filter((node) => node.kind === 'person').length}</b></div><div><span className="stat-dot amber" /><span>カンパニー</span><b>{nodes.filter((node) => node.kind === 'company').length}</b></div><div><span className="stat-dot blue" /><span>総貢献度</span><b>{total.toFixed(2)}</b></div></div><button className="matrix-link" onClick={() => setCompanyOpen(true)}>評価行列を見る <span>↗</span></button></div>
            </section>

            <aside className="inspector-card card"><div className="inspector-heading"><div><div className="section-title">メンバー詳細</div><div className="subtle-text">ノードの状態と購買力</div></div><button className="canvas-menu">···</button></div>
              {selectedNode ? <><div className="selected-person"><div className="large-avatar" style={{ '--member-color': selectedNode.color } as React.CSSProperties}>{selectedNode.initials}<span className="online-mark" /></div><div><h3>{selectedNode.name}</h3><div className="person-meta">{selectedNode.kind === 'company' ? 'カンパニー' : selectedNode.kind === 'bank' ? '中央銀行' : 'コミュニティメンバー'} <span>·</span> ID-{selectedNode.id.slice(0, 3).toUpperCase()}</div></div><button className="person-more">···</button></div>
                <div className="contribution-panel"><div className="metric-heading"><span>{isDynamics && selectedNode.kind === 'bank' ? '中央銀行ノードの貢献度' : '現在の貢献度'}</span><span className="metric-live"><i /> LIVE</span></div><div className="contribution-number"><AnimatedNumber value={contributions[selectedIndex] ?? 0} digits={3} /><span> P</span><span className="metric-change">↗ 4.8%</span></div><div className="contribution-bar"><span style={{ width: `${Math.max(7, Math.min(100, ((contributions[selectedIndex] ?? 0) / Math.max(...contributions, 1)) * 100))}%`, background: selectedNode.color }} /></div><div className="bar-labels"><span>{isDynamics && selectedNode.kind === 'bank' ? '中央銀行法にのみ存在する主体' : 'コミュニティ平均'}</span><b>{(total / (nodes.length || 1)).toFixed(3)} P</b></div></div>
                <div className="inspector-metrics"><div className="inspector-metric"><span>購買力</span><b>{((contributions[selectedIndex] ?? 0) * (visualMatrix[selectedIndex]?.[selectedIndex] ?? 0)).toFixed(3)} <small>credits</small></b><span className="metric-hint">自己評価 × 貢献度</span></div><div className="inspector-metric"><span>予算制約 <small>{selectedReserveLabel}</small></span><b>{(matrix[selectedIndex]?.[selectedReserveColumn] ?? 0).toFixed(2)}</b><span className="metric-hint">利用可能な評価の割合</span></div></div>
                <div className="detail-separator" /><div className="evaluation-heading"><div className="section-title small-title">評価の内訳{isDynamics && dynamicRule === 'VIRTUAL_CENTRAL_BANK' ? ' · E′' : ''}</div><button className="text-button" onClick={() => setCompanyOpen(true)}>編集 <span>↗</span></button></div><div className="evaluation-list">{nodes.map((node, j) => <div className="evaluation-row" key={node.id}><span className="mini-avatar" style={{ '--member-color': node.color } as React.CSSProperties}>{node.initials}</span><span className="evaluation-name">{node.name}</span><div className="evaluation-track"><span style={{ width: `${(visualMatrix[selectedIndex]?.[j] ?? 0) * 100}%`, background: node.color }} /></div><b>{(visualMatrix[selectedIndex]?.[j] ?? 0).toFixed(2)}</b></div>)}</div>
              </> : <div className="empty-state">ノードを選択してください</div>}
            </aside>
          </div>

          <section className="evolution-journey card" id="evolution-journey" aria-label="3つの手法の進化プロセス">
            <div className="evolution-head">
              <div className="evolution-head-copy">
                <div className="evolution-overline"><span /> EVOLUTION OF THE RULES</div>
                <h2>3つの手法は、並列ではなく <em>段階的な進化</em> です。</h2>
                <p>「初期モデルの脆弱性」をひとつずつ取り除きながら、数理的に洗練させてきたプロセスです。</p>
              </div>
              <div className="evolution-summary"><span>NEXT CHAPTER</span><b>JOURNEY</b><i>01 — 03</i></div>
            </div>
            <ol className="evolution-timeline">
              {evolutionStages.map((stage, index) => {
                const isActive = evolutionStage === stage.id
                const nextStage = evolutionStages[index + 1]
                return (
                  <li key={stage.id} className={`evolution-stage ${isActive ? 'active' : ''} ${stage.status}`}>
                    <button className="stage-trigger" onClick={() => { switchMode(stage.id); setEvolutionStage(stage.id); }} aria-expanded={isActive}>
                      <span className="stage-marker"><i /></span>
                      <div className="stage-heading">
                        <span className="stage-step">{stage.step} · {stage.subtitle}</span>
                        <h3>{stage.title}</h3>
                      </div>
                      <span className={`stage-badge ${stage.status}`}>{stage.status === 'legacy' ? 'BASIC' : stage.status === 'improved' ? 'IMPROVED' : 'BEST'}</span>
                    </button>
                    {isActive && (
                      <div className="stage-detail">
                        <div className="stage-detail-grid">
                          <div className="stage-card issue"><span className="stage-card-kicker">課題</span><p>{stage.issue}</p></div>
                          <div className="stage-card solution"><span className="stage-card-kicker">改善</span><p>{stage.solution}</p><span className="stage-card-formula">{stage.preview.rule}</span></div>
                          <div className="stage-card result"><span className="stage-card-kicker">結果</span><p>{stage.result}</p></div>
                        </div>
                        <p className="stage-why"><b>なぜ重要か：</b>{stage.whyItMatters}</p>
                        <div className="stage-deep"><span className="stage-deep-kicker">深く読む</span><p>{stage.deepDive}</p></div>
                        <div className="stage-preview"><span className="stage-preview-kicker">このルールでは</span><b>{stage.preview.who}</b><p>{stage.preview.do}</p><button className="stage-action" onClick={() => switchMode(stage.id)}>このモードを開く <span>↗</span></button></div>
                      </div>
                    )}
                    {nextStage && <div className="stage-connector" aria-hidden="true"><span className="stage-arrow">↓</span><div className="stage-link">{stage.result.split('、')[0]}</div><span className="stage-link-next">{nextStage.title} が引き継ぐ</span></div>}
                  </li>
                )
              })}
            </ol>
            <div className="evolution-footnote"><span>結論</span>3つの手法のうち、仮想中央銀行法が <b>最も洗練</b> されています。中央銀行法・自己評価法の利点を保ちつつ、「中央銀行という実体」のデメリットを取り除いた完成形です。</div>

            <section className="use-cases" aria-label="PICSYの使われ方">
              <header className="use-cases-head">
                <div className="concept-overline"><span /> WHERE PICSY APPLIES</div>
                <h3>PICSYは、どんな場面で使えるか。</h3>
                <p>地域通貨・社内通貨・寄付・知識社会など、価値が人々の間で還流し合うあらゆるコミュニティに適用可能です。</p>
              </header>
              <div className="use-cases-grid">
                {applications.map((item) => <article key={item.tag} className="use-case-card"><span className="use-case-tag">{item.tag}</span><h4>{item.title}</h4><p>{item.body}</p></article>)}
              </div>
              <div className="use-cases-experiment">
                <div className="experiment-mark">✳</div>
                <div><span className="experiment-kicker">実証実験 · PICSY Lite</span><b>NTT-ICC・GLOCOMでのワークショップ</b><p>オンラインゲーム「gumonji」や「貿易ゲーム」を用いて、小学生でもPICSYのしくみを体感できることが確認されました。</p></div>
              </div>
            </section>
          </section>

          <section className="figure-reading card" id="figure-reading" aria-live="polite">
            <div className="reading-head">
              <div><div className="reading-overline"><span /> HOW TO READ THE FIGURE</div><h2>まず図を眺めて、それから意味をたどる。</h2><p>水槽や矢印にカーソルを合わせるか、下の項目を選んでみてください。</p></div>
              <div className="reading-step"><span>READING</span><b>{explanations[explanationTopic].number}</b><i>/ 07</i></div>
            </div>
            <div className="reading-tabs" role="tablist" aria-label="図の読み解き項目">
              {(Object.keys(explanations) as ExplanationTopic[]).map((topic) => <button key={topic} className={`reading-tab ${explanationTopic === topic ? 'active' : ''}`} onClick={() => setExplanationTopic(topic)} onMouseEnter={() => setExplanationTopic(topic)} role="tab" aria-selected={explanationTopic === topic}><span>{explanations[topic].number}</span>{explanations[topic].tab}</button>)}
            </div>
            <div className="reading-body" role="tabpanel">
              <div className="reading-copy"><div className="reading-topic-kicker">{explanations[explanationTopic].number} / FIGURE NOTE</div><h3>{explanations[explanationTopic].title}</h3><p>{explanations[explanationTopic].body}</p><div className="reading-note"><span>覚えておきたいこと</span>{explanations[explanationTopic].note}</div></div>
              <aside className="reading-context"><div className="context-icon">{explanationTopic === 'tank' ? '◒' : explanationTopic === 'pipe' ? '↗' : explanationTopic === 'flow' ? '⟳' : explanationTopic === 'company' ? '▦' : explanationTopic === 'bank' ? '⌂' : explanationTopic === 'transaction' ? '↔' : '✳'}</div><span className="context-label">いまのモード</span><b>{modes.find((item) => item.id === mode)?.label}</b><p>{mode === 'STATIC' ? '評価のつながりだけを固定して、貢献度が落ち着く先を観察します。' : mode === 'SELF_EVAL' ? '自己評価を予算として取引し、時間とともに評価がどう変わるかを見ます。' : mode === 'CENTRAL_BANK' ? '中央銀行への評価を使い、社会に配る基礎分を図に加えています。' : '中央銀行の分配先を評価ネットワークに合わせた場合を見ています。'}</p><button onClick={() => showExplanation(mode === 'CENTRAL_BANK' || mode === 'VIRTUAL_CENTRAL_BANK' ? 'bank' : mode === 'SELF_EVAL' ? 'transaction' : 'model')}>このモードの背景 <span>↗</span></button></aside>
            </div>
          </section>

          <section className={`control-card card ${isDynamics ? 'control-hidden' : ''}`}><div className="control-main"><div className="control-intro"><div className="control-symbol">◷</div><div><div className="section-title">時間の流れ</div><div className="subtle-text">ステップを進めて変化を観察</div></div></div><div className="timeline-controls"><button className="step-button" onClick={() => setTimeStep((step) => Math.max(0, step - 1))} aria-label="前のステップ">‹</button><button className={`play-button ${playing ? 'is-playing' : ''}`} onClick={() => setPlaying(!playing)} aria-label={playing ? '一時停止' : '再生'}>{playing ? 'Ⅱ' : '▶'}</button><button className="step-button" onClick={stepForward} aria-label="次のステップ">›</button><div className="timeline-line"><span style={{ width: `${Math.min(100, 14 + (timeStep % 75))}%` }} /><i /></div><span className="timeline-time">t = <b>{String(timeStep).padStart(2, '0')}</b></span></div><button className="reset-button" onClick={() => { setTimeStep(0); setPlaying(false); setMode('SELF_EVAL'); setMatrix(initialMatrix); setNodes(initialNodes); setSelected('aoi') }}>リセット <span>↺</span></button></div><div className="control-options"><label className="slider-label"><span>自然回収率 <b>γ</b></span><span className="slider-value">{gamma.toFixed(2)}</span><input aria-label="自然回収率" type="range" min="0" max="0.25" step="0.01" value={gamma} onChange={(event) => setGamma(Number(event.target.value))} /></label><div className="control-divider" /><button className="event-button" onClick={addMember}><span className="event-plus">＋</span><span>メンバーを追加</span></button><button className="event-button" onClick={establishCompany}><span className="event-company">▦</span><span>{company ? 'カンパニーを表示' : 'カンパニーを設立'}</span></button></div></section>

          <div className={`bottom-grid ${isDynamics ? 'dynamics-bottom' : ''}`}><section className={`transaction-card card ${isDynamics ? 'control-hidden' : ''}`}><div className="lower-card-heading"><div><div className="section-title">取引をシミュレート</div><div className="subtle-text">取引による評価と貢献度の変化を見る</div></div><span className="transaction-badge">{mode === 'CENTRAL_BANK' ? 'CENTRAL BANK' : mode === 'VIRTUAL_CENTRAL_BANK' ? 'VIRTUAL CENTRAL BANK' : 'SELF EVALUATION'}</span></div><div className="trade-form"><label className="select-field"><span>買い手</span><span className="select-wrap"><select value={buyer} onChange={(e) => setBuyer(e.target.value)}>{nodes.filter((n) => n.kind !== 'bank').map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}</select><span className="select-chevron">⌄</span></span></label><div className="trade-arrow">←</div><label className="select-field"><span>売り手</span><span className="select-wrap"><select value={seller} onChange={(e) => setSeller(e.target.value)}>{nodes.filter((n) => n.id !== buyer && n.kind !== 'bank').map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}</select><span className="select-chevron">⌄</span></span></label><label className="amount-field"><span>取引額</span><span className="amount-wrap"><input type="number" min="0.01" max="1" step="0.01" value={amount} onChange={(e) => setAmount(Math.max(0, Math.min(1, Number(e.target.value))))} /><span>credits</span></span></label><button className="execute-button" onClick={transact}>取引を実行 <span>↗</span></button></div><div className="formula-note"><span>i</span> 取引後、売り手の貢献度は評価行列の定常状態に基づいて更新されます。</div></section>
            <section className="activity-card card"><div className="lower-card-heading"><div><div className="section-title">アクティビティ</div><div className="subtle-text">コミュニティで起きたこと</div></div><button className="text-button" onClick={() => setEvents([])}>すべてクリア <span>×</span></button></div><div className="activity-list">{events.length ? events.slice(0, 3).map((event) => <div className="activity-row" key={event.id}><span className={`activity-icon ${event.kind}`}>{event.kind === 'trade' ? '↔' : event.kind === 'company' ? '▦' : '◷'}</span><div className="activity-copy"><b>{event.title}</b><span>{event.detail}</span></div><time>{event.time}</time></div>) : <div className="activity-empty">新しいアクティビティはありません</div>}</div></section></div>
          <footer className="page-footer"><span><b>PICSY</b> — Personal Intelligent Currency System</span><span>価値は、人から人へ。</span><a href="https://picsy.org" target="_blank" rel="noreferrer">モデルについて <span>↗</span></a></footer>
        </div>
      </main>

      {companyOpen && <div className="modal-backdrop" onClick={() => setCompanyOpen(false)}><div className="modal-card" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setCompanyOpen(false)}>×</button><div className="modal-eyebrow">PICSY EXPLORER</div><h2>{company ? 'カンパニーの仮想解体' : isDynamics && dynamicRule === 'VIRTUAL_CENTRAL_BANK' ? '仮想中央銀行法 · E′' : '評価行列 E'}</h2>{company ? <><p>カンパニーに集まった評価は、創業メンバーへ重ね合わせの原理で分配されます。実際のネットワークを変えずに、個人への価値の帰属を確認できます。</p><div className="company-members">{company.members?.map((id) => { const member = nodes.find((item) => item.id === id); return member ? <span key={id}><i style={{ background: member.color }} />{member.name}</span> : null })}</div><button className="execute-button modal-action" onClick={dissolveCompany}>仮想解体を実行 <span>↗</span></button></> : <><p>{isDynamics && dynamicRule === 'VIRTUAL_CENTRAL_BANK' ? 'B = diag(Eᵢᵢ)、Dᵢᵢ = 0、各行の ΣDᵢⱼ = N−1。E′ = E − B + BD/(N−1) を表示します。Dᵢᵢ=0 は仮想分配の受取先条件で、取引相手の自己取引ルールとは別です。中央銀行ノードはありません。' : '各行はメンバーの評価配分を表します。行の合計は常に 1 に保たれます。'}</p><div className="matrix-wrap"><table><thead><tr><th>{isDynamics && dynamicRule === 'VIRTUAL_CENTRAL_BANK' ? 'E′' : 'E'}</th>{nodes.map((node) => <th key={node.id}>{node.initials}</th>)}<th>Σ</th></tr></thead><tbody>{visualMatrix.map((row, i) => <tr key={nodes[i]?.id}><th>{nodes[i]?.initials}</th>{row.map((value, j) => <td key={j}><button disabled={isDynamics} onClick={() => setNodeWeight(i, j, Math.min(0.95, Math.max(0.01, value + 0.05)))} title={isDynamics ? '時間変化デモでは読み取り専用です' : 'クリックで +0.05'}>{value.toFixed(2)}</button></td>)}<td className="matrix-row-sum">{row.reduce((sum, value) => sum + value, 0).toFixed(2)}</td></tr>)}</tbody></table></div><button className="execute-button modal-action" onClick={() => setCompanyOpen(false)}>閉じる</button></>}</div></div>}
    </div>
  )
}

export default App
