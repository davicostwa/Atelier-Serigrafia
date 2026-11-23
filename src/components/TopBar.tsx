import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Copy, Download, FileCode2, Image as ImageIcon } from 'lucide-react';
import { STUDIO_PRESETS, StudioPreset } from '../types/studio';

interface TopBarProps {
  activePresetId: string | null;
  onSelectPreset: (preset: StudioPreset) => void;
  onExportSvg: (includeTexture: boolean) => void;
  onExportPng: (scale: number) => void;
  onCopySvg: () => Promise<void>;
}

export function TopBar({
  activePresetId,
  onSelectPreset,
  onExportSvg,
  onExportPng,
  onCopySvg,
}: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuOpen]);

  const handleCopy = async () => {
    await onCopySvg();
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setMenuOpen(false);
    }, 900);
  };

  return (
    <header className="h-14 shrink-0 bg-white/85 backdrop-blur-xl border-b border-black/[0.06] px-6 lg:px-8 flex items-center justify-between gap-8 relative z-30">
      {/* Zone 1: Brand Wordmark */}
      <span className="text-[15px] font-semibold tracking-[-0.02em] text-[#1D1D1F] whitespace-nowrap shrink-0">
        Atelier Serigrafia
      </span>

      {/* Zone 2: Preset Navigation Links */}
      <nav
        aria-label="Estilos de referência"
        className="hidden md:flex items-center gap-6 overflow-x-auto"
      >
        {STUDIO_PRESETS.map((preset) => {
          const active = activePresetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset)}
              className={`relative py-1 text-[13px] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D1D1F]/25 rounded ${
                active
                  ? 'text-[#1D1D1F] font-medium'
                  : 'text-[#6E6E73] hover:text-[#1D1D1F] font-normal'
              }`}
            >
              {preset.name}
              {active && (
                <span className="absolute left-0 right-0 -bottom-[1px] h-[1.5px] bg-[#1D1D1F] rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Primary Export Action */}
      <div className="relative shrink-0" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-expanded={menuOpen}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[#1D1D1F] hover:bg-[#333336] active:scale-[0.98] text-white text-[13px] font-medium transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D1D1F]/40"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar</span>
          <ChevronDown
            className={`w-3.5 h-3.5 opacity-75 transition-transform duration-150 ${
              menuOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-xl rounded-xl border border-black/[0.08] shadow-[0_18px_48px_-12px_rgba(0,0,0,0.16)] py-1.5 z-50">
            <div className="px-3 py-1.5 text-[11px] font-medium text-[#86868B]">
              Vetor (SVG)
            </div>
            <button
              type="button"
              onClick={() => {
                onExportSvg(false);
                setMenuOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-[13px] text-[#1D1D1F] hover:bg-black/[0.04] flex items-center justify-between transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <FileCode2 className="w-4 h-4 text-[#6E6E73]" />
                <span>SVG Vetor Limpo</span>
              </span>
              <span className="text-[11px] font-mono text-[#86868B]">Figma / AI</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onExportSvg(true);
                setMenuOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-[13px] text-[#1D1D1F] hover:bg-black/[0.04] flex items-center justify-between transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <FileCode2 className="w-4 h-4 text-[#6E6E73]" />
                <span>SVG com Textura</span>
              </span>
              <span className="text-[11px] font-mono text-[#86868B]">Filtro</span>
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="w-full px-3 py-2 text-left text-[13px] text-[#1D1D1F] hover:bg-black/[0.04] flex items-center justify-between transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4 text-[#6E6E73]" />
                )}
                <span>{copied ? 'SVG Copiado' : 'Copiar Código SVG'}</span>
              </span>
            </button>

            <div className="my-1.5 border-t border-black/[0.06]" />

            <div className="px-3 py-1.5 text-[11px] font-medium text-[#86868B]">
              Imagem (PNG)
            </div>
            <button
              type="button"
              onClick={() => {
                onExportPng(1);
                setMenuOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-[13px] text-[#1D1D1F] hover:bg-black/[0.04] flex items-center justify-between transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <ImageIcon className="w-4 h-4 text-[#6E6E73]" />
                <span>PNG Padrão</span>
              </span>
              <span className="text-[11px] font-mono text-[#86868B]">1×</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onExportPng(2);
                setMenuOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-[13px] text-[#1D1D1F] hover:bg-black/[0.04] flex items-center justify-between transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <ImageIcon className="w-4 h-4 text-[#6E6E73]" />
                <span>PNG Alta Resolução</span>
              </span>
              <span className="text-[11px] font-mono text-[#86868B]">2×</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onExportPng(3);
                setMenuOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-[13px] text-[#1D1D1F] hover:bg-black/[0.04] flex items-center justify-between transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <ImageIcon className="w-4 h-4 text-[#6E6E73]" />
                <span>PNG Impressão</span>
              </span>
              <span className="text-[11px] font-mono text-[#86868B]">3×</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
