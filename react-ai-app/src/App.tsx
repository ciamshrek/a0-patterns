import { lazy, Suspense } from "react"
import { Route, Routes } from "react-router-dom"
import { useAuth0 } from "@auth0/auth0-react"
import Header from "./components/Header"
import LoginPrompt from "./components/LoginPrompt"

const ChatApp = lazy(() => import("./components/ChatApp"))

function App() {
  const { isLoading, isAuthenticated } = useAuth0()

  if (isLoading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="app">
      <Header />
      <main>
        <Suspense fallback={<div className="loading">Loading...</div>}>
          <Routes>
            <Route path="/" element={isAuthenticated ? <ChatApp /> : <LoginPrompt />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}

export default App

