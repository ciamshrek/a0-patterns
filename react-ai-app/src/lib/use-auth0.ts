"use const";
import {
  Auth0Context,
  Auth0ContextInterface,
  useAuth0 as useAuth0Core,
  User,
} from "@auth0/auth0-react";
import { useCallback } from "react";

/**
 * CIAMShrek's helper function for useAuth0, this only adds 1 fetch. This fetch
 * is automatically tied to getToken, so when you actually invoke the AT will be
 * automatically added.
 *
 * @param context
 * @returns
 */
export function useAuth0<TUser extends User = User>(
  context = Auth0Context
): Auth0ContextInterface<TUser> & { fetch: typeof fetch, getIdToken: () => Promise<string> } {
  const rest = useAuth0Core<TUser>(context);

  const customFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const token = await rest.getAccessTokenSilently();
      return fetch(input, {
        ...init,
        headers: {
          ...init?.headers,
          Authorization: `Bearer ${token}`,
        },
      });
    },
    [rest]
  );

  return { ...rest, fetch: customFetch, async getIdToken() {
    const claims = await rest.getIdTokenClaims();
    if (!claims) {
        throw new Error("no_id_token");
    }
    return claims?.__raw;
  }};
}
