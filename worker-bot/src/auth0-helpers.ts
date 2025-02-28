/**
 * @todo: this file should likely just use a more mature library
 */
import { randomBytes, createHash } from "node:crypto";
import * as jose from "jose";

const generateCodeChallenge = (codeVerifier) => {
  return createHash("sha256").update(codeVerifier).digest("base64url"); // Use 'base64url' for URL-safe encoding
};

/**
 * Helper function that creates a JWT ticket that can be used
 * by the library, to start the stateless authorization request
 * via the API Backend.
 */
export async function createStatelessAuthorizationTicket(
  jobId: string,
  userId: string,
  authorization_details: any
) {

    // Generate Worker-Signed JWT
  const secretKey = new TextEncoder().encode(process.env.APP_SHARED_SECRET!);
  const state = randomBytes(32).toString("base64url");
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const jwtPayload = {
    sub: userId,
    iss: "worker-service",
    aud: "api-auth-service",
    params: {
      // @todo: improve
      authorization_details: JSON.stringify(authorization_details),
      code_challenge: codeChallenge,

      // This is static for now, but can be encrypted
      // with additional data options about the request
      state,
    },
  };

  // @todo: encrypt
  const signedJwt = await new jose.SignJWT(jwtPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("72h") // 72 hours expiry time
    .setJti(jobId) // Unique nonce for replay protection
    .sign(secretKey);

  return { ticket: signedJwt, codeVerifier, state };
}
