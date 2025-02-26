import { FastifyPluginAsync, FastifyRequest } from "fastify";
import { openai } from "@ai-sdk/openai";
import { z } from 'zod';
import { CoreMessage, streamText, tool, UIMessage } from "ai";
import { Auth0Helper } from "../../auth0-helper.js";
import { getValidatedIdTokenClaims } from "oauth4webapi";
import * as google from '@googleapis/calendar';
// import type { TokenEndpointResponse } from "oauth4webapi";

export function errorHandler(error: unknown) {
  if (error == null) {
    return 'unknown error';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return JSON.stringify(error);
}

/**
 * Simulates a very vocal, very local db.
 */
const transactions = new Map<string, string>();
const users = new Map<string, { refresh_token: string }>();

interface AuthenticatedRequest extends FastifyRequest {
  user: { sub: string }; // Explicitly define `user` with `sub`
}

function isAuthenticatedRequest(request: FastifyRequest): request is AuthenticatedRequest {
  if ('user' in request) {
    return true;
  }
  return false;
}

/**
 * 
 * @param fastify 
 * @param opts 
 */
const chat: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  const a0 = await Auth0Helper.create(
    process.env.AUTH0_DOMAIN!,
    process.env.AUTH0_CLIENT_ID!,
    process.env.AUTH0_CLIENT_SECRET!,
    process.env.REDIRECT_URI!,
  )

  /**
   * This can be rendered as a button in the app.
   */
  fastify.get("/connect", async function (request, reply) {
    const transaction = await a0.createAuthorizationURL({
      connection: "google-oauth2",
      access_type: "offline",
      // Make sure you have https://auth0.com/docs/authenticate/identity-providers/pass-parameters-to-idps params['prompt'] = 'prompt' for `google-oauth2` 
      prompt: "consent", 
    });
    transactions.set(transaction.state, transaction.codeVerifier);

    return reply.redirect(transaction.url);
  });

  /**
   * 
   */
  fastify.get<{ Querystring: { state: string, code: string } }>("/callback", async function (request, reply) {
    const { state, code } = request.query;
    const codeVerifier = transactions.get(state);
    
    if (!code || !codeVerifier || !state) {
      return reply.status(401).send("Unauthorized");
    }

    const tokens = await a0.handleCallback(codeVerifier, code, state);
    const claims = getValidatedIdTokenClaims(tokens);

    if (!claims || !tokens.refresh_token) {
      return reply.status(500).send("Unexpected server error");
    }

    users.set(claims.sub, { refresh_token: tokens.refresh_token });

    return reply.redirect('/');
  });

  fastify.post("/chat", { preValidation: fastify.authenticate } , async function (request, reply) {
    
    if (!isAuthenticatedRequest(request)) {
      reply.status(401).send("can only be called from authenticated requests");
      return;
    }

    const { messages } = (request.body ||  { messages: [] }) as {  messages: CoreMessage[] | UIMessage[] };

    const result = streamText({
      model: openai("gpt-4o"),
      messages,
      maxSteps: 10,
      tools: {
        // This is just /userinfo
        userinfo: tool({
          description: 'provides the current users profile information',
          parameters: z.object({}),
          async execute({}) {
            return (await fetch(new URL('/userinfo', process.env.AUTH0_DOMAIN), {
              headers: {
                'Authorization': request.headers.authorization!
              }
            })).json();
          }
        }),
        date_of_today: tool({
          description: 'Provides todays date as new Date from JavaScript',
          parameters: z.object({}),
          async execute() {
            return new Date();
          }
        }),
        call_google_calendar: tool({
          description: 'Provides Google Calendar Integration, allows the agent to access a user\'s calendar events and summarize their schedule.',
          parameters: z.object({
            startDate: z.string().describe('The start date (YYYY-MM-DD) for which to fetch calendar events.'),
            endDate: z.string().optional().describe('The optional end date (YYYY-MM-DD) for a range of events.')
          }),
          async execute({ startDate, endDate }) {
            const sub = request.user.sub;
            const userDict = users.get(sub);
        
            if (!userDict) {
              return new Error("Unable to get user's calendar events, user has not yet connected Google Calendar.");
            }
        
            // Get Google Access Token using FCAT
            const { accessToken } = await a0.federatedConnectionsTokenExchange(userDict.refresh_token, 'google-oauth2');
        
            // Initialize Google Calendar API
            const calendar = google.calendar({ version: 'v3', auth: accessToken });
        
            // Define time range
            const startOfRange = new Date(`${startDate}T00:00:00Z`).toISOString();
            const endOfRange = new Date(`${endDate || startDate}T23:59:59Z`).toISOString(); // Defaults to same day if endDate is not provided
        
            try {
              const response = await calendar.events.list({
                calendarId: 'primary',
                timeMin: startOfRange,
                timeMax: endOfRange,
                singleEvents: true,
                orderBy: 'startTime',
              });
        
              const events = response.data.items || [];
              if (events.length === 0) {
                return `You have no events scheduled from ${startDate} to ${endDate || startDate}.`;
              }
        
              // Summarize the events
              const summary = events.map(event => {
                const start = event.start!.dateTime || event.start!.date || "Unknown";
                const end = event.end!.dateTime || event.end!.date || "Unknown";
                return `• ${event.summary} from ${start} to ${end}`;
              }).join('\n');
        
              return `Here’s your schedule from ${startDate} to ${endDate || startDate}:\n${summary}`;
              
            } catch (error) {
              console.error('Error fetching calendar events:', error);
              return 'An error occurred while retrieving your calendar events.';
            }
          }
        }),
        weather: tool({
          description: 'Get the weather in a location',
          parameters: z.object({
            location: z.string().describe('The location to get the weather for'),
          }),
          execute: async ({ location }) => ({
            location,
            temperature: 72 + Math.floor(Math.random() * 21) - 10,
          }),
        }),
      }
    });

    // Mark the response as a v1 data stream:
    reply.header("X-Vercel-AI-Data-Stream", "v1");
    reply.header("Content-Type", "text/plain; charset=utf-8");

    return reply.send(result.toDataStream({
      getErrorMessage: errorHandler
    }));
  });
};

export default chat;
