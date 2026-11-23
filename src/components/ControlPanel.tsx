import React from 'react';
import { ArrowLeftRight } from 'lucide-react';
import {
  CompositionMode,
  JunctionStyle,
  MotionPreset,
  PrintStyleMode,
  StudioParams,
} from '../types/studio';

interface ControlPanelProps {
  params: StudioParams;
  onChange: <K extends keyof StudioParams>(key: K, value: StudioParams[K]) => void;
  onSwapColors: () => void;
}

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (val: number) => void;
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  onChange,
}: SliderRowProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <label className="text-[13px] text-[#1D1D1F] font-normal">{label}</label>
        <span className="text-[12px] font-mono tabular-nums text-[#6E6E73]">
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="studio-slider"
      />
    </div>
  );
}

interface SegmentedProps<T extends string> {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (val: T) => void;
}

function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  return (
    <div
      className="grid gap-1 p-1 bg-[#F2F2F4] rounded-lg"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`py-1.5 px-2 text-[12px] rounded-md transition-all duration-150 whitespace-nowrap truncate cursor-pointer ${
              active
                ? 'bg-white text-[#1D1D1F] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                : 'text-[#6E6E73] hover:text-[#1D1D1F] font-normal'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

interface ColorSwatchInputProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}

function ColorSwatchInput({ label, value, onChange }: ColorSwatchInputProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-[#1D1D1F]">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value.toUpperCase()}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) {
              onChange(v);
            }
          }}
          maxLength={7}
          aria-label={`Código hexadecimal para ${label}`}
          className="w-[74px] text-right text-[12px] font-mono tabular-nums text-[#6E6E73] bg-transparent border-b border-transparent focus:border-black/20 focus:text-[#1D1D1F] focus:outline-none py-0.5"
        />
        <label className="relative w-7 h-7 rounded-lg border border-black/15 shadow-xs overflow-hidden cursor-pointer shrink-0">
          <span
            className="block w-full h-full"
            style={{ backgroundColor: value }}
          />
          <input
            type="color"
            value={/^#[0-9A-Fa-f]{6}$/.test(value) ? value : '#000000'}
            onChange={(e) => onChange(e.target.value)}
            aria-label={`Selecionar ${label}`}
            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
}

export function ControlPanel({ params, onChange, onSwapColors }: ControlPanelProps) {
  const showStrokeControls = params.printMode !== 'solid';
  const showInkFillColor = params.printMode !== 'outline';

  return (
    <aside className="w-full lg:w-[348px] shrink-0 bg-white border-t lg:border-t-0 lg:border-l border-black/[0.06] lg:h-full overflow-y-auto studio-scroll">
      <div className="p-6 space-y-7">
        {/* Section 1: Impressão & Composição */}
        <section className="space-y-4">
          <h2 className="text-[12px] font-semibold text-[#86868B] tracking-[-0.01em]">
            Impressão e Composição
          </h2>

          <div className="space-y-2.5">
            <span className="block text-[13px] text-[#1D1D1F]">Acabamento</span>
            <SegmentedControl<PrintStyleMode>
              value={params.printMode}
              onChange={(v) => onChange('printMode', v)}
              options={[
                { value: 'outline', label: 'Traço' },
                { value: 'mixed', label: 'Misto' },
                { value: 'solid', label: 'Sólido' },
              ]}
            />
          </div>

          <div className="space-y-2.5">
            <span className="block text-[13px] text-[#1D1D1F]">Distribuição</span>
            <SegmentedControl<CompositionMode>
              value={params.compositionMode}
              onChange={(v) => onChange('compositionMode', v)}
              options={[
                { value: 'organic', label: 'Orgânico' },
                { value: 'grid', label: 'Grade' },
                { value: 'constellation', label: 'Núcleos' },
              ]}
            />
          </div>
        </section>

        {/* Section 2: Geometria das Bolhas */}
        <section className="pt-6 border-t border-black/[0.06] space-y-5">
          <h2 className="text-[12px] font-semibold text-[#86868B] tracking-[-0.01em]">
            Bolhas e Geometria
          </h2>

          <SliderRow
            label="Densidade"
            value={params.density}
            min={4}
            max={44}
            step={1}
            displayValue={`${Math.round(params.density)}`}
            onChange={(v) => onChange('density', v)}
          />

          <SliderRow
            label="Variação de Tamanho"
            value={params.sizeVariation}
            min={0}
            max={1}
            step={0.01}
            displayValue={`${Math.round(params.sizeVariation * 100)}%`}
            onChange={(v) => onChange('sizeVariation', v)}
          />

          <SliderRow
            label="Escala Base"
            value={params.baseScale}
            min={0.35}
            max={1.45}
            step={0.01}
            displayValue={`${Math.round(params.baseScale * 100)}%`}
            onChange={(v) => onChange('baseScale', v)}
          />

          <SliderRow
            label="Bordas Arredondadas"
            value={params.roundness}
            min={0}
            max={1}
            step={0.01}
            displayValue={`${Math.round(params.roundness * 100)}%`}
            onChange={(v) => onChange('roundness', v)}
          />
        </section>

        {/* Section 3: Ink Bleed & Junções */}
        <section className="pt-6 border-t border-black/[0.06] space-y-5">
          <h2 className="text-[12px] font-semibold text-[#86868B] tracking-[-0.01em]">
            Ink Bleed e Junções
          </h2>

          <SliderRow
            label="Ink Bleed"
            value={params.inkBleed}
            min={0}
            max={1}
            step={0.01}
            displayValue={`${Math.round(params.inkBleed * 100)}%`}
            onChange={(v) => onChange('inkBleed', v)}
          />

          <div className="space-y-2.5">
            <span className="block text-[13px] text-[#1D1D1F]">Junção das Linhas</span>
            <SegmentedControl<JunctionStyle>
              value={params.junctionStyle}
              onChange={(v) => onChange('junctionStyle', v)}
              options={[
                { value: 'merged', label: 'Fusão' },
                { value: 'seam', label: 'Costura' },
                { value: 'overlap', label: 'Sobreposição' },
              ]}
            />
          </div>

          {showStrokeControls && (
            <SliderRow
              label="Espessura da Linha"
              value={params.strokeWidth}
              min={0.5}
              max={7}
              step={0.1}
              displayValue={`${params.strokeWidth.toFixed(1)} px`}
              onChange={(v) => onChange('strokeWidth', v)}
            />
          )}

          {showStrokeControls && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[#1D1D1F]">Contorno Duplo</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={params.doubleContour}
                  onClick={() => onChange('doubleContour', !params.doubleContour)}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D1D1F]/30 ${
                    params.doubleContour ? 'bg-[#1D1D1F]' : 'bg-black/[0.14]'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform duration-200 ${
                      params.doubleContour ? 'translate-x-4.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {params.doubleContour && (
                <SliderRow
                  label="Afastamento Interno"
                  value={params.doubleContourOffset}
                  min={8}
                  max={40}
                  step={1}
                  displayValue={`${Math.round(params.doubleContourOffset)} px`}
                  onChange={(v) => onChange('doubleContourOffset', v)}
                />
              )}
            </div>
          )}

          <SliderRow
            label="Textura Serigráfica"
            value={params.grainIntensity}
            min={0}
            max={1}
            step={0.01}
            displayValue={`${Math.round(params.grainIntensity * 100)}%`}
            onChange={(v) => onChange('grainIntensity', v)}
          />
        </section>

        {/* Section 4: Paleta de Cores */}
        <section className="pt-6 border-t border-black/[0.06] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[12px] font-semibold text-[#86868B] tracking-[-0.01em]">
              Cores
            </h2>
            <button
              type="button"
              onClick={onSwapColors}
              className="inline-flex items-center gap-1 text-[12px] text-[#6E6E73] hover:text-[#1D1D1F] transition-colors cursor-pointer"
            >
              <ArrowLeftRight className="w-3 h-3" />
              <span>Inverter</span>
            </button>
          </div>

          <div className="space-y-3">
            {showStrokeControls && (
              <ColorSwatchInput
                label="Cor da Linha"
                value={params.lineColor}
                onChange={(hex) => onChange('lineColor', hex)}
              />
            )}
            <ColorSwatchInput
              label="Superfície"
              value={params.surfaceColor}
              onChange={(hex) => onChange('surfaceColor', hex)}
            />
            {showInkFillColor && (
              <ColorSwatchInput
                label="Tinta Serigráfica"
                value={params.inkColor}
                onChange={(hex) => onChange('inkColor', hex)}
              />
            )}
          </div>
        </section>

        {/* Section 5: Animação Cíclica */}
        <section className="pt-6 border-t border-black/[0.06] space-y-5">
          <h2 className="text-[12px] font-semibold text-[#86868B] tracking-[-0.01em]">
            Animação Cíclica
          </h2>

          <SegmentedControl<MotionPreset>
            value={params.motionPreset}
            onChange={(v) => onChange('motionPreset', v)}
            options={[
              { value: 'breathe', label: 'Respiração' },
              { value: 'orbit', label: 'Orbital' },
              { value: 'wave', label: 'Onda' },
              { value: 'static', label: 'Estático' },
            ]}
          />

          {params.motionPreset !== 'static' && (
            <>
              <SliderRow
                label="Duração do Ciclo"
                value={params.cycleDuration}
                min={3}
                max={16}
                step={0.5}
                displayValue={`${params.cycleDuration.toFixed(1)} s`}
                onChange={(v) => onChange('cycleDuration', v)}
              />

              <SliderRow
                label="Amplitude do Movimento"
                value={params.motionAmplitude}
                min={0.1}
                max={1}
                step={0.01}
                displayValue={`${Math.round(params.motionAmplitude * 100)}%`}
                onChange={(v) => onChange('motionAmplitude', v)}
              />
            </>
          )}
        </section>
      </div>
    </aside>
  );
}
