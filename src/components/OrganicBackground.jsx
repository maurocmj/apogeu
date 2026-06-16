import React, { useEffect, useRef } from 'react';

const OrganicBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let cells = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initCells();
    };

    const initCells = () => {
      cells = [];
      const numCells = Math.floor((canvas.width * canvas.height) / 30000); // Fewer, larger particles
      for (let i = 0; i < numCells; i++) {
        cells.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 40 + 10, // Larger, more like cells
          vx: (Math.random() - 0.5) * 0.2, // Slower movement
          vy: (Math.random() - 0.5) * 0.2,
          pulseSpeed: Math.random() * 0.02 + 0.01,
          pulsePhase: Math.random() * Math.PI * 2,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      cells.forEach((c, index) => {
        c.x += c.vx;
        c.y += c.vy;

        if (c.x < -100) c.x = canvas.width + 100;
        if (c.x > canvas.width + 100) c.x = -100;
        if (c.y < -100) c.y = canvas.height + 100;
        if (c.y > canvas.height + 100) c.y = -100;

        c.pulsePhase += c.pulseSpeed;
        const currentRadius = c.radius + Math.sin(c.pulsePhase) * (c.radius * 0.1);

        // Draw soft glowing cell
        const gradient = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, currentRadius);
        
        // Biological colors: cyan/blue/green mix
        if (index % 3 === 0) {
          gradient.addColorStop(0, 'rgba(16, 185, 129, 0.08)'); // Greenish
        } else if (index % 2 === 0) {
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.08)'); // Bluish
        } else {
          gradient.addColorStop(0, 'rgba(6, 182, 212, 0.08)'); // Cyan
        }
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.beginPath();
        ctx.arc(c.x, c.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Draw nucleus/center point
        ctx.beginPath();
        ctx.arc(c.x, c.y, currentRadius * 0.1, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fill();
      });

      // Draw subtle DNA-like connecting strands if close enough
      for (let i = 0; i < cells.length; i++) {
        for (let j = i + 1; j < cells.length; j++) {
          const dx = cells[i].x - cells[j].x;
          const dy = cells[i].y - cells[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 250) {
            ctx.beginPath();
            ctx.moveTo(cells[i].x, cells[i].y);
            // Draw a subtle curved bezier to simulate organic strand
            const cpX = (cells[i].x + cells[j].x) / 2 + (Math.sin(cells[i].pulsePhase) * 20);
            const cpY = (cells[i].y + cells[j].y) / 2 + (Math.cos(cells[j].pulsePhase) * 20);
            ctx.quadraticCurveTo(cpX, cpY, cells[j].x, cells[j].y);
            
            ctx.strokeStyle = `rgba(59, 130, 246, ${0.05 - dist / 5000})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        background: '#090a0f' // Very dark slate/black
      }}
    />
  );
};

export default OrganicBackground;
