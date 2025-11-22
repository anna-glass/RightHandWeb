interface ProgressBarProps {
  currentSlide: number
  totalSlides: number
  onSlideClick: (index: number) => void
}

export function ProgressBar({ currentSlide, totalSlides, onSlideClick }: ProgressBarProps) {
  return (
    <div className="relative h-6 rounded-full p-1 cursor-pointer" style={{ backgroundColor: '#404040' }}>
      {/* clickable sections */}
      <div className="absolute inset-1 flex gap-1">
        {Array.from({ length: totalSlides }).map((_, index) => (
          <div
            key={index}
            onClick={() => onSlideClick(index)}
            className="flex-1 hover:rounded-full transition-all"
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#606060'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          />
        ))}
      </div>

      {/* active indicator */}
      <div
        id="progress-overlay"
        className="absolute top-1 h-4 bg-white rounded-full transition-all duration-300"
        style={{
          width: `calc((100% - 0.5rem) / ${totalSlides})`,
          left: `calc(0.25rem + ${currentSlide} * ((100% - 0.5rem) / ${totalSlides} + 0.25rem))`
        }}
      />
    </div>
  )
}
