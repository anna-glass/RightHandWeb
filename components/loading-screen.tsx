import { SyncLoader } from "react-spinners"

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <SyncLoader color="#ffffff" size={10} />
    </div>
  )
}
