import React from 'react';
import { EffectType } from '../types/effects';

interface EffectThumbnailProps {
  type: EffectType;
  themeColor?: string;
  isActive?: boolean;
}

export const EffectThumbnail: React.FC<EffectThumbnailProps> = ({
  type,
  themeColor = '#8B5CF6',
  isActive = false,
}) => {
  const renderGraphic = () => {
    switch (type) {
      case 'aurora':
        return (
          <svg viewBox="0 0 44 34" className="effect-thumb-svg">
            <defs>
              <linearGradient id="aurora-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#06B6D4" />
                <stop offset="50%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#EC4899" />
              </linearGradient>
            </defs>
            <path
              d="M 4 24 Q 14 6 22 17 T 40 10"
              fill="none"
              stroke="url(#aurora-grad)"
              strokeWidth="3.5"
              strokeLinecap="round"
              filter="drop-shadow(0 0 4px #8B5CF6)"
            />
            <path
              d="M 4 28 Q 14 12 22 22 T 40 16"
              fill="none"
              stroke="#06B6D4"
              strokeWidth="1.5"
              opacity="0.6"
              strokeLinecap="round"
            />
          </svg>
        );

      case 'starlight':
        return (
          <svg viewBox="0 0 44 34" className="effect-thumb-svg">
            <circle cx="10" cy="10" r="2.2" fill="#38BDF8" filter="drop-shadow(0 0 3px #38BDF8)" />
            <circle cx="22" cy="18" r="2.8" fill="#F472B6" filter="drop-shadow(0 0 4px #F472B6)" />
            <circle cx="34" cy="8" r="1.8" fill="#FACC15" filter="drop-shadow(0 0 3px #FACC15)" />
            <circle cx="15" cy="26" r="1.5" fill="#38BDF8" opacity="0.8" />
            <circle cx="32" cy="24" r="2" fill="#A78BFA" filter="drop-shadow(0 0 3px #A78BFA)" />
          </svg>
        );

      case 'color_cycle':
        return (
          <div
            className="thumb-gradient-fill"
            style={{
              background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 30%, #8B5CF6 65%, #EC4899 100%)',
              filter: 'blur(0.5px)',
            }}
          />
        );

      case 'plasma_shader':
        return (
          <svg viewBox="0 0 44 34" className="effect-thumb-svg">
            <defs>
              <radialGradient id="plasma-1" cx="30%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#A855F7" />
                <stop offset="100%" stopColor="#1E1B4B" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="plasma-2" cx="70%" cy="60%" r="50%">
                <stop offset="0%" stopColor="#06B6D4" />
                <stop offset="100%" stopColor="#1E1B4B" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="44" height="34" fill="#0D0D14" rx="6" />
            <circle cx="16" cy="14" r="14" fill="url(#plasma-1)" />
            <circle cx="28" cy="20" r="12" fill="url(#plasma-2)" />
            <path
              d="M 6 18 Q 22 28 38 14"
              fill="none"
              stroke="#E879F9"
              strokeWidth="2.5"
              strokeLinecap="round"
              filter="drop-shadow(0 0 3px #E879F9)"
            />
          </svg>
        );

      case 'lava_lamp':
        return (
          <svg viewBox="0 0 44 34" className="effect-thumb-svg">
            <circle cx="14" cy="20" r="6" fill="#F97316" filter="drop-shadow(0 0 5px #F97316)" />
            <circle cx="28" cy="12" r="5" fill="#EF4444" filter="drop-shadow(0 0 5px #EF4444)" />
            <circle cx="22" cy="24" r="4" fill="#FBBF24" filter="drop-shadow(0 0 4px #FBBF24)" />
          </svg>
        );

      case 'flowing_curve':
        return (
          <svg viewBox="0 0 44 34" className="effect-thumb-svg">
            <path
              d="M 4 17 Q 13 4 22 17 T 40 17"
              fill="none"
              stroke="#06B6D4"
              strokeWidth="3"
              strokeLinecap="round"
              filter="drop-shadow(0 0 4px #06B6D4)"
            />
          </svg>
        );

      case 'zigzag_wave':
        return (
          <svg viewBox="0 0 44 34" className="effect-thumb-svg">
            <polyline
              points="4,22 12,10 20,24 28,10 36,24 40,16"
              fill="none"
              stroke="#10B981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="drop-shadow(0 0 4px #10B981)"
            />
          </svg>
        );

      case 'continuous_wave':
        return (
          <svg viewBox="0 0 44 34" className="effect-thumb-svg">
            <path
              d="M 4 17 C 12 5, 16 29, 24 17 C 32 5, 36 29, 40 17"
              fill="none"
              stroke="#C084FC"
              strokeWidth="2.8"
              strokeLinecap="round"
              filter="drop-shadow(0 0 4px #A855F7)"
            />
          </svg>
        );

      case 'pulse':
        return (
          <svg viewBox="0 0 44 34" className="effect-thumb-svg">
            <polyline
              points="4,17 14,17 18,7 22,27 26,13 29,19 32,17 40,17"
              fill="none"
              stroke="#EF4444"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="drop-shadow(0 0 4px #EF4444)"
            />
          </svg>
        );

      case 'matrix':
        return (
          <svg viewBox="0 0 44 34" className="effect-thumb-svg">
            <line x1="8" y1="4" x2="8" y2="28" stroke="#22C55E" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
            <line x1="16" y1="2" x2="16" y2="30" stroke="#4ADE80" strokeWidth="2.5" strokeDasharray="4 2" filter="drop-shadow(0 0 3px #22C55E)" />
            <line x1="24" y1="6" x2="24" y2="26" stroke="#22C55E" strokeWidth="2" strokeDasharray="2 3" opacity="0.7" />
            <line x1="32" y1="2" x2="32" y2="32" stroke="#86EFAC" strokeWidth="2.5" strokeDasharray="3 2" filter="drop-shadow(0 0 3px #4ADE80)" />
          </svg>
        );

      case 'glitch':
        return (
          <svg viewBox="0 0 44 34" className="effect-thumb-svg">
            <rect x="6" y="8" width="16" height="5" fill="#06B6D4" opacity="0.9" />
            <rect x="18" y="15" width="20" height="4" fill="#F43F5E" filter="drop-shadow(0 0 3px #F43F5E)" />
            <rect x="8" y="21" width="14" height="4" fill="#A855F7" />
            <rect x="26" y="9" width="12" height="3" fill="#FACC15" />
          </svg>
        );

      case 'ripple':
      case 'reactive_ripple':
        return (
          <svg viewBox="0 0 44 34" className="effect-thumb-svg">
            <circle cx="22" cy="17" r="4" fill="#06B6D4" filter="drop-shadow(0 0 4px #06B6D4)" />
            <circle cx="22" cy="17" r="9" fill="none" stroke="#38BDF8" strokeWidth="1.8" opacity="0.8" />
            <circle cx="22" cy="17" r="14" fill="none" stroke="#6366F1" strokeWidth="1.2" opacity="0.5" />
          </svg>
        );

      case 'key_flash':
        return (
          <svg viewBox="0 0 44 34" className="effect-thumb-svg">
            <rect x="12" y="7" width="20" height="20" rx="4" fill="#FEF08A" filter="drop-shadow(0 0 6px #FACC15)" />
            <circle cx="22" cy="17" r="3" fill="#FFFFFF" />
          </svg>
        );

      case 'music_pulse':
      case 'spectrum_eq':
      case 'telemetry_bars':
        return (
          <svg viewBox="0 0 44 34" className="effect-thumb-svg">
            <rect x="6" y="18" width="4" height="12" rx="1.5" fill="#10B981" />
            <rect x="13" y="10" width="4" height="20" rx="1.5" fill="#06B6D4" filter="drop-shadow(0 0 3px #06B6D4)" />
            <rect x="20" y="6" width="4" height="24" rx="1.5" fill="#8B5CF6" filter="drop-shadow(0 0 3px #8B5CF6)" />
            <rect x="27" y="14" width="4" height="16" rx="1.5" fill="#EC4899" />
            <rect x="34" y="20" width="4" height="10" rx="1.5" fill="#F43F5E" />
          </svg>
        );

      default:
        return (
          <svg viewBox="0 0 44 34" className="effect-thumb-svg">
            <defs>
              <linearGradient id={`grad-${type}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={themeColor} />
                <stop offset="100%" stopColor="#3B82F6" />
              </linearGradient>
            </defs>
            <path
              d="M 6 22 Q 18 8 26 18 T 38 12"
              fill="none"
              stroke={`url(#grad-${type})`}
              strokeWidth="2.8"
              strokeLinecap="round"
              filter={`drop-shadow(0 0 4px ${themeColor})`}
            />
          </svg>
        );
    }
  };

  return (
    <div className={`effect-thumbnail-box ${isActive ? 'active' : ''}`}>
      {renderGraphic()}
    </div>
  );
};
