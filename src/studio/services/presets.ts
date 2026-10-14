import { createDefaultLayerProperties } from '../engine/effects';
import { StudioProject } from '../types/studio';

export interface StudioTemplate {
  id: string;
  name: string;
  description: string;
  createProject: () => StudioProject;
}

export const STUDIO_TEMPLATES: StudioTemplate[] = [
  {
    id: 'cyber_wave',
    name: 'Cyber Wave Aurora',
    description: 'Bicolor traveling wave sweeping diagonally over dark ambient glow',
    createProject: () => {
      const now = new Date().toISOString();
      const waveProps = createDefaultLayerProperties('traveling_wave');
      waveProps.direction.animated = true;
      waveProps.direction.keyframes = [
        { id: 'kf-w1', time: 0.0, value: 45, easing: 'ease_in_out' },
        { id: 'kf-w2', time: 1.5, value: 225, easing: 'ease_in_out' },
        { id: 'kf-w3', time: 3.0, value: 45, easing: 'linear' },
      ];
      waveProps.color.staticValue = { r: 0, g: 242, b: 255 };

      const baseProps = createDefaultLayerProperties('base_color');
      baseProps.color.staticValue = { r: 5, g: 10, b: 25 };

      return {
        version: 1,
        id: `template-cyber-wave-${Date.now()}`,
        name: 'Cyber Wave Aurora',
        layoutId: 'redragon_k630',
        duration: 3.0,
        fps: 30,
        workArea: { start: 0, end: 3.0 },
        loop: true,
        layers: [
          {
            id: 'l-wave',
            name: 'Diagonal Cyan Wave',
            type: 'traveling_wave',
            visible: true,
            locked: false,
            blendMode: 'add',
            opacity: 100,
            targetKeys: 'all',
            properties: waveProps,
          },
          {
            id: 'l-base',
            name: 'Deep Blue Base',
            type: 'base_color',
            visible: true,
            locked: false,
            blendMode: 'replace',
            opacity: 100,
            targetKeys: 'all',
            properties: baseProps,
          },
        ],
        createdAt: now,
        updatedAt: now,
      };
    },
  },
  {
    id: 'rainbow_prism',
    name: 'Prism Spectrum Cycle',
    description: 'Smooth continuous rainbow cycling across the entire keyboard layout',
    createProject: () => {
      const now = new Date().toISOString();
      const cycleProps = createDefaultLayerProperties('color_cycle');
      cycleProps.speed.staticValue = 0.5;
      cycleProps.spread.staticValue = 1.2;
      cycleProps.direction.staticValue = 90; // Top to bottom spectrum

      return {
        version: 1,
        id: `template-prism-${Date.now()}`,
        name: 'Prism Spectrum Cycle',
        layoutId: 'redragon_k630',
        duration: 4.0,
        fps: 30,
        workArea: { start: 0, end: 4.0 },
        loop: true,
        layers: [
          {
            id: 'l-cycle',
            name: 'Vertical Rainbow Cycle',
            type: 'color_cycle',
            visible: true,
            locked: false,
            blendMode: 'replace',
            opacity: 100,
            targetKeys: 'all',
            properties: cycleProps,
          },
        ],
        createdAt: now,
        updatedAt: now,
      };
    },
  },
  {
    id: 'radial_shockwave',
    name: 'Radial Cyan Shockwave',
    description: 'Expanding shockwave ripples emanating from spacebar center',
    createProject: () => {
      const now = new Date().toISOString();
      const rippleProps = createDefaultLayerProperties('ripple');
      rippleProps.origin.staticValue = { x: 0.5, y: 0.85 }; // Spacebar center
      rippleProps.speed.staticValue = 1.0;
      rippleProps.width.staticValue = 0.18;
      rippleProps.decay.staticValue = 30;
      rippleProps.color.staticValue = { r: 0, g: 242, b: 255 };

      const baseProps = createDefaultLayerProperties('base_color');
      baseProps.color.staticValue = { r: 10, g: 10, b: 15 };

      return {
        version: 1,
        id: `template-shockwave-${Date.now()}`,
        name: 'Radial Cyan Shockwave',
        layoutId: 'redragon_k630',
        duration: 2.5,
        fps: 30,
        workArea: { start: 0, end: 2.5 },
        loop: true,
        layers: [
          {
            id: 'l-ripple',
            name: 'Spacebar Ripple Wave',
            type: 'ripple',
            visible: true,
            locked: false,
            blendMode: 'add',
            opacity: 100,
            targetKeys: 'all',
            properties: rippleProps,
          },
          {
            id: 'l-base',
            name: 'Base Tone',
            type: 'base_color',
            visible: true,
            locked: false,
            blendMode: 'replace',
            opacity: 100,
            targetKeys: 'all',
            properties: baseProps,
          },
        ],
        createdAt: now,
        updatedAt: now,
      };
    },
  },
  {
    id: 'gaming_wasd_cluster',
    name: 'Esports WASD Cluster',
    description: 'Highlighting WASD + Spacebar keys with animated pulse over dim keys',
    createProject: () => {
      const now = new Date().toISOString();
      const pulseProps = createDefaultLayerProperties('pulse');
      pulseProps.color.staticValue = { r: 255, g: 50, b: 50 }; // Red
      pulseProps.speed.staticValue = 1.2;

      const baseProps = createDefaultLayerProperties('base_color');
      baseProps.color.staticValue = { r: 15, g: 25, b: 35 };

      return {
        version: 1,
        id: `template-gaming-${Date.now()}`,
        name: 'Esports WASD Cluster',
        layoutId: 'redragon_k630',
        duration: 2.0,
        fps: 30,
        workArea: { start: 0, end: 2.0 },
        loop: true,
        layers: [
          {
            id: 'l-wasd',
            name: 'WASD Pulsing Red',
            type: 'pulse',
            visible: true,
            locked: false,
            blendMode: 'replace',
            opacity: 100,
            targetKeys: ['w', 'a', 's', 'd', 'space'],
            properties: pulseProps,
          },
          {
            id: 'l-base',
            name: 'Ambient Keyboard Base',
            type: 'base_color',
            visible: true,
            locked: false,
            blendMode: 'replace',
            opacity: 100,
            targetKeys: 'all',
            properties: baseProps,
          },
        ],
        createdAt: now,
        updatedAt: now,
      };
    },
  },
];
