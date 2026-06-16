import React, { useEffect, useRef } from 'react';

const ECGBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    
    // --- ECG Variables ---
    let x = 0;
    const pattern = [
      0, 0, 0, 0, 0, 
      -5, -10, -15, -10, -5, 0, 0, 0, 
      10, 20, 
      -40, -100, -160, -100, -40, 0, 
      30, 50, 30, 0, 
      0, 0, 0, 0, 
      -10, -20, -10, 0, 
      0, 0, 0, 0, 0
    ];
    let isBeating = false;
    let beatIndex = 0;
    let framesSinceLastBeat = 0;
    const pointsHistory = [];
    const maxHistory = 150; 

    // --- Particles Variables ---
    let particles = [];

    const initParticles = () => {
      particles = [];
      const numParticles = Math.floor((canvas.width * canvas.height) / 18000);
      for (let i = 0; i < numParticles; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 1.5 + 0.5,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
        });
      }
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    window.addEventListener('resize', resize);
    resize();

    const draw = () => {
      // 1. Solid background
      ctx.fillStyle = '#090a0f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Draw Data Particles (Constellation)
      ctx.shadowBlur = 0; // Disable shadow for particles to save performance
      for (let i = 0; i < particles.length; i++) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around screen
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(148, 163, 184, 0.5)'; // Mais visível
        ctx.fill();

        // Connect particles
        for (let j = i + 1; j < particles.length; j++) {
          let p2 = particles[j];
          let dx = p.x - p2.x;
          let dy = p.y - p2.y;
          let dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(148, 163, 184, ${0.3 - dist / 350})`; // Linhas mais fortes
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // 3. Draw ECG Line
      const centerY = canvas.height / 2;
      let targetY = centerY;

      if (!isBeating) {
        framesSinceLastBeat++;
        if (framesSinceLastBeat > 60 && Math.random() < 0.08) {
          isBeating = true;
          beatIndex = 0;
          framesSinceLastBeat = 0;
        }
      } else {
        targetY = centerY + pattern[beatIndex];
        beatIndex++;
        if (beatIndex >= pattern.length) {
          isBeating = false;
        }
      }

      let prevY = pointsHistory.length > 0 ? pointsHistory[pointsHistory.length - 1].y : centerY;
      let currentY = prevY + (targetY - prevY) * 0.4;
      
      x += 4; 

      if (x > canvas.width) {
        x = 0;
        pointsHistory.push({ x, y: currentY, break: true });
      } else {
        pointsHistory.push({ x, y: currentY, break: false });
      }

      if (pointsHistory.length > maxHistory) {
        pointsHistory.shift();
      }

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#00e5ff';

      for (let i = 1; i < pointsHistory.length; i++) {
        const p1 = pointsHistory[i - 1];
        const p2 = pointsHistory[i];
        
        if (p2.break) continue;

        const opacity = i / pointsHistory.length;
        
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = `rgba(0, 229, 255, ${opacity * 0.25})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      if (pointsHistory.length > 0) {
        const head = pointsHistory[pointsHistory.length - 1];
        ctx.beginPath();
        ctx.arc(head.x, head.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      <canvas 
        ref={canvasRef} 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          pointerEvents: 'none'
        }}
      />
      <div style={{
        position: 'absolute',
        top: 0, left: 0, width: '100%', height: '100%',
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
        opacity: 0.25,
        mixBlendMode: 'overlay',
        pointerEvents: 'none',
        zIndex: 1
      }}></div>
    </>
  );
};

export default ECGBackground;
