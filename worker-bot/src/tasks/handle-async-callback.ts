import { Job } from "bullmq";
import { kv } from "../redis";
import { AuthenticationClient } from "auth0";

/**
 * This context cannot be authenticated.
 */
export interface IHandleAsyncCallback {
    state: string;
    code: string;
}

/**
 * Finds the item for the user, 
 * with some random proability (100% for mock)
 */
export async function handleAsyncCallback(job: Job<IHandleAsyncCallback>) {
    const { state, code } = job.data;
    const codeVerifier = await kv.get(job.data.state);

    if (!codeVerifier) {
        console.log("ignoring, code-verifier not found");
        return;
    }

    const { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET } = process.env;
    const client = new AuthenticationClient({
        domain: AUTH0_DOMAIN,
        clientId: AUTH0_CLIENT_ID,
        clientSecret: AUTH0_CLIENT_SECRET,    
    });

    try {
        const tokens = await client.oauth.authorizationCodeGrantWithPKCE({
            code,
            code_verifier: codeVerifier
        })
    
        if (tokens) {
            console.log("Eventually successfull -- perform task here" );
        }
    
        await kv.del(job.data.state);
    } catch (err) {
        console.error("unable to finish task, error");
        console.error(err);
    }
}