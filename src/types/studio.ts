export type AspectRatioPreset = '1:1' | '4:5' | '4:3' | '16:9';

export type PrintStyleMode = 'outline' | 'mixed' | 'solid';

export type JunctionStyle = 'merged' | 'seam' | 'overlap';

export type CompositionMode = 'organic' | 'grid' | 'constellation';

export type MotionPreset = 'breathe' | 'orbit' | 'wave' | 'static';

export interface StudioParams {
  // Composition
  seed: number;
  aspectRatio: AspectRatioPreset;
  compositionMode: CompositionMode;
  density: number; // 4 to 44
  baseScale: number; // 0.35 to 1.45
  sizeVariation: number; // 0 to 1
  roundness: number; // 0 to 1 (0 = architectural squircle/capsule, 1 = pure fluid circle)

  // Serigraphy & Ink Bleed
  printMode: PrintStyleMode;
  junctionStyle: JunctionStyle;
  inkBleed: number; // 0 to 1 (capillary bridge & bleed)
  strokeWidth: number; // 0.5 to 8
  doubleContour: boolean;
  doubleContourOffset: number; // 8 to 36 px
  grainIntensity: number; // 0 to 1

  // Colors
  surfaceColor: string;
  lineColor: string;
  inkColor: string;

  // Cyclic Animation
  motionPreset: MotionPreset;
  cycleDuration: number; // seconds: 3 to 16
  motionAmplitude: number; // 0 to 1
}

export interface StudioPreset {
  id: string;
  name: string;
  subtitle: string;
  params: Partial<StudioParams>;
}

export const ASPECT_DIMENSIONS: Record<AspectRatioPreset, { width: number; height: number; label: string }> = {
  '1:1': { width: 800, height: 800, label: '1:1' },
  '4:5': { width: 760, height: 950, label: '4:5' },
  '4:3': { width: 920, height: 690, label: '4:3' },
  '16:9': { width: 1040, height: 585, label: '16:9' },
};

export const STUDIO_PRESETS: StudioPreset[] = [
  {
    id: 'indigo-chalk',
    name: 'Índigo & Giz',
    subtitle: 'Traço fino sobre índigo profundo',
    params: {
      printMode: 'outline',
      junctionStyle: 'seam',
      surfaceColor: '#121324',
      lineColor: '#ECECE8',
      inkColor: '#1C1E38',
      strokeWidth: 1.6,
      doubleContour: true,
      doubleContourOffset: 22,
      roundness: 0.72,
      inkBleed: 0.48,
      grainIntensity: 0.42,
      compositionMode: 'organic',
      density: 18,
      baseScale: 0.92,
      sizeVariation: 0.58,
    },
  },
  {
    id: 'terracotta-vermilion',
    name: 'Terracota',
    subtitle: 'Serigrafia de alto contraste',
    params: {
      printMode: 'solid',
      junctionStyle: 'merged',
      surfaceColor: '#5C1D07',
      lineColor: '#F54900',
      inkColor: '#F54900',
      strokeWidth: 2.0,
      doubleContour: false,
      doubleContourOffset: 18,
      roundness: 0.36,
      inkBleed: 0.62,
      grainIntensity: 0.35,
      compositionMode: 'grid',
      density: 16,
      baseScale: 0.96,
      sizeVariation: 0.32,
    },
  },
  {
    id: 'paper-nanquim',
    name: 'Papel & Nanquim',
    subtitle: 'Editorial minimalista em papel liso',
    params: {
      printMode: 'mixed',
      junctionStyle: 'overlap',
      surfaceColor: '#F4F2EC',
      lineColor: '#161618',
      inkColor: '#E5E2D9',
      strokeWidth: 1.5,
      doubleContour: false,
      doubleContourOffset: 16,
      roundness: 0.85,
      inkBleed: 0.54,
      grainIntensity: 0.28,
      compositionMode: 'organic',
      density: 20,
      baseScale: 0.88,
      sizeVariation: 0.68,
    },
  },
  {
    id: 'cobalt-ivory',
    name: 'Cobalto & Marfim',
    subtitle: 'Azul ultramar com fusão líquida',
    params: {
      printMode: 'mixed',
      junctionStyle: 'seam',
      surfaceColor: '#0E1F5C',
      lineColor: '#F7F4EA',
      inkColor: '#19358C',
      strokeWidth: 1.75,
      doubleContour: true,
      doubleContourOffset: 18,
      roundness: 0.78,
      inkBleed: 0.68,
      grainIntensity: 0.36,
      compositionMode: 'constellation',
      density: 22,
      baseScale: 0.9,
      sizeVariation: 0.75,
    },
  },
  {
    id: 'moss-cream',
    name: 'Musgo & Creme',
    subtitle: 'Orgânico tátil em verde botânico',
    params: {
      printMode: 'outline',
      junctionStyle: 'overlap',
      surfaceColor: '#18261E',
      lineColor: '#E8E3D5',
      inkColor: '#24382D',
      strokeWidth: 1.8,
      doubleContour: false,
      doubleContourOffset: 20,
      roundness: 0.92,
      inkBleed: 0.58,
      grainIntensity: 0.4,
      compositionMode: 'organic',
      density: 16,
      baseScale: 0.95,
      sizeVariation: 0.64,
    },
  },
];

export const DEFAULT_PARAMS: StudioParams = {
  seed: 4208,
  aspectRatio: '1:1',
  compositionMode: 'organic',
  density: 18,
  baseScale: 0.92,
  sizeVariation: 0.58,
  roundness: 0.72,
  printMode: 'outline',
  junctionStyle: 'seam',
  inkBleed: 0.48,
  strokeWidth: 1.6,
  doubleContour: true,
  doubleContourOffset: 22,
  grainIntensity: 0.42,
  surfaceColor: '#121324',
  lineColor: '#ECECE8',
  inkColor: '#1C1E38',
  motionPreset: 'breathe',
  cycleDuration: 8,
  motionAmplitude: 0.65,
};
