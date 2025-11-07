"use client"

import * as React from "react"
import { Users, MessageSquare } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"

export type SidebarView = "members" | "conversations"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  activeView: SidebarView
  onViewChange: (view: SidebarView) => void
}

export function AppSidebar({ activeView, onViewChange, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="none" className="bg-muted" {...props}>
      <SidebarHeader>
        <div className="px-2 py-2">
          <h2 className={cn(typography.h4)}>Right Hand</h2>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeView === "members"}
                  onClick={() => onViewChange("members")}
                >
                  <Users />
                  <span>Members</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeView === "conversations"}
                  onClick={() => onViewChange("conversations")}
                >
                  <MessageSquare />
                  <span>Conversations</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
