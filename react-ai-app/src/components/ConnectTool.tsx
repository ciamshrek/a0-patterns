"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PlusCircle, ChevronRight, Loader2 } from "lucide-react";
import { useAuth0 } from "@/lib/use-auth0";

/**
 * Creates a wrapper function to create an http post request and connect at tool
 */
function useConnectTool<T>(toolParams: T) {
  const { fetch, getIdToken } = useAuth0();
  const [isLoading, updateIsLoading] = useState<boolean>(false);

  const connect = useCallback(
    async function () {
      if (isLoading) {
        return;
      }

      updateIsLoading(true);
      const response = await fetch("http://localhost:3000/api/me/connect", {
        method: "POST",
        body: JSON.stringify(toolParams),
      });

      if (!response.ok) {
        // set error tbd later
        console.error(await response.text()); // try parse as json first, then parse as text if all fails, wost case network error
        throw new Error(
          "Unimplemented, should replace with error setting in state"
        );
      }

      const { ticket, endpoint } = await response.json();
      const url = new URL(endpoint, "http://localhost:3000");
      url.searchParams.set("id_token_hint", await getIdToken());
      url.searchParams.set("ticket", ticket);


      window.location.href = url.toString();
      // window.open(url, 'popup', 'width=600,height=400');
      // window.addEventListener("close")
      // window.onclose = () => {
      //   updateIsLoading(false);
      // }
    },
    [fetch, isLoading, getIdToken]
  );

  return { connect, isLoading };
}

export default function ConnectTool() {
  const [isOpen, setIsOpen] = useState(false);

  const google = useConnectTool({
    connection: "google-oauth2",
    connection_scope: "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events.readonly",
    access_type: "offline"
  });


  const handleSlackConnect = () => {
    // Implement Slack OAuth connection
    console.log("Connecting to Slack...");
    // This would typically open a new window for OAuth authentication
    setIsOpen(false);
  };

  const handleGithubConnect = () => {
    // Implement GitHub OAuth connection
    console.log("Connecting to GitHub...");
    // This would typically open a new window for OAuth authentication
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="rounded-full"
          aria-label="Connect tools"
        >
          <PlusCircle className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-0 bg-white"
        align="start"
        side="top"
        sideOffset={10}
      >
        <div className="flex flex-col divide-y divide-gray-200">
          <Button variant={"link"} className="h-12" onClick={google.connect}>
            {
              google.isLoading === false
                ? <div className="flex-shrink-0 w-6 h-6 relative">
                    <img className="w-full h-full" src="/Google.svg" />
                  </div>
                : <Loader2 />
            }
            <span className="text-sm font-medium">
              Connect to Google Calendar
            </span>
          </Button>

          <button
            className="flex items-center justify-between gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors w-full"
            onClick={handleSlackConnect}
          >
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center relative">
                <img className="w-full h-full" src="/Slack.svg" />
              </div>
              <span className="text-sm font-medium">Connect to Slack</span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-500" />
          </button>

          <button
            className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            onClick={handleGithubConnect}
          >
            <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center relative">
              <img className="w-full h-full" src="/Github.svg" />
            </div>
            <span className="text-sm font-medium">Connect to GitHub</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
