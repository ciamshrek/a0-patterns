import type React from "react"
import { useAuth0 } from "@auth0/auth0-react"

const LoginPrompt: React.FC = () => {
  const { loginWithRedirect } = useAuth0()

  return (
    <div className="login-prompt">
      <h1>Welcome to AI Chat</h1>
      <p>Please log in to start chatting with our AI assistant.</p>
      <button className="login-button" onClick={() => loginWithRedirect()}>
        Log In
      </button>
    </div>
  )
}

export default LoginPrompt

