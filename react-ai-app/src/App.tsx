import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import Header from "./components/Header";
import LoginPrompt from "./components/LoginPrompt";

const ChatApp = lazy(() => import("./components/ChatApp"));

function App() {
  const { isLoading, isAuthenticated } = useAuth0();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen text-lg">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="mx-auto w-full max-w-5xl mt-7">
        <main className="flex-1 flex justify-center items-center">
          <Suspense
            fallback={
              <div className="flex justify-center items-center text-lg">
                Loading...
              </div>
            }
          >
            <Routes>
              <Route
                path="/"
                element={isAuthenticated ? <ChatApp /> : <LoginPrompt />}
              />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default App;
