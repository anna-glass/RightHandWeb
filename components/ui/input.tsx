import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-gray-300 selection:bg-primary selection:text-primary-foreground bg-transparent w-full min-w-0 border-0 border-b-2 border-gray-200 px-0 py-3 text-2xl transition-[border-color] outline-none file:inline-flex file:border-0 file:bg-transparent file:text-xl file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 rounded-none",
        "focus:border-black",
        "aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
