import type React from "react"
import { useAuth0 } from "@auth0/auth0-react"

const Avatar: React.FC = () => {
  const { user } = useAuth0()

  if (!user) {
    return null
  }

  return (
    <img
      src={user.picture || "/placeholder.svg"}
      alt={user.name || "User avatar"}
      className="avatar"
      style={{ width: "50px", height: "50px", borderRadius: "50%" }}
    />
  )
}

export default Avatar

