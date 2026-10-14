import React from 'react';

export const StudioLoadingScreen: React.FC = () => {
  return (
    <div className="studio-loading-screen">
      <div className="studio-loading-spinner" />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: '1px', color: '#00F2FF' }}>
          VaRGB STUDIO
        </div>
        <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
          Initializing Redragon K630 Animation Engine & Timeline...
        </div>
      </div>
    </div>
  );
};
