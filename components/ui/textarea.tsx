/**
 * components/ui/textarea.tsx
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-gray-300 aria-invalid:border-destructive bg-transparent flex field-sizing-content min-h-32 w-full border-0 border-b-2 border-gray-200 px-0 py-3 text-2xl transition-[border-color] outline-none focus:border-black disabled:cursor-not-allowed disabled:opacity-50 rounded-none resize-none",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
