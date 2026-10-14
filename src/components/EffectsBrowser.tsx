import React, { useState, useMemo } from 'react';
import { EffectType } from '../types/effects';
import { EFFECT_REGISTRY } from '../engine/registry';
import { EFFECT_DISPLAY_METAS, EffectCategory } from '../engine/effectMetadata';
import { EffectThumbnail } from './EffectThumbnail';
import { Search, SlidersHorizontal, Check, X } from 'lucide-react';

interface EffectsBrowserProps {
  currentEffectType: EffectType;
  onSelectEffect: (type: EffectType) => void;
}

const CATEGORIES: { id: EffectCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'ambient', label: 'Ambient' },
  { id: 'reactive', label: 'Reactive' },
  { id: 'music', label: 'Music' },
  { id: 'motion', label: 'Motion' },
];

export const EffectsBrowser: React.FC<EffectsBrowserProps> = ({
  currentEffectType,
  onSelectEffect,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<EffectCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Collect all available effects from registry (excluding internal pixel_art from lighting list)
  const allEffects = useMemo(() => {
    return (Object.keys(EFFECT_REGISTRY) as EffectType[]).filter(
      (type) => type !== 'pixel_art'
    );
  }, []);

  const filteredEffects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allEffects.filter((type) => {
      const meta = EFFECT_DISPLAY_METAS[type];
      const registryMeta = EFFECT_REGISTRY[type];
      const name = meta?.name || registryMeta?.name || type;
      const desc = meta?.shortDesc || registryMeta?.description || '';
      const category = meta?.category || 'ambient';

      const matchesCategory =
        selectedCategory === 'all' || category === selectedCategory;

      const matchesSearch =
        !q ||
        name.toLowerCase().includes(q) ||
        desc.toLowerCase().includes(q) ||
        type.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [allEffects, selectedCategory, searchQuery]);

  return (
    <div className="effects-browser-column">
      {/* Header */}
      <div className="effects-browser-header">
        <div className="effects-title-row">
          <div className="effects-title-group">
            <h2 className="effects-title">Effects</h2>
            <span className="effects-count-badge">{allEffects.length}</span>
          </div>
          <button className="icon-btn effects-filter-btn" title="Filter Settings">
            <SlidersHorizontal size={14} />
          </button>
        </div>

        {/* Search */}
        <div className="effects-search-bar">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Search effects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="search-clear-btn"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="effects-category-tabs">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                className={`category-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable Effect Cards List */}
      <div className="effects-scroll-list">
        {filteredEffects.length === 0 ? (
          <div className="effects-empty-state">
            <span>No effects match "{searchQuery}"</span>
          </div>
        ) : (
          filteredEffects.map((type) => {
            const meta = EFFECT_DISPLAY_METAS[type];
            const registryMeta = EFFECT_REGISTRY[type];
            const name = meta?.name || registryMeta?.name || type;
            const shortDesc = meta?.shortDesc || 'Dynamic RGB lighting';
            const isActive = currentEffectType === type;

            return (
              <button
                key={type}
                className={`effect-card-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectEffect(type)}
              >
                <EffectThumbnail
                  type={type}
                  themeColor={meta?.themeColor}
                  isActive={isActive}
                />

                <div className="effect-card-info">
                  <span className="effect-card-name">{name}</span>
                  <span className="effect-card-desc">{shortDesc}</span>
                </div>

                {isActive && (
                  <div className="effect-card-check">
                    <Check size={14} />
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
