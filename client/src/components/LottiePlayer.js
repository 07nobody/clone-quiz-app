import React, { useEffect, useRef } from 'react';

// Cache for loaded Lottie animations
const animationCache = new Map();

function LottiePlayer({ src, autoplay = true, loop = true, background = "transparent", speed = 1, style = {} }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    // Check if the lottie-player script is already loaded
    if (typeof window !== 'undefined' && !window.customElements?.get('lottie-player')) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js';
      script.async = true;
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    }
  }, []);

  useEffect(() => {
    // Only proceed if lottie-player is defined
    if (typeof window !== 'undefined' && window.customElements?.get('lottie-player') && containerRef.current) {
      // Check if we have a cached animation
      if (!animationCache.has(src)) {
        // Fetch animation data once and cache it
        fetch(src)
          .then(response => response.json())
          .then(animationData => {
            animationCache.set(src, animationData);
            if (playerRef.current) {
              // Load animation from the cached data
              playerRef.current.load(animationData);
            }
          })
          .catch(err => console.error('Failed to load Lottie animation:', err));
      } 
      
      // Create player element
      const player = document.createElement('lottie-player');
      playerRef.current = player;
      player.style.width = '100%';
      player.style.height = '100%';
      
      // Apply props
      player.background = background;
      player.speed = speed;
      
      if (autoplay) {
        player.setAttribute('autoplay', '');
      }
      
      if (loop) {
        player.setAttribute('loop', '');
      }

      // If we already have cached data, use it
      if (animationCache.has(src)) {
        player.load(animationCache.get(src));
      } else {
        player.src = src;
      }

      // Clear container and append
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(player);
      }
    }

    return () => {
      // Cleanup
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [src, autoplay, loop, background, speed]);

  const defaultStyle = { 
    width: '300px', 
    height: '300px',
    ...style
  };

  return <div ref={containerRef} style={defaultStyle}></div>;
}

export default LottiePlayer;
