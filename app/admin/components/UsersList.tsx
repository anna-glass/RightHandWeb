/**
 * app/admin/components/UsersList.tsx
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"
import { styles } from "../styles"
import { UserListItem } from "./UserListItem"
import type { UserProfile } from "../types"

interface UsersListProps {
  users: UserProfile[]
  selectedUserId: string | null
  searchQuery: string
  onSearchChange: (query: string) => void
  onUserSelect: (user: UserProfile) => void
}

/**
 * UsersList
 * left panel with search and scrollable user list.
 */
export function UsersList({
  users,
  selectedUserId,
  searchQuery,
  onSearchChange,
  onUserSelect
}: UsersListProps) {
  return (
    <div className={styles.usersPanel}>
      {/* window controls */}
      <div className={styles.windowControls}>
        <button className={cn(styles.windowButton, "bg-red-500 hover:bg-red-600")} title="Close" />
        <button className={cn(styles.windowButton, "bg-yellow-500 hover:bg-yellow-600")} title="Minimize" />
        <button className={cn(styles.windowButton, "bg-green-500 hover:bg-green-600")} title="Maximize" />
      </div>

      {/* search bar */}
      <div className={styles.searchContainer}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <Input
            type="search"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* users list */}
      <div className={styles.usersList}>
        {users.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className={cn(typography.body, "text-muted-foreground")}>
              {searchQuery ? 'No users match your search' : 'No users found'}
            </p>
          </div>
        ) : (
          users.map((user) => (
            <UserListItem
              key={user.id}
              user={user}
              isSelected={selectedUserId === user.id}
              onSelect={() => onUserSelect(user)}
            />
          ))
        )}
      </div>
    </div>
  )
}
