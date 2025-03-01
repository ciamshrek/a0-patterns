import type React from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
// import * as Avatar from "@radix-ui/react-avatar"

const Header: React.FC = () => {
  const { isAuthenticated, loginWithRedirect, logout, user } = useAuth0();

  return (
    <header className="header p-2 bg-blue-50 border-b-1 border-b-blue-950">
      <div className="flex max-w-5xl m-auto">
        <div className="logo">AI Chat</div>
        <div className="flex-grow"></div>
        <div className="flex gap-3 items-center">
          {isAuthenticated ? (
            <>
              <Avatar>
                <AvatarImage src={user?.picture} />
                <AvatarFallback>
                  {user?.name?.substring(0, 2) || "U"}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="destructive"
                className="p-4"
                onClick={() =>
                  logout({ logoutParams: { returnTo: window.location.origin } })
                }
              >
                <span>Log Out</span>
              </Button>
            </>
          ) : (
            <Button className="auth-button" onClick={() => loginWithRedirect()}>
              Log In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
