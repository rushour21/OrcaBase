// public/widget-loader.js
import dotenv from "dotenv";
dotenv.config();

(function() {
  const script = document.currentScript;
  const apiKey = script.getAttribute('data-api-key');

  // 1. Create the Bubble Button
  // 1. Create the Bubble Button
const bubble = document.createElement('div');

// Use a clean SVG instead of an emoji
bubble.innerHTML = `
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/>
  </svg>
`;

Object.assign(bubble.style, {
  position: 'fixed',
  bottom: '20px',
  right: '20px',
  width: '60px',
  height: '60px',
  borderRadius: '50%',
  backgroundColor: '#22D3EE', // Your brand color
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  zIndex: '999999',
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  transform: 'scale(1)'
});

// Add Hover Effects
bubble.onmouseenter = () => {
  bubble.style.transform = 'scale(1.1)';
  bubble.style.boxShadow = '0 6px 16px rgba(0,0,0,0.3)';
};
bubble.onmouseleave = () => {
  bubble.style.transform = 'scale(1)';
  bubble.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
};

document.body.appendChild(bubble);

  // 2. Create the Iframe Container
  const container = document.createElement('div');
  container.style.display = 'none'; // Hidden by default
  Object.assign(container.style, {
    position: 'fixed', bottom: '90px', right: '20px',
    width: '400px', height: '600px', zIndex: '999999'
  });

  const iframe = document.createElement('iframe');
  iframe.src = `${process.env.FRONTEND_URL}/embed/chat?apiKey=${apiKey}`; // Your React App URL
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.style.borderRadius = '12px';
  iframe.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';

  container.appendChild(iframe);
  document.body.appendChild(container);

  // 3. Toggle Open/Close
  bubble.onclick = () => {
    container.style.display = container.style.display === 'none' ? 'block' : 'none';
  };
})();