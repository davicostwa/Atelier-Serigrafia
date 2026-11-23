import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Shuffle } from 'lucide-react';
import { GeometryFrame } from '../engine/bubbleEngine';
import { ASPECT_DIMENSIONS, AspectRatioPreset, StudioParams } from '../types/studio';

interface ArtboardCanvasProps {
  params: StudioParams;
  frame: GeometryFrame;
  phase: number;
  isPlaying: boolean;
  hasCustomOffsets: boolean;
  onTogglePlay: () => void;
  onScrubPhase: (nextPhase: number) => void;
  onChangeAspect: (aspect: AspectRatioPreset) => void;
  onRandomizeSeed: () => void;
  onResetOffsets: () => void;
  onDragBubble: (bubbleId: number, dx: number, dy: number) => void;
  customOffsets: Record<number, { dx: number; dy: number }>;
}

// Generate deterministic lightweight tileable grain data URL once per seed/intensity change
function createGrainDataUrl(seed: number): string {
  if (typeof document === 'undefined') return '';
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const img = ctx.createImageData(size, size);
  const data = img.data;
  let s = (seed || 1024) >>> 0;
  for (let i = 0; i < data.length; i += 4) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const v = (s >>> 24) & 0xff;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 36;
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL('image/png');
}

export function ArtboardCanvas({
  params,
  frame,
  phase,
  isPlaying,
  hasCustomOffsets,
  onTogglePlay,
  onScrubPhase,
  onChangeAspect,
  onRandomizeSeed,
  onResetOffsets,
  onDragBubble,
  customOffsets,
}: ArtboardCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<{
    bubbleId: number;
    startClientX: number;
    startClientY: number;
    origDx: number;
    origDy: number;
  } | null>(null);
  const [hoveredBubbleId, setHoveredBubbleId] = useState<number | null>(null);

  const grainDataUrl = useMemo(() => createGrainDataUrl(params.seed), [params.seed]);

  const { width, height, outerPaths, echoPaths, seamPaths, individualPaths, bubbles } = frame;
  const showFill = params.printMode === 'solid' || params.printMode === 'mixed';
  const showStroke = params.printMode === 'outline' || params.printMode === 'mixed';
  const strokeColor = params.printMode === 'solid' ? params.inkColor : params.lineColor;
  const isAnimating = isPlaying && params.motionPreset !== 'static';

  // Convert client pointer delta to SVG artboard coordinates
  const getSvgScale = () => {
    const svg = svgRef.current;
    if (!svg) return 1;
    const rect = svg.getBoundingClientRect();
    return rect.width > 0 ? width / rect.width : 1;
  };

  const findHitBubble = (clientX: number, clientY: number): number | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * width;
    const py = ((clientY - rect.top) / rect.height) * height;

    let closestId: number | null = null;
    let minD = Infinity;
    for (const b of bubbles) {
      const dist = Math.hypot(px - b.x, py - b.y);
      if (dist <= b.radius * b.aspect * 1.15 && dist < minD) {
        minD = dist;
        closestId = b.id;
      }
    }
    return closestId;
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const hitId = findHitBubble(e.clientX, e.clientY);
    if (hitId === null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const existing = customOffsets[hitId] || { dx: 0, dy: 0 };
    setDragging({
      bubbleId: hitId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origDx: existing.dx,
      origDy: existing.dy,
    });
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (dragging) {
      const scale = getSvgScale();
      const dx = dragging.origDx + (e.clientX - dragging.startClientX) * scale;
      const dy = dragging.origDy + (e.clientY - dragging.startClientY) * scale;
      onDragBubble(dragging.bubbleId, dx, dy);
      return;
    }
    setHoveredBubbleId(findHitBubble(e.clientX, e.clientY));
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (dragging) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore if pointer already released
      }
      setDragging(null);
    }
  };

  useEffect(() => {
    setHoveredBubbleId(null);
  }, [params.seed]);

  const aspectOptions: AspectRatioPreset[] = ['1:1', '4:5', '4:3', '16:9'];
  const bleedScale = (params.inkBleed * 1.65).toFixed(2);

  return (
    <main className="flex-1 min-w-0 flex flex-col items-center justify-center p-6 lg:p-10 relative overflow-hidden">
      {/* Artboard Stage Container */}
      <div className="w-full flex-1 min-h-0 flex items-center justify-center">
        <div
          className="relative rounded-xl overflow-hidden shadow-[0_24px_64px_-16px_rgba(0,0,0,0.14),0_0_0_1px_rgba(0,0,0,0.06)] transition-[aspect-ratio] duration-200 ease-out"
          style={{
            aspectRatio: `${width} / ${height}`,
            maxHeight: '100%',
            maxWidth: '100%',
            height: width >= height ? 'auto' : '100%',
            width: width >= height ? 'min(100%, 660px)' : 'auto',
          }}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={() => {
              if (!dragging) setHoveredBubbleId(null);
            }}
            className={`w-full h-full block select-none touch-none ${
              dragging ? 'cursor-grabbing' : hoveredBubbleId !== null ? 'cursor-grab' : 'cursor-default'
            }`}
            aria-label="Área de visualização da arte serigráfica"
          >
            <defs>
              <clipPath id="stage-artboard-clip">
                <rect x="0" y="0" width={width} height={height} />
              </clipPath>

              {outerPaths.length > 0 && (
                <clipPath id="stage-outer-union-clip">
                  {outerPaths.map((d, idx) => (
                    <path key={idx} d={d} />
                  ))}
                </clipPath>
              )}

              {params.inkBleed > 0.12 && (
                <filter id="stage-ink-bleed" x="-4%" y="-4%" width="108%" height="108%">
                  <feTurbulence
                    type="fractalNoise"
                    baseFrequency="0.048"
                    numOctaves="2"
                    seed={params.seed}
                    result="noise"
                  />
                  <feDisplacementMap
                    in="SourceGraphic"
                    in2="noise"
                    scale={bleedScale}
                    xChannelSelector="R"
                    yChannelSelector="G"
                  />
                </filter>
              )}

              {grainDataUrl && (
                <pattern
                  id="stage-paper-grain"
                  width="128"
                  height="128"
                  patternUnits="userSpaceOnUse"
                >
                  <image href={grainDataUrl} width="128" height="128" />
                </pattern>
              )}
            </defs>

            {/* Surface Background */}
            <rect x="0" y="0" width={width} height={height} fill={params.surfaceColor} />

            {/* Serigraphy Artwork */}
            <g
              clipPath="url(#stage-artboard-clip)"
              filter={params.inkBleed > 0.12 ? 'url(#stage-ink-bleed)' : undefined}
            >
              {showFill && (
                <g>
                  {outerPaths.map((d, idx) => (
                    <path key={`fill-${idx}`} d={d} fill={params.inkColor} />
                  ))}
                </g>
              )}

              {params.junctionStyle === 'overlap' && showStroke && (
                <g clipPath="url(#stage-outer-union-clip)" opacity={0.44}>
                  {individualPaths.map((d, idx) => (
                    <path
                      key={`ov-${idx}`}
                      d={d}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={Math.max(0.6, params.strokeWidth * 0.72)}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                </g>
              )}

              {params.junctionStyle === 'seam' && showStroke && (
                <g clipPath="url(#stage-outer-union-clip)" opacity={0.74}>
                  {seamPaths.map((d, idx) => (
                    <path
                      key={`seam-${idx}`}
                      d={d}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={Math.max(0.6, params.strokeWidth * 0.85)}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                </g>
              )}

              {params.doubleContour && showStroke && (
                <g opacity={0.78}>
                  {echoPaths.map((d, idx) => (
                    <path
                      key={`echo-${idx}`}
                      d={d}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={Math.max(0.6, params.strokeWidth * 0.88)}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                </g>
              )}

              {showStroke && (
                <g>
                  {outerPaths.map((d, idx) => (
                    <path
                      key={`outer-${idx}`}
                      d={d}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={params.strokeWidth}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                </g>
              )}
            </g>

            {/* Matte Serigraphy Paper Grain Overlay */}
            {params.grainIntensity > 0.02 && grainDataUrl && (
              <rect
                x="0"
                y="0"
                width={width}
                height={height}
                fill="url(#stage-paper-grain)"
                opacity={params.grainIntensity * 0.95}
                style={{ mixBlendMode: 'overlay', pointerEvents: 'none' }}
              />
            )}
          </svg>
        </div>
      </div>

      {/* Minimal Floating Stage Toolbar */}
      <div className="mt-5 shrink-0 flex flex-wrap items-center justify-center gap-3 px-4 py-2 bg-white/90 backdrop-blur-md rounded-xl border border-black/[0.06] shadow-[0_4px_20px_-6px_rgba(0,0,0,0.06)]">
        {/* Playback */}
        <button
          type="button"
          onClick={onTogglePlay}
          disabled={params.motionPreset === 'static'}
          aria-label={isAnimating ? 'Pausar animação' : 'Reproduzir animação'}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            isAnimating
              ? 'bg-[#1D1D1F] text-white'
              : 'bg-black/[0.05] text-[#1D1D1F] hover:bg-black/[0.09]'
          }`}
        >
          {isAnimating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isAnimating ? 'Pausar' : 'Animar'}</span>
        </button>

        {/* Cycle Phase Scrubber */}
        <div className="flex items-center gap-2.5 px-1">
          <input
            type="range"
            min={0}
            max={1}
            step={0.005}
            value={phase}
            onChange={(e) => onScrubPhase(parseFloat(e.target.value))}
            aria-label="Fase do ciclo de animação"
            className="studio-slider !w-24 sm:!w-28"
          />
          <span className="text-[11px] font-mono tabular-nums text-[#6E6E73] w-9 text-right">
            {Math.round(phase * 100)}%
          </span>
        </div>

        <span className="h-4 w-px bg-black/[0.08]" aria-hidden="true" />

        {/* Aspect Ratio Selector */}
        <div className="flex items-center gap-0.5 bg-black/[0.04] p-0.5 rounded-lg">
          {aspectOptions.map((ratio) => {
            const active = params.aspectRatio === ratio;
            return (
              <button
                key={ratio}
                type="button"
                onClick={() => onChangeAspect(ratio)}
                className={`px-2 py-1 text-[11px] font-mono tabular-nums rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-white text-[#1D1D1F] font-medium shadow-xs'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                {ASPECT_DIMENSIONS[ratio].label}
              </button>
            );
          })}
        </div>

        <span className="h-4 w-px bg-black/[0.08]" aria-hidden="true" />

        {/* Re-seed */}
        <button
          type="button"
          onClick={onRandomizeSeed}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium text-[#1D1D1F] hover:bg-black/[0.05] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Shuffle className="w-3.5 h-3.5 text-[#6E6E73]" />
          <span>Nova Semente</span>
        </button>

        {hasCustomOffsets && (
          <button
            type="button"
            onClick={onResetOffsets}
            title="Restaurar posições originais das bolhas"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[12px] text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-black/[0.05] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restaurar</span>
          </button>
        )}
      </div>
    </main>
  );
}
