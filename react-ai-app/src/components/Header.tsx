import type React from "react"
import { useAuth0 } from "@auth0/auth0-react"
import * as Avatar from "@radix-ui/react-avatar"

const Header: React.FC = () => {
  const { isAuthenticated, loginWithRedirect, logout, user } = useAuth0()

  return (
    <header className="header">
      <div className="logo">AI Chat</div>
      <div className="auth-section">
        {isAuthenticated ? (
          <>
            <Avatar.Root className="avatar-root">
              <Avatar.Image className="avatar-image" src={user?.picture} alt={user?.name || "User"} />
              <Avatar.Fallback className="avatar-fallback">{user?.name?.[0] || "U"}</Avatar.Fallback>
            </Avatar.Root>
            <button
              className="auth-button"
              onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            >
              Log Out
            </button>
          </>
        ) : (
          <button className="auth-button" onClick={() => loginWithRedirect()}>
            Log In
          </button>
        )}
      </div>
    </header>
  )
}

export default Header

