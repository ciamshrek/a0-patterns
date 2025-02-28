import * as oauth2 from "oauth4webapi";
import * as jose from "jose";
// import hkdf from "@panva/hkdf";

// let oauth = require('oauth4webapi')
export const GRANT_TYPE_FEDERATED_CONNECTION_ACCESS_TOKEN =
  "urn:auth0:params:oauth:grant-type:token-exchange:federated-connection-access-token";
const SUBJECT_TYPE_REFRESH_TOKEN =
  "urn:ietf:params:oauth:token-type:refresh_token";

export const SUBJECT_TYPE_ACCESS_TOKEN =
  "urn:ietf:params:oauth:token-type:access_token";

export const REQUESTED_TOKEN_TYPE_FEDERATED_CONNECTION_ACCESS_TOKEN =
  "http://auth0.com/oauth/token-type/federated-connection-access-token";

const REQUESTED_TOKEN_TYPE_SESSION_TOKEN =
  "urn:auth0:params:oauth:token-type:session_token";

const CUSTOM_SUBJECT_TOKEN = "urn:auth101:sso:access_token";

const TOKEN_EXCHANGE = "urn:ietf:params:oauth:grant-type:token-exchange";

export class Auth0Helper {
  public static readonly CODE_CHALLENGE_METHOD = "S256";

  /**
   * Helper function to create object for the Action from @abbaspour/client-initiated-account-linking
   * 
   * @param param0 
   */
  static linkAccount({ connection, connection_scope, scope, ...rest }: { connection: string, connection_scope: string, [key:string]: string }) {
    return {
      ...rest,
      'ext-requested_connection': connection,
      'ext-requested_connection_scope': connection_scope,
      'audience': process.env.AUTH0_AUDIENCE!,
      'scope': 'openid link_account'
    };
  }

  /**
   * Helper function to create authorization object for @abbaspour/client-initiated-account-linking
   * 
   * @param params must be a dictionary containing connection as the connection-name of the identity to unlink
   * @returns 
   */
  static unlinkAccounts({ connection }: { connection: string }) {
    return {
      'scope': 'openid unlink_account',
      'audience': process.env.AUTH0_AUDIENCE!
    }
  }

  /**
   * Creates an account
   * 
   * @param domain 
   * @param clientId 
   * @param clientSecret 
   * @param redirectUri 
   * @returns 
   */
  static async create(
    domain: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<Auth0Helper> {
    const issuer = new URL(domain);
    const as = await oauth2
      .discoveryRequest(issuer, { algorithm: "oidc" })
      .then((response) => oauth2.processDiscoveryResponse(issuer, response));
    const client = {
      client_id: clientId,
      redirect_uri: redirectUri,
    };
    const clientAuth: oauth2.ClientAuth = oauth2.ClientSecretPost(clientSecret);

    return new Auth0Helper(as, client, clientAuth);
  }

  private constructor(
    public readonly as: oauth2.AuthorizationServer,
    public readonly client: oauth2.Client & { redirect_uri: string },
    public readonly clientAuth: oauth2.ClientAuth
  ) {}

  async createAuthorizationURL(
    additionalParams: Record<string, string>
  ): Promise<{ url: string; codeVerifier: string; state: string }> {
    const codeVerifier = oauth2.generateRandomCodeVerifier();
    const codeChallenge = await oauth2.calculatePKCECodeChallenge(codeVerifier);
    const state = oauth2.generateRandomState();

    // unique scopes
    const scope = [
      ...new Set([
        "openid",
        "profile",
        "name",
        "email",
        ...((additionalParams["scope"] || "").split(" ") || []),
      ]),
    ].join(" ");

    const params = new URLSearchParams();
    params.set("client_id", this.client.client_id);
    params.set("redirect_uri", this.client.redirect_uri);
    params.set("response_type", "code");
    params.set("scope", scope);
    params.set("code_challenge", codeChallenge);
    params.set("code_challenge_method", Auth0Helper.CODE_CHALLENGE_METHOD);
    params.set("state", state);

    /**
     * Support additional params, safely :P
     */
    for (const [key, value] of Object.entries(additionalParams)) {
      if (!params.has(key)) {
        params.set(key, value);
      }
    }

    // If using PAR
    //
    // const response = await oauth2.pushedAuthorizationRequest(
    //   this.as,
    //   this.client,
    //   this.clientAuth,
    //   params
    // );
    // const result = await oauth2.processPushedAuthorizationResponse(
    //   this.as,
    //   this.client,
    //   response
    // );

    const authorizationUrl = new URL(this.as.authorization_endpoint!);
    authorizationUrl.search = params.toString();

    // If using PAR
    //
    // authorizationUrl.searchParams.set("request_uri", result.request_uri);
    // authorizationUrl.searchParams.set("client_id", this.client.client_id);

    return { url: authorizationUrl.toString(), codeVerifier, state };
  }

  async handleCallback(codeVerifier: string, code: string, state: string) {
    const responseUrl = new URL(this.client.redirect_uri);
    responseUrl.searchParams.set("code", code);
    responseUrl.searchParams.set("state", state);

    const callbackParams = await oauth2.validateAuthResponse(
      this.as,
      this.client,
      responseUrl,
      oauth2.skipStateCheck
    );

    const response = await oauth2.authorizationCodeGrantRequest(
      this.as,
      this.client,
      this.clientAuth,
      callbackParams,
      this.client.redirect_uri,
      codeVerifier
    );

    const result = await oauth2.processAuthorizationCodeResponse(
      this.as,
      this.client,
      response
    );

    return result;
  }

  /**
   * Implements a Custom Token Exchange to exchange an AT for an RT. That we can then use for Native to Web
   *
   * @param refreshToken
   * @returns
   */
  async customTokenExchange(accessToken: string) {
    const params = new URLSearchParams();

    params.append("subject_token_type", CUSTOM_SUBJECT_TOKEN);
    params.append("subject_token", accessToken);
    params.append("scope", "openid offline_access");

    const httpResponse = await oauth2.genericTokenEndpointRequest(
      this.as,
      this.client,
      this.clientAuth,
      TOKEN_EXCHANGE,
      params
    );

    let tokenEndpointResponse: oauth2.TokenEndpointResponse;

    try {
      tokenEndpointResponse = await oauth2.processGenericTokenEndpointResponse(
        this.as,
        this.client,
        httpResponse
      );
    } catch (err) {
      throw new Error(
        "Failed to exchange Access Token for Access Token" +
          (err as Error).toString()
      );
    }

    return {
      accessToken: tokenEndpointResponse.access_token,
      refreshToken: tokenEndpointResponse.refresh_token!,
      expiresAtMs: tokenEndpointResponse.expires_in! * 1000 + Date.now(),
      scope: tokenEndpointResponse.scope!,
    };
  }

  /**
   * This one actually does the native to web
   *
   * @param refreshToken
   * @returns
   */
  async nativeToWeb(refreshToken: string): Promise<string> {
    const params = new URLSearchParams();

    params.append("subject_token_type", SUBJECT_TYPE_REFRESH_TOKEN);
    params.append("subject_token", refreshToken);
    params.append("client_id", "yi2T5EfjD9fiZ2NLBYH1tYDMasWUn5S6");

    params.append("requested_token_type", REQUESTED_TOKEN_TYPE_SESSION_TOKEN);

    const httpResponse = await oauth2.genericTokenEndpointRequest(
      this.as,
      this.client,
      this.clientAuth,
      TOKEN_EXCHANGE,
      params
    );

    // return httpResponse.text()

    let tokenEndpointResponse: { access_token: string };
    try {
      tokenEndpointResponse = (await httpResponse.json()) as {
        access_token: string;
      };
      return tokenEndpointResponse.access_token;
    } catch (err) {
      throw new Error(
        "Failed to exchange N2W Session Token " + (err as Error).toString()
      );
    }
  }

  /**
   * This is a helper function that must be called to first invoke account linking ticket
   */
  async createStatelessAuthorizeTicket<T extends { sub: string, authz_params: { [key: string]: string } }>({
    sub,
    ...rest
  }: T) {
    const key = new TextEncoder().encode(process.env.SIGNING_SECRET);

    const token = new jose.SignJWT({
      ...rest,
    })
      .setSubject(sub)
      .setAudience("https://api.example/")
      .setIssuer("https://api.example/")
      .sign(key);

    return token;
  }

  async resumeStatelessAuthorizeRequest<T extends { sub: string, authz_params: { [key: string]: string } }>(token: string, id_token_hint: string) {
    const key = new TextEncoder().encode(process.env.SIGNING_SECRET);
    const JWKS = jose.createRemoteJWKSet(new URL('.well-known/jwks.json', process.env.AUTH0_DOMAIN!));
    const { payload } = await jose.jwtVerify<T>(token, key);

    const { payload: idTokenPayload } = await jose.jwtVerify<T>(token, JWKS);

    if (payload.sub !== idTokenPayload.sub) {
      throw new Error("login_required")
    }

    return this.createAuthorizationURL({
      ...payload.authz_params,
      id_token_hint,
    });
  }

  async federatedConnectionsTokenExchange(
    refreshToken: string,
    connection: string,
    login_hint: string | undefined = undefined,
    additionalParams: Record<string, string> = {}
  ) {
    const params = new URLSearchParams();

    params.append("connection", connection);
    params.append("subject_token_type", SUBJECT_TYPE_REFRESH_TOKEN);
    params.append("subject_token", refreshToken);

    params.append(
      "requested_token_type",
      REQUESTED_TOKEN_TYPE_FEDERATED_CONNECTION_ACCESS_TOKEN
    );

    if (login_hint) {
      params.append("login_hint", login_hint);
    }

    /**
     * Support additional params, safely :P
     */
    for (const [key, value] of Object.entries(additionalParams)) {
      if (!params.has(key)) {
        params.set(key, value);
      }
    }

    const httpResponse = await oauth2.genericTokenEndpointRequest(
      this.as,
      this.client,
      this.clientAuth,
      GRANT_TYPE_FEDERATED_CONNECTION_ACCESS_TOKEN,
      params
    );

    let tokenEndpointResponse: oauth2.TokenEndpointResponse;
    try {
      tokenEndpointResponse = await oauth2.processGenericTokenEndpointResponse(
        this.as,
        this.client,
        httpResponse
      );
    } catch (err) {
      throw new Error(
        "Failed to exchange Federated Connection Access Token " +
          (err as Error).toString()
      );
    }

    return {
      accessToken: tokenEndpointResponse.access_token,
      expiresAtMs: tokenEndpointResponse.expires_in! * 1000 + Date.now(),
      scope: tokenEndpointResponse.scope!,
    };
  }
}



/**
 * Helper function that creates a JWT ticket that can be used
 * by the library, to start the stateless authorization request
 * via the API Backend.
 * 
 * @todo: encryption
 */
export async function consumeStatelessAuthorizationTicket(token: string) {

    // Generate Worker-Signed JWT
  const secretKey = new TextEncoder().encode(process.env.WORKER_HELPER_SHARED_SECRET!);
  // @todo: encrypt
  const { payload } = await jose.jwtVerify(token, secretKey, {
    issuer: "worker-service",
    audience: "api-auth-service",
    algorithms: ["HS256"], 
  });

  return payload.params as Record<string, string>;
}
