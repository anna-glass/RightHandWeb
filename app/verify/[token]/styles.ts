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

export const navButtonClass = "gap-2 hover:bg-transparent hover:underline text-white hover:text-white"
