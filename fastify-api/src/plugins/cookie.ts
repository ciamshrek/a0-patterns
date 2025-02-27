import fp from 'fastify-plugin'
import fc, { FastifyCookie } from '@fastify/cookie'

/**
 * 
 */
export default fp<FastifyCookie>(async (fastify) => {
  return fastify.register(fc, {
    secret: process.env.SIGNING_SECRET,
    parseOptions: {
        httpOnly: true,
        signed: true,
    }
  })
})
