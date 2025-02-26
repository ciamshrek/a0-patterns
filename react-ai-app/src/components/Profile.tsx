import type React from "react"
import { useAuth0 } from "@auth0/auth0-react"

const Profile: React.FC = () => {
  const { user } = useAuth0()

  return (
    <div>
      <h1>Profile</h1>
      {user && (
        <div>
          <img src={user.picture || "/placeholder.svg"} alt={user.name || "User"} />
          <h2>{user.name}</h2>
          <p>{user.email}</p>
        </div>
      )}
    </div>
  )
}

export default Profile

