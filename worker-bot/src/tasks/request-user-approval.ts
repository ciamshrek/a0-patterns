import { Job } from "bullmq";
import { IAuthenticatedTaskContext } from "./i-authenticated-task-context";
import { AuthApiError, AuthenticationClient } from "auth0";
import { setTimeout } from "node:timers/promises";
import { createStatelessAuthorizationTicket } from "../auth0-helpers";
import { kv } from "../redis";

const { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, APP_HOST, AUTH0_AUDIENCE, AUTH0_SCOPE } = process.env;

export interface IRequestUserApprovalTaskContext
  extends IAuthenticatedTaskContext {
  found_item: {
    name: string;
    description: string;
  };
}

/**
 * Helper function for CIBA, also alternative can be to use
 * https://github.com/auth0-lab/auth0-ai-js/blob/main/packages/ai/src/authorizers/ciba-authorizer.ts
 *
 * This one is using Auth0-Node.
 */
async function authorizeWithCIBA(
  userId: string
): Promise<null | { access_token: string }> {
  const authClient = new AuthenticationClient({
    domain: AUTH0_DOMAIN,
    clientId: AUTH0_CLIENT_ID,
    clientSecret: AUTH0_CLIENT_SECRET,
  });

  let response;
  try {
    console.log("Attempting CIBA Authentication...");
    response = await authClient.backchannel.authorize({
      userId,
      scope: AUTH0_SCOPE,// must have openid
      binding_message: "hello", // @todo: The binding message should just be a short code
      audience: AUTH0_AUDIENCE,
      request_expiry: '300',
    });

    console.log(
      `CIBA request submitted successfully: Auth Request ID - ${response.auth_req_id}`
    );
  } catch (error) {
    // Continue or fully fail
    if (error instanceof AuthApiError) {
      if (error.error_description.includes("User does not have push")) {
        return null;
      }
    }
    throw error;
  }

  const expiresAt = Date.now() + response.expires_in * 1000;

  do {
    // Wait for interval
    try {
      await setTimeout(response.interval * 1000);
      const tokens = await authClient.backchannel.backchannelGrant(response);
      return tokens;
    } catch (err) {
      if (err instanceof AuthApiError) {
        // back-off to avoid swarming the server, 10 seconds, 20 seconds,
        // 40 seconds, 80 seconds will end up with 300 seconds.
        if (err.error === "authorization_pending" || err.error === "slow_down") {
          response.interval *= 2;
          console.log("Trying again in %d seconds ", response.interval);
        } else {
          throw err;
        }
      }
    }
  } while (Date.now() < expiresAt);

  return null;
}

/**
 * Attempts to initiate CIBA authentication with the user.
 * If CIBA fails, it falls back to a secondary approach (e.g., Worker-signed JWT + PAR).
 */
export async function requestUserApproval(
  job: Job<IRequestUserApprovalTaskContext>
) {
  const { user_id: userId } = job.data;
  try {
    console.log(
      `Processing job ${job.id}: Requesting user approval for ${job.data.found_item.name}`
    );

    const tokens = await authorizeWithCIBA(userId);
    // do something with tokens.
    if (tokens != null) {
      console.log("Grant successful -- do something");
      return;
    }
  } catch (err) {
    console.error(err);
    console.error("FATAL Error obtaining CIBA, returning");
  }

  // 2️⃣ CIBA Failed: Fall Back to Worker-Signed JWT + PAR
  try {
    console.log("Falling back to Worker-based JWT + PAR...");

    const { ticket, codeVerifier, state } = await createStatelessAuthorizationTicket(
        job.id, 
        job.data.user_id, 
        [{
            type: "item_approval",
            item_name: job.data.found_item.name,
            item_description: job.data.found_item.description,
        }], 
        AUTH0_CLIENT_ID, 
        AUTH0_AUDIENCE,
        AUTH0_SCOPE,
        `${process.env.APP_HOST}/async-auth/callback`
    );

    // Store the state: codeVerifier
    kv.set(state, codeVerifier);

    // Notify user via email or message service (mocked for now)
    console.log(
      `Send user approval request via: ${
        APP_HOST
      }/async-auth/start?ticket=${
        ticket
      }`
    );
  } catch (fallbackError) {
    console.error(
      "Fallback to JWT + PAR also failed:",
      fallbackError.response?.data || fallbackError.message
    );
  }
}
