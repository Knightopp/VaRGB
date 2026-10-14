import { RGBColor } from '../../types/keyboard';

export type KeyframeEasing = 'linear' | 'hold' | 'ease_in' | 'ease_out' | 'ease_in_out';

export interface Keyframe<T = any> {
  id: string;
  time: number; // in seconds
  value: T;
  easing: KeyframeEasing;
}

export type PropertyType = 'number' | 'color' | 'angle' | 'color_stops' | 'point';

export interface ColorStop {
  position: number; // 0 to 1
  color: RGBColor;
}

export interface Point2D {
  x: number; // 0 to 1
  y: number; // 0 to 1
}

export interface AnimatableProperty<T = any> {
  id: string;
  name: string;
  type: PropertyType;
  animated: boolean; // stopwatch enabled
  staticValue: T;
  keyframes: Keyframe<T>[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export type LayerBlendMode = 'replace' | 'add' | 'screen' | 'multiply';

export type LayerType = 'base_color' | 'traveling_wave' | 'pulse' | 'color_cycle' | 'ripple';

export interface StudioLayer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  blendMode: LayerBlendMode;
  opacity: number; // 0 to 100
  targetKeys: string[] | 'all';
  properties: Record<string, AnimatableProperty<any>>;
}

export interface WorkArea {
  start: number;
  end: number;
}

export interface StudioProject {
  version: 1;
  id: string;
  name: string;
  layoutId: 'redragon_k630';
  duration: number; // in seconds
  fps: number;
  workArea: WorkArea;
  loop: boolean;
  layers: StudioLayer[];
  createdAt: string;
  updatedAt: string;
}

export interface SelectionState {
  layerId: string | null;
  propertyId: string | null;
  keyframeId: string | null;
}
