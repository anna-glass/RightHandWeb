/**
 * app/verify/[token]/styles.ts
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

export const animations = `
  @keyframes bounce-scale {
    0% { transform: scale(1); }
    40% { transform: scale(1.08); }
    60% { transform: scale(0.98); }
    80% { transform: scale(1.02); }
    100% { transform: scale(1); }
  }
  .animate-bounce-quick {
    animation: bounce-scale 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
`
