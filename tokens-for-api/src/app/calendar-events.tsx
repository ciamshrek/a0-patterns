"use client";

import { useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  getGoogleCalEvents,
  type IResponse,
} from "@/app/actions/getGoogleCalEvents";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CalendarIcon, AlertCircle, LogIn, ExternalLink } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Fetching..." : "Load Calendar Events"}
    </Button>
  );
}

export default function CalendarEvents() {
  const [state, setState] = useState<IResponse>({
    status: "failed",
    error_code: "not_fetched",
    reason: "We have not fetched the events yet",
  });
  const [, startTransition] = useTransition();

  // Helper function to format date
  const formatEventDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  const handleSubmit = async () => {
    startTransition(async () => {
      const result = await getGoogleCalEvents();
      setState(result);
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Tokens for APIs Demo
          </CardTitle>
          <CardDescription className="pt-2">
            Check your current calendar events
          </CardDescription>
        </CardHeader>

        <CardContent>
          {state?.status === "success" ? (
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Your Upcoming Events
              </h3>

              {state.events && state.events.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No upcoming events found
                </p>
              ) : (
                <div className="space-y-3">
                  {state.events &&
                    state.events.map((event, index) => (
                      <div
                        key={event.id || index}
                        className="border rounded-lg p-3"
                      >
                        <h4 className="font-medium">
                          {event.summary || "Untitled Event"}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {formatEventDate(
                            event.start?.dateTime ||
                              event.start?.date ||
                              undefined
                          )}{" "}
                          -
                          {formatEventDate(
                            event.end?.dateTime || event.end?.date || undefined
                          )}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center space-y-4 py-4">
              {state?.error_code === "not_logged_in" && (
                <div className="flex flex-col items-center gap-2">
                  <AlertCircle className="h-10 w-10 text-amber-500" />
                  <p>You need to log in to access your calendar events.</p>
                </div>
              )}

              {"error_code" in state &&
                state.error_code === "refresh_token_not_found" && (
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="h-10 w-10 text-amber-500" />
                    <p>
                      You need to grant permission to access your Google
                      Calendar.
                    </p>
                  </div>
                )}

              {state?.error_code === "unknown_error" && (
                <div className="flex flex-col items-center gap-2">
                  <AlertCircle className="h-10 w-10 text-red-500" />
                  <p>An error occurred: {state.reason}</p>
                </div>
              )}

              {!state && (
                <div className="flex flex-col items-center gap-2">
                  <CalendarIcon className="h-10 w-10 text-primary" />
                  <p>Click the button below to fetch your calendar events</p>
                </div>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-center">
          {"error_code" in state && state.error_code === "not_logged_in" ? (
            <Button
              size="lg"
              className="w-full flex items-center gap-2"
              asChild
            >
              <a href="/auth/login">
                <LogIn className="h-4 w-4" />
                Login to get Started
              </a>
            </Button>
          ) : "error_code" in state &&
            state.error_code === "refresh_token_not_found" ? (
            <Button
              size="lg"
              className="w-full flex items-center gap-2"
              asChild
            >
              <a href="/auth/login?connection=google-oauth2&prompt=consent&connection_scope=https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events.readonly&access_type=offline">
                <ExternalLink className="h-4 w-4" />
                Grant Google Calendar Access
              </a>
            </Button>
          ) : (
            <form action={handleSubmit} className="w-full space-y-3">
              <SubmitButton />
              <Button variant={"outline"} className="text-red-500 hover:text-red-500 active:text-red-700 w-full" asChild ><a href="/auth/logout">Logout</a></Button>
            </form>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
