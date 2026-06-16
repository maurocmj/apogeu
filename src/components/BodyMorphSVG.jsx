import React from 'react';

const BodyMorphSVG = ({ bodyFat = 15, onHoverPoint }) => {
  // bodyFat ranges from e.g. 8 to 30.
  // We calculate a scale factor for the waist/stomach.
  // 15 is baseline (scale = 1).
  const waistScale = 1 + ((bodyFat - 15) * 0.02);
  // As BF goes up, muscle definition (opacity) goes down.
  const definitionOpacity = Math.max(0, 1 - ((bodyFat - 10) * 0.05));

  return (
    <svg 
      viewBox="0 0 400 800" 
      xmlns="http://www.w3.org/2000/svg" 
      style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 0 20px rgba(0,229,255,0.2))' }}
    >
      <defs>
        <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
        <linearGradient id="neonGlow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      <g stroke="#00e5ff" strokeWidth="1.5" fill="url(#bodyGrad)">
        {/* Head */}
        <path d="M170 100 C170 60, 230 60, 230 100 C230 140, 210 160, 200 160 C190 160, 170 140, 170 100 Z" />
        
        {/* Neck */}
        <path d="M185 150 L215 150 L225 180 L175 180 Z" />
        
        {/* Shoulders & Chest */}
        <path d="M175 180 C130 180, 100 200, 90 230 C120 230, 160 280, 200 280 C240 280, 280 230, 310 230 C300 200, 270 180, 225 180 Z" />
        
        {/* Abs / Waist (Dynamic Scale) */}
        <g transform={`translate(200, 350) scale(${waistScale}, 1) translate(-200, -350)`}>
          <path d="M130 280 C130 350, 140 400, 150 450 L250 450 C260 400, 270 350, 270 280 C240 300, 160 300, 130 280 Z" />
          
          {/* Muscle Definition Lines */}
          <g stroke="rgba(0, 229, 255, 0.4)" strokeWidth="1" fill="none" opacity={definitionOpacity}>
            <path d="M200 280 L200 440" />
            <path d="M160 320 Q200 340 240 320" />
            <path d="M165 370 Q200 390 235 370" />
            <path d="M170 410 Q200 420 230 410" />
          </g>
        </g>
        
        {/* Pelvis */}
        <path d="M150 450 L250 450 C260 480, 240 520, 200 520 C160 520, 140 480, 150 450 Z" />
        
        {/* Legs */}
        <path d="M150 500 C130 600, 140 700, 140 750 L180 750 C180 700, 190 600, 190 520 Z" />
        <path d="M250 500 C270 600, 260 700, 260 750 L220 750 C220 700, 210 600, 210 520 Z" />
        
        {/* Arms */}
        <path d="M90 230 C70 300, 60 400, 50 450 L80 450 C90 400, 110 300, 130 280 Z" />
        <path d="M310 230 C330 300, 340 400, 350 450 L320 450 C310 400, 290 300, 270 280 Z" />
      </g>

      {/* Interactive Hit Areas */}
      {/* Ombro */}
      <circle cx="120" cy="210" r="30" fill="transparent" style={{ cursor: 'pointer' }}
        onMouseEnter={() => onHoverPoint('ombro', true)}
        onMouseLeave={() => onHoverPoint('ombro', false)}
      />
      {/* Cintura */}
      <circle cx="150" cy="360" r="30" fill="transparent" style={{ cursor: 'pointer' }}
        onMouseEnter={() => onHoverPoint('cintura', true)}
        onMouseLeave={() => onHoverPoint('cintura', false)}
      />
      {/* Perna */}
      <circle cx="160" cy="600" r="30" fill="transparent" style={{ cursor: 'pointer' }}
        onMouseEnter={() => onHoverPoint('perna', true)}
        onMouseLeave={() => onHoverPoint('perna', false)}
      />

    </svg>
  );
};

export default BodyMorphSVG;
