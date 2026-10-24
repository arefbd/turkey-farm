/** نمودارهای SVG سبک — پورت React از پیاده‌سازی اصلی (بدون کتابخانه) */
import { useId } from 'react';
import { n, short } from '../lib/format';

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log(v) / Math.LN10));
  const f = v / exp;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nf * exp;
}

export interface Series {
  values: number[];
  color: string;
  opacity?: number;
}

export function Bars({
  labels,
  series,
  height = 220,
  barWidth,
}: {
  labels: string[];
  series: Series[];
  height?: number;
  barWidth?: number;
}) {
  const W = 600;
  const H = height;
  const padL = 46;
  const padR = 10;
  const padT = 16;
  const padB = 28;

  let max = 0;
  series.forEach((s) => s.values.forEach((v) => (max = Math.max(max, v))));
  max = niceMax(max || 1);

  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const gw = labels.length ? plotW / labels.length : plotW;
  const bw = Math.max(5, Math.min(barWidth || 14, (gw * 0.62) / Math.max(1, series.length)));
  const gap = 3;

  return (
    <div className="chart-wrap">
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img">
        {[0, 1, 2, 3].map((i) => {
          const y = padT + (plotH * i) / 3;
          return (
            <g key={i}>
              <line
                x1={padL}
                y1={y}
                x2={W - padR}
                y2={y}
                stroke="var(--line)"
                strokeWidth={1}
                strokeDasharray={i === 3 ? '0' : '4 5'}
              />
              <text x={padL - 6} y={y - 5} fontSize={9} fill="var(--muted)" textAnchor="end">
                {short(max - (max * i) / 3)}
              </text>
            </g>
          );
        })}

        {labels.map((lb, li) => {
          const cx = padL + gw * li + gw / 2;
          const totalW = series.length * bw + (series.length - 1) * gap;
          return (
            <g key={lb + li}>
              {series.map((s, si) => {
                const v = s.values[li] || 0;
                const h = plotH * (v / max);
                const x = cx - totalW / 2 + si * (bw + gap);
                const y2 = padT + plotH - h;
                return (
                  <rect
                    key={si}
                    x={+x.toFixed(1)}
                    y={+y2.toFixed(1)}
                    width={bw}
                    height={+Math.max(1, h).toFixed(1)}
                    rx={Math.min(6, bw / 2)}
                    fill={s.color}
                    opacity={s.opacity ?? 0.95}
                  />
                );
              })}
              <text x={cx} y={H - 8} fontSize={10.5} fill="var(--muted)" textAnchor="middle">
                {lb}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function LineChart({
  labels,
  values,
  color = '#7C3AED',
  height = 200,
  dots = true,
}: {
  labels: string[];
  values: number[];
  color?: string;
  height?: number;
  dots?: boolean;
}) {
  const gid = useId().replace(/:/g, '');
  if (!values.length) return <div className="chart-empty">داده‌ای برای نمایش نیست</div>;

  const W = 600;
  const H = height;
  const padL = 12;
  const padR = 12;
  const padT = 16;
  const padB = 26;
  const max = niceMax(Math.max(...values) || 1);
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const step = values.length > 1 ? plotW / (values.length - 1) : 0;

  const pts = values.map((v, i) => [padL + step * i, padT + plotH - plotH * (v / max)] as const);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area =
    d +
    ` L${pts[pts.length - 1][0].toFixed(1)} ${padT + plotH}` +
    ` L${pts[0][0].toFixed(1)} ${padT + plotH} Z`;

  return (
    <div className="chart-wrap">
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((i) => {
          const y = padT + (plotH * i) / 3;
          return (
            <line
              key={i}
              x1={padL}
              y1={y}
              x2={W - padR}
              y2={y}
              stroke="var(--line)"
              strokeDasharray={i === 3 ? '0' : '4 5'}
            />
          );
        })}
        <path d={area} fill={`url(#${gid})`} />
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {dots &&
          pts.map((p, i) => (
            <circle
              key={i}
              cx={p[0].toFixed(1)}
              cy={p[1].toFixed(1)}
              r={3}
              fill="#fff"
              stroke={color}
              strokeWidth={2}
            />
          ))}
        {labels.map((lb, i) => {
          if (labels.length > 8 && i % 2) return null;
          if (!pts[i]) return null;
          return (
            <text
              key={i}
              x={pts[i][0].toFixed(1)}
              y={H - 7}
              fontSize={10}
              fill="var(--muted)"
              textAnchor="middle"
            >
              {lb}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export interface DonutItem {
  label: string;
  value: number;
  color: string;
}

export function Donut({
  items,
  size = 168,
  centerLabel = 'جمع',
  centerValue = '',
}: {
  items: DonutItem[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const r = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;
  const visible = items.filter((i) => i.value > 0);
  const total = visible.reduce((a, b) => a + b.value, 0) || 1;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg className="donut" viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--line)" strokeWidth={14} />
      {visible.map((it, i) => {
        const len = circ * (it.value / total);
        const dash = Math.max(0, len - 3);
        const el = (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={it.color}
            strokeWidth={14}
            strokeLinecap="round"
            strokeDasharray={`${dash.toFixed(2)} ${(circ - dash).toFixed(2)}`}
            strokeDashoffset={(-offset).toFixed(2)}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
        offset += len;
        return el;
      })}
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize={11} fill="var(--muted)">
        {centerLabel}
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" fontSize={15} fontWeight={700} fill="var(--ink)">
        {centerValue}
      </text>
    </svg>
  );
}

export function Ring({
  value,
  color = '#7C3AED',
  size = 64,
}: {
  value: number;
  color?: string;
  size?: number;
}) {
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <svg className="ring" viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={6} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={`${((c * v) / 100).toFixed(1)} ${c.toFixed(1)}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x={size / 2}
        y={size / 2 + 4}
        textAnchor="middle"
        fontSize={11}
        fontWeight={700}
        fill="var(--ink)"
      >
        {n(v, 0)}٪
      </text>
    </svg>
  );
}

export function Spark({ values, color = '#7C3AED' }: { values: number[]; color?: string }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values) || 1;
  const min = Math.min(...values);
  const W = 90;
  const H = 26;
  const d = values
    .map((v, i) => {
      const x = (W * i) / (values.length - 1);
      const y = H - 3 - (H - 6) * ((v - min) / (max - min || 1));
      return `${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' L');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="spark">
      <path d={`M${d}`} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}
