import { createDefaultLayerProperties } from '../engine/effects';
import { StudioProject } from '../types/studio';

export const STUDIO_STORAGE_KEY = 'vargb_studio_project_v1';

/**
 * Creates a rich starter project demonstrating Traveling Wave and Base Color
 */
export function createDefaultProject(): StudioProject {
  const now = new Date().toISOString();

  // Create Traveling Wave layer with keyframed direction and speed
  const waveProps = createDefaultLayerProperties('traveling_wave');
  waveProps.direction.animated = true;
  waveProps.direction.keyframes = [
    { id: 'kf-dir-1', time: 0.0, value: 0, easing: 'ease_in_out' },
    { id: 'kf-dir-2', time: 1.5, value: 180, easing: 'ease_in_out' },
    { id: 'kf-dir-3', time: 3.0, value: 360, easing: 'linear' },
  ];

  waveProps.color.animated = true;
  waveProps.color.keyframes = [
    { id: 'kf-col-1', time: 0.0, value: { r: 0, g: 242, b: 255 }, easing: 'ease_in_out' }, // Cyan
    { id: 'kf-col-2', time: 1.5, value: { r: 255, g: 0, b: 128 }, easing: 'ease_in_out' }, // Neon Pink
    { id: 'kf-col-3', time: 3.0, value: { r: 0, g: 242, b: 255 }, easing: 'linear' },
  ];

  // Create deep background layer
  const baseProps = createDefaultLayerProperties('base_color');
  baseProps.color.staticValue = { r: 8, g: 15, b: 28 }; // Deep midnight navy

  return {
    version: 1,
    id: `proj-${Date.now()}`,
    name: 'Cyber Wave Aurora',
    layoutId: 'redragon_k630',
    duration: 3.0,
    fps: 30,
    workArea: { start: 0.0, end: 3.0 },
    loop: true,
    layers: [
      {
        id: 'layer-wave',
        name: 'Traveling Wave (Cyan / Pink)',
        type: 'traveling_wave',
        visible: true,
        locked: false,
        blendMode: 'add',
        opacity: 100,
        targetKeys: 'all',
        properties: waveProps,
      },
      {
        id: 'layer-base',
        name: 'Base Underglow',
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
}

/**
 * Creates an empty project with no layers
 */
export function createEmptyProject(name = 'Untitled Project'): StudioProject {
  const now = new Date().toISOString();
  return {
    version: 1,
    id: `proj-${Date.now()}`,
    name,
    layoutId: 'redragon_k630',
    duration: 3.0,
    fps: 30,
    workArea: { start: 0.0, end: 3.0 },
    loop: true,
    layers: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Validates unknown data as a valid StudioProject
 */
export function validateProject(data: any): StudioProject | null {
  if (!data || typeof data !== 'object') return null;
  if (data.version !== 1 || data.layoutId !== 'redragon_k630') return null;
  if (!data.id || !data.name || typeof data.duration !== 'number') return null;
  if (!Array.isArray(data.layers)) return null;

  // Validate layers
  for (const layer of data.layers) {
    if (!layer.id || !layer.type || !layer.properties) {
      return null;
    }
  }

  return data as StudioProject;
}

/**
 * Saves current project to browser localStorage
 */
export function saveProjectToStorage(project: StudioProject): void {
  try {
    const updated = {
      ...project,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save project to localStorage:', err);
  }
}

/**
 * Loads project from localStorage or returns fallback default
 */
export function loadProjectFromStorage(): StudioProject {
  try {
    const raw = localStorage.getItem(STUDIO_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const valid = validateProject(parsed);
      if (valid) return valid;
    }
  } catch (err) {
    console.warn('Failed to load project from localStorage:', err);
  }

  return createDefaultProject();
}

/**
 * Triggers JSON download of current project
 */
export function exportProjectAsJson(project: StudioProject): void {
  const jsonStr = JSON.stringify(project, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.vargb-proj`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Imports project from JSON string
 */
export function importProjectFromJson(jsonStr: string): StudioProject {
  const parsed = JSON.parse(jsonStr);
  const valid = validateProject(parsed);
  if (!valid) {
    throw new Error('Invalid VaRGB Studio project file format or unsupported layout');
  }
  return valid;
}
