/**
 * app/admin/components/MessageInput.tsx
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

import { Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { styles } from "../styles"

/**
 * MessageInput
 * disabled imessage-style input for display only.
 */
export function MessageInput() {
  return (
    <div className={styles.inputContainer}>
      <div className={styles.inputWrapper}>
        <button disabled className={styles.inputPlusButton}>
          <Plus className="w-5 h-5 text-gray-700" />
        </button>
        <div className={styles.inputCapsule}>
          <Input
            type="text"
            placeholder="iMessage"
            value=""
            disabled
            className={styles.inputField}
          />
        </div>
      </div>
    </div>
  )
}
