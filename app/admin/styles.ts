/**
 * app/admin/styles.ts
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

export const styles = {
  // layout
  container: "relative flex flex-col h-screen bg-cover bg-center bg-no-repeat",
  overlay: "absolute inset-0 bg-black/50 backdrop-blur-sm z-0",
  content: "relative z-10 flex flex-1 p-6 pt-0",
  mainPanel: "flex flex-1 gap-4 bg-white rounded-3xl p-3 shadow-2xl max-w-5xl mx-auto w-full",

  // toolbar
  toolbar: "relative z-10 flex items-center justify-between px-6 py-2 backdrop-blur-sm",
  toolbarButton: "text-white text-sm font-medium hover:opacity-70 transition-opacity",
  toolbarTime: "text-white text-sm font-medium",

  // users panel
  usersPanel: "w-80 flex flex-col bg-white rounded-2xl shadow-[0_0_15px_rgba(0,0,0,0.1)] overflow-hidden",
  windowControls: "px-4 pt-4 pb-5 flex items-center gap-2.5",
  windowButton: "w-4 h-4 rounded-full transition-colors",
  searchContainer: "px-4 pb-5",
  searchInput: "w-full rounded-full bg-gray-100 border-0 pl-11 pr-4 py-2.5 text-base focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500",
  usersList: "flex-1 overflow-y-auto",

  // user list item
  userItem: "w-full p-5 flex items-center gap-4 hover:bg-gray-50 transition-colors border-b border-gray-100",
  userItemSelected: "bg-gray-100",
  userAvatar: "w-14 h-14 rounded-full border border-gray-200",
  userAvatarPlaceholder: "w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center",
  userInfo: "flex-1 min-w-0 text-left",
  userName: "text-base font-medium truncate",
  userSubtext: "text-sm text-muted-foreground truncate",

  // chat panel
  chatPanel: "flex-1 flex flex-col rounded-2xl overflow-hidden relative",
  messagesContainer: "absolute inset-0 overflow-y-auto overflow-x-hidden",
  messagesContent: "p-4 pt-24 pb-20 space-y-4",

  // chat header
  chatHeader: "absolute top-0 left-0 right-0 flex justify-center pt-4 z-10 pointer-events-none",
  chatHeaderAvatar: "w-16 h-16 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.15)] relative z-10 -mb-2",
  chatHeaderAvatarPlaceholder: "w-16 h-16 rounded-full bg-gray-200 shadow-[0_0_10px_rgba(0,0,0,0.15)] flex items-center justify-center relative z-10 -mb-2",
  chatHeaderName: "px-4 py-1.5 bg-white/80 backdrop-blur-md rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)]",

  // message bubble
  messageSent: "bg-[#007AFF]",
  messageReceived: "bg-gray-100",
  messageBubble: "max-w-md rounded-2xl px-4 py-2",
  messageTextSent: "text-base whitespace-pre-wrap break-words text-white",
  messageTextReceived: "text-base whitespace-pre-wrap break-words text-gray-900",
  messageTimeSent: "text-xs mt-1 text-white/70",
  messageTimeReceived: "text-xs mt-1 text-gray-500",

  // message input (disabled)
  inputContainer: "absolute bottom-0 left-0 right-0 p-4 opacity-50 z-10 pointer-events-none",
  inputWrapper: "flex items-center gap-3",
  inputPlusButton: "h-9 w-9 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-[0_0_8px_rgba(0,0,0,0.1)] cursor-not-allowed",
  inputCapsule: "flex-1 flex items-center gap-2 bg-white rounded-full px-4 h-9 shadow-[0_0_8px_rgba(0,0,0,0.1)]",
  inputField: "flex-1 bg-transparent border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto text-base placeholder:text-gray-500 cursor-not-allowed",
}
