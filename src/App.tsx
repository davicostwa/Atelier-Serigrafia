import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArtboardCanvas } from './components/ArtboardCanvas';
import { ControlPanel } from './components/ControlPanel';
import { TopBar } from './components/TopBar';
import { computeGeometryFrame, generateBubbleSeeds } from './engine/bubbleEngine';
import { copySvgToClipboard, downloadPngFile, downloadSvgFile } from './engine/exportUtils';
import {
  ASPECT_DIMENSIONS,
  AspectRatioPreset,
  DEFAULT_PARAMS,
  STUDIO_PRESETS,
  StudioParams,
  StudioPreset,
} from './types/studio';

export default function App() {
  const [params, setParams] = useState<StudioParams>(DEFAULT_PARAMS);
  const [activePresetId, setActivePresetId] = useState<string | null>('indigo-chalk');
  const [customOffsets, setCustomOffsets] = useState<Record<number, { dx: number; dy: number }>>({});

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [isPlaying, setIsPlaying] = useState<boolean>(() => !prefersReducedMotion);
  const [phase, setPhase] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const lastTimeRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  }, []);

  // Cyclic 60fps loop
  useEffect(() => {
    if (!isPlaying || params.motionPreset === 'static') {
      lastTimeRef.current = null;
      return;
    }

    let rafId = 0;
    const durationMs = Math.max(1500, params.cycleDuration * 1000);

    const tick = (now: number) => {
      if (lastTimeRef.current !== null) {
        const dt = now - lastTimeRef.current;
        setPhase((prev) => (prev + dt / durationMs) % 1);
      }
      lastTimeRef.current = now;
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      lastTimeRef.current = null;
    };
  }, [isPlaying, params.motionPreset, params.cycleDuration]);

  // Keyboard shortcuts: Space (play/pause), R (new seed)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON')
      ) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === 'r' || e.key === 'R') {
        setParams((prev) => ({ ...prev, seed: Math.floor(Math.random() * 90000) + 1000 }));
        setCustomOffsets({});
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const { width, height } = ASPECT_DIMENSIONS[params.aspectRatio];

  const seeds = useMemo(
    () =>
      generateBubbleSeeds(
        params.seed,
        width,
        height,
        params.density,
        params.baseScale,
        params.sizeVariation,
        params.compositionMode
      ),
    [
      params.seed,
      width,
      height,
      params.density,
      params.baseScale,
      params.sizeVariation,
      params.compositionMode,
    ]
  );

  const frame = useMemo(
    () => computeGeometryFrame(params, seeds, phase, customOffsets),
    [params, seeds, phase, customOffsets]
  );

  const handleParamChange = useCallback(
    <K extends keyof StudioParams>(key: K, value: StudioParams[K]) => {
      setParams((prev) => ({ ...prev, [key]: value }));
      if (key !== 'motionPreset' && key !== 'cycleDuration' && key !== 'motionAmplitude') {
        setActivePresetId(null);
      }
      if (key === 'density' || key === 'compositionMode') {
        setCustomOffsets({});
      }
      if (key === 'motionPreset' && value !== 'static') {
        setIsPlaying(true);
      }
    },
    []
  );

  const handleSelectPreset = useCallback((preset: StudioPreset) => {
    setParams((prev) => ({
      ...prev,
      ...preset.params,
    }));
    setActivePresetId(preset.id);
    setCustomOffsets({});
  }, []);

  const handleSwapColors = useCallback(() => {
    setParams((prev) => {
      if (prev.printMode === 'solid') {
        return {
          ...prev,
          surfaceColor: prev.inkColor,
          inkColor: prev.surfaceColor,
          lineColor: prev.surfaceColor,
        };
      }
      return {
        ...prev,
        surfaceColor: prev.lineColor,
        lineColor: prev.surfaceColor,
      };
    });
    setActivePresetId(null);
  }, []);

  const handleRandomizeSeed = useCallback(() => {
    setParams((prev) => ({ ...prev, seed: Math.floor(Math.random() * 90000) + 1000 }));
    setCustomOffsets({});
  }, []);

  const handleDragBubble = useCallback((bubbleId: number, dx: number, dy: number) => {
    setCustomOffsets((prev) => ({
      ...prev,
      [bubbleId]: { dx, dy },
    }));
  }, []);

  const handleExportSvg = useCallback(
    (includeTexture: boolean) => {
      downloadSvgFile(frame, params, includeTexture);
      showToast(includeTexture ? 'SVG com textura exportado' : 'SVG vetor exportado');
    },
    [frame, params, showToast]
  );

  const handleExportPng = useCallback(
    async (scale: number) => {
      await downloadPngFile(frame, params, scale);
      showToast(`PNG ${scale}× exportado`);
    },
    [frame, params, showToast]
  );

  const handleCopySvg = useCallback(async () => {
    const ok = await copySvgToClipboard(frame, params);
    showToast(ok ? 'Código SVG copiado' : 'Não foi possível copiar o SVG');
  }, [frame, params, showToast]);

  return (
    <div className="min-h-screen lg:h-screen flex flex-col bg-[#F5F5F7] text-[#1D1D1F] overflow-x-hidden lg:overflow-hidden">
      <TopBar
        activePresetId={activePresetId}
        onSelectPreset={handleSelectPreset}
        onExportSvg={handleExportSvg}
        onExportPng={handleExportPng}
        onCopySvg={handleCopySvg}
      />

      {/* Mobile Presets Strip */}
      <div className="flex md:hidden items-center gap-4 px-5 py-2.5 bg-white/70 border-b border-black/[0.06] overflow-x-auto shrink-0">
        {STUDIO_PRESETS.map((preset) => {
          const active = activePresetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className={`text-[12px] whitespace-nowrap shrink-0 transition-colors ${
                active ? 'text-[#1D1D1F] font-semibold' : 'text-[#6E6E73]'
              }`}
            >
              {preset.name}
            </button>
          );
        })}
      </div>

      {/* Main Workspace Split */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        <ArtboardCanvas
          params={params}
          frame={frame}
          phase={phase}
          isPlaying={isPlaying}
          hasCustomOffsets={Object.keys(customOffsets).length > 0}
          onTogglePlay={() => setIsPlaying((p) => !p)}
          onScrubPhase={(next) => {
            setIsPlaying(false);
            setPhase(next);
          }}
          onChangeAspect={(aspect: AspectRatioPreset) => handleParamChange('aspectRatio', aspect)}
          onRandomizeSeed={handleRandomizeSeed}
          onResetOffsets={() => setCustomOffsets({})}
          onDragBubble={handleDragBubble}
          customOffsets={customOffsets}
        />

        <ControlPanel
          params={params}
          onChange={handleParamChange}
          onSwapColors={handleSwapColors}
        />
      </div>

      {/* Subtle Floating Feedback Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-[#1D1D1F] text-white text-[13px] font-medium shadow-[0_12px_32px_-8px_rgba(0,0,0,0.28)] pointer-events-none"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
