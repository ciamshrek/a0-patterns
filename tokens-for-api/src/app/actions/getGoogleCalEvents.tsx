"use server";
import { auth0 } from "@/lib/auth0";
import { AccessTokenForConnectionError } from "@auth0/nextjs-auth0/errors";
import * as google from "@googleapis/calendar";

export type IResponse =
  | {
      status: "failed";
      error_code:
        | "not_logged_in"
        | "refresh_token_not_found"
        | "unknown_error"
        | "not_fetched";
      reason: string;
    }
  | {
      status: "success";
      events: google.calendar_v3.Schema$Event[]; // Using Google Calendar Event Schema
    };

/**
 * This uses FCAT to get Calendar Events for End User
 */
async function getGoogleCalEvents(): Promise<IResponse> {
  try {
    const session = auth0.getSession();

    if (!session) {
      return {
        status: "failed",
        error_code: "not_logged_in",
        reason: "User is not logged in",
      };
    }

    // This can throw an error `tokenset_not_found` if the social consent has not been granted
    // Google Access Token
    const { token } = await auth0.getAccessTokenForConnection({
      connection: "google-oauth2",
    });

    if (!token) {
      return {
        status: "failed",
        error_code: "unknown_error",
        reason: "Unexpected error.",
      };
    }
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });
    const calendar = google.calendar({
      version: "v3",
      auth,
    });
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: "startTime",
    });

    return {
      status: "success",
      events: response.data.items || [],
    };
  } catch (error: unknown) {
    if (error instanceof AccessTokenForConnectionError) {
      return {
        status: "failed",
        error_code: "refresh_token_not_found",
        reason:
          "You have not yet granted the permission to obtain calendar events on your behalf",
      };
    }
    return {
      status: "failed",
      error_code: "unknown_error",
      reason:
        error instanceof Error ? error.message : "An unknown error occurred",
    };
  }
}

export { getGoogleCalEvents };
