import fp from 'fastify-plugin'
import fastifyAuth0Verify, { FastifyAuth0VerifyOptions } from 'fastify-auth0-verify'

export default fp<FastifyAuth0VerifyOptions>(async (fastify) => {
  fastify.register(fastifyAuth0Verify, {
    domain: process.env.AUTH0_DOMAIN,
    audience: process.env.AUTH0_AUDIENCE
  })
})
