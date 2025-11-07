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
    <Sidebar collapsible="none" className="text-white m-4 mb-4 rounded-lg h-[calc(100vh-2rem)]" {...props}>
      <SidebarHeader>
        <div className="px-2 py-2">
          <img src="/righthand.png" alt="Right Hand" className="h-8 w-auto" />
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
                  className="data-[active=true]:bg-white/20 data-[active=true]:text-white hover:bg-white/10 hover:text-white active:bg-white/20 active:text-white"
                >
                  <Users />
                  <span>Members</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeView === "conversations"}
                  onClick={() => onViewChange("conversations")}
                  className="data-[active=true]:bg-white/20 data-[active=true]:text-white hover:bg-white/10 hover:text-white active:bg-white/20 active:text-white"
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
