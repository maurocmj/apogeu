import React from 'react';

const BodyScanSVG = ({ bodyFat = 15, onHoverPoint }) => {
  // bodyFat ranges from ~10 to 30.
  // High BF = hotter color (red/orange) and higher opacity.
  // Low BF = cooler color (blue/cyan) and lower opacity.
  
  // Normalize BF to a 0-1 scale where 10 is 0 and 30 is 1.
  const normalizedBf = Math.max(0, Math.min(1, (bodyFat - 10) / 20));
  
  const heatOpacity = 0.2 + (normalizedBf * 0.6); // 0.2 to 0.8
  
  // Color blending: low BF = cyan, high BF = red/orange
  const hue = 180 - (normalizedBf * 180); // 180 is cyan, 0 is red
  const heatColor = `hsla(${hue}, 100%, 50%, ${heatOpacity})`;

  // Determine size of the heat areas based on BF
  const bellyScale = 0.8 + (normalizedBf * 0.5); // 0.8 to 1.3
  const armScale = 0.9 + (normalizedBf * 0.3);

  return (
    <svg 
      viewBox="0 0 400 800" 
      xmlns="http://www.w3.org/2000/svg" 
      style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: '100%', filter: 'drop-shadow(0 0 20px rgba(0,229,255,0.1))' }}
    >
      <defs>
        <linearGradient id="bodyOutlineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.1)" />
          <stop offset="100%" stopColor="rgba(0,229,255,0.4)" />
        </linearGradient>
        
        {/* Glow effect for heat map */}
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="15" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Static Body Outline (Wireframe) */}
      <g stroke="url(#bodyOutlineGrad)" strokeWidth="2" fill="rgba(0, 20, 30, 0.4)">
        {/* Head */}
        <path d="M170 100 C170 60, 230 60, 230 100 C230 140, 210 160, 200 160 C190 160, 170 140, 170 100 Z" />
        {/* Neck */}
        <path d="M185 150 L215 150 L225 180 L175 180 Z" />
        {/* Shoulders & Chest */}
        <path d="M175 180 C130 180, 100 200, 90 230 C120 230, 160 280, 200 280 C240 280, 280 230, 310 230 C300 200, 270 180, 225 180 Z" />
        {/* Torso */}
        <path d="M130 280 C130 350, 140 400, 150 450 L250 450 C260 400, 270 350, 270 280 C240 300, 160 300, 130 280 Z" />
        {/* Pelvis */}
        <path d="M150 450 L250 450 C260 480, 240 520, 200 520 C160 520, 140 480, 150 450 Z" />
        {/* Legs */}
        <path d="M150 500 C130 600, 140 700, 140 750 L180 750 C180 700, 190 600, 190 520 Z" />
        <path d="M250 500 C270 600, 260 700, 260 750 L220 750 C220 700, 210 600, 210 520 Z" />
        {/* Arms */}
        <path d="M90 230 C70 300, 60 400, 50 450 L80 450 C90 400, 110 300, 130 280 Z" />
        <path d="M310 230 C330 300, 340 400, 350 450 L320 450 C310 400, 290 300, 270 280 Z" />
      </g>

      {/* Internal Heat Map (Dynamic) */}
      <g filter="url(#glow)" style={{ transition: 'all 0.5s ease-in-out' }}>
        {/* Belly Heat */}
        <ellipse 
          cx="200" 
          cy="380" 
          rx={50 * bellyScale} 
          ry={60 * bellyScale} 
          fill={heatColor} 
          style={{ transition: 'all 0.5s ease-in-out' }}
        />
        {/* Left Arm Heat */}
        <ellipse 
          cx="90" 
          cy="340" 
          rx={15 * armScale} 
          ry={40 * armScale} 
          fill={heatColor} 
          style={{ transition: 'all 0.5s ease-in-out' }}
        />
        {/* Right Arm Heat */}
        <ellipse 
          cx="310" 
          cy="340" 
          rx={15 * armScale} 
          ry={40 * armScale} 
          fill={heatColor} 
          style={{ transition: 'all 0.5s ease-in-out' }}
        />
        {/* Thighs Heat */}
        <ellipse cx="165" cy="560" rx={25 * bellyScale} ry={50 * bellyScale} fill={heatColor} style={{ transition: 'all 0.5s ease-in-out' }} />
        <ellipse cx="235" cy="560" rx={25 * bellyScale} ry={50 * bellyScale} fill={heatColor} style={{ transition: 'all 0.5s ease-in-out' }} />
      </g>

      {/* Grid Overlay to look technical */}
      <g stroke="rgba(255,255,255,0.05)" strokeWidth="1">
        <line x1="200" y1="50" x2="200" y2="780" strokeDasharray="5,5" />
        <line x1="50" y1="230" x2="350" y2="230" strokeDasharray="5,5" />
        <line x1="50" y1="450" x2="350" y2="450" strokeDasharray="5,5" />
      </g>

      {/* Interactive Hit Areas */}
      <circle cx="120" cy="210" r="35" fill="transparent" style={{ cursor: 'pointer' }}
        onMouseEnter={() => onHoverPoint('ombro', true)}
        onMouseLeave={() => onHoverPoint('ombro', false)}
      />
      <circle cx="200" cy="380" r="45" fill="transparent" style={{ cursor: 'pointer' }}
        onMouseEnter={() => onHoverPoint('cintura', true)}
        onMouseLeave={() => onHoverPoint('cintura', false)}
      />
      <circle cx="165" cy="600" r="40" fill="transparent" style={{ cursor: 'pointer' }}
        onMouseEnter={() => onHoverPoint('perna', true)}
        onMouseLeave={() => onHoverPoint('perna', false)}
      />
    </svg>
  );
};

export default BodyScanSVG;
