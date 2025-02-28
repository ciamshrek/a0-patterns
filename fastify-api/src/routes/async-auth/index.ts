import { FastifyPluginAsync } from "fastify";
import { AuthenticationClient } from "auth0";
import { consumeStatelessAuthorizationTicket } from "../../auth0-helper.js";
import { Redis } from "ioredis";
import { Queue } from "bullmq";
// import type { TokenEndpointResponse } from "oauth4webapi";

/**
 *
 * @param fastify
 * @param opts
 */
const asyncAuthRoutes: FastifyPluginAsync = async (
  fastify,
  opts
): Promise<void> => {
  // Helpful local kv client
  const redis = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT? parseInt(process.env.REDIS_PORT) || 6379 : 6379,
    maxRetriesPerRequest: null,
});

  const queue = new Queue("taskQueue", {
    connection: redis,
  })

  const client = new AuthenticationClient({
    domain: process.env.WORKER_AUTH0_DOMAIN!,
    clientId: process.env.WORKER_AUTH0_CLIENT_ID!,
    clientSecret: process.env.WORKER_AUTH0_CLIENT_SECRET!,
  });

  /**
   * Creates a Link Start Ticket
   *
   * POST /me/connect
   * {
   *  connection: 'google-oauth2',
   *  connection_scope: 'calendar'
   * }
   */
  fastify.get<{
    Querystring: {
      ticket: string;
    };
  }>("/start", async function (request, reply) {
    //   const body = request.query;
    if (!request.query.ticket) {
      return reply.redirect("/");
    }

    const params = await consumeStatelessAuthorizationTicket(
      request.query.ticket
    );

    console.log(params);
    const response = await client.oauth.pushedAuthorization({
      ...(params as any),
    });

    const url = new URL("/authorize", `https://${process.env.WORKER_AUTH0_DOMAIN}`);
    url.searchParams.set("request_uri", response.data.request_uri);
    url.searchParams.set("client_id", process.env.WORKER_AUTH0_CLIENT_ID!);

    return reply.redirect(url.toString());
  });

    /**
     * Callback after completing account linking
     */
    fastify.get<{ Querystring: { state: string; code: string } }>(
      "/callback",
      async function (request, reply) {
        const { state, code } = request.query;

        await queue.add("handleAsyncCallback", {
            code,
            state
        });

        // @todo: handle this better for iOS App
        return reply.redirect("/");
      }
    );
};

export default asyncAuthRoutes;
