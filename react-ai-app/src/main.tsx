import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter as Router } from "react-router-dom"
import { Auth0Provider } from "@auth0/auth0-react"
import App from "./App"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Router>
      <Auth0Provider
        domain={import.meta.env.AUTH0_DOMAIN}
        clientId={import.meta.env.AUTH0_CLIENT_ID}
        authorizationParams={{
          audience: import.meta.env.AUTH0_AUDIENCE,
          scope: import.meta.env.AUTH0_SCOPE,
          redirect_uri: window.location.origin,
        }}
      >
        <App />
      </Auth0Provider>
    </Router>
  </React.StrictMode>,
)

