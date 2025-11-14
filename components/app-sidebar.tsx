"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/browser"

export type SidebarView = "members" | "chats" | "righthands"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  activeView: SidebarView
  onViewChange: (view: SidebarView) => void
}

export function AppSidebar({ activeView, onViewChange, ...props }: AppSidebarProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

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
                  isActive={activeView === "chats"}
                  onClick={() => onViewChange("chats")}
                  className="data-[active=true]:bg-white/20 data-[active=true]:text-white hover:bg-white/10 hover:text-white active:bg-white/20 active:text-white"
                >
                  <span>Chats</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeView === "members"}
                  onClick={() => onViewChange("members")}
                  className="data-[active=true]:bg-white/20 data-[active=true]:text-white hover:bg-white/10 hover:text-white active:bg-white/20 active:text-white"
                >
                  <span>Members</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeView === "righthands"}
                  onClick={() => onViewChange("righthands")}
                  className="data-[active=true]:bg-white/20 data-[active=true]:text-white hover:bg-white/10 hover:text-white active:bg-white/20 active:text-white"
                >
                  <span>Righthands</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
