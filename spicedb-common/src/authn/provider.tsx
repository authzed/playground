import React, { PropsWithChildren, useEffect } from 'react';
import { OIDCProvider, useAuthentication } from './useauthentication';

/**
 * OIDCConfig is the configuration for OIDC authentication.
 */
export interface OIDCConfig {
  /**
   * urlPrefix is the prefix for all OIDC urls.
   */
  urlPrefix: string;
}

/**
 * AuthnConfig is the generic application configuration for the authentication provider.
 */
export type AuthnConfig =
  | {
      authentication: 'oidc';
      oidc: OIDCConfig;
    }
  | {
      authentication: 'none';
    };

export type AllowedAuthenticationTypes = 'oidc' | 'none';

const AUTHN_ENGINES = ['oidc', 'none'];

/**
 * AuthnProvider is a provider which injects the correct Authentication service provider into
 * the current context.
 */
export function AuthnProvider(
  props: PropsWithChildren<{ config: AuthnConfig }>
) {
  if (!props.config.authentication) {
    throw Error('Missing authentication configuration');
  }

  if (!AUTHN_ENGINES.includes(props.config.authentication)) {
    throw Error(
      `Invalid authentication engine configured: ${props.config.authentication}`
    );
  }

  return (
    <AuthnConfigContext.Provider value={props.config}>
      {props.config.authentication === 'oidc' && (
        <OIDCProvider config={props.config.oidc}>{props.children}</OIDCProvider>
      )}
      {props.config.authentication === 'none' && <>{props.children}</>}
    </AuthnConfigContext.Provider>
  );
}

export const AuthnConfigContext = React.createContext<AuthnConfig | undefined>(
  undefined
);

/**
 * AuthenticationRequired is a wrapping component which will only render its children if the user
 * is authenticated. Otherwise, the loadingView will be displayed and the user will be redirected
 * to login.
 */
export function AuthenticationRequired(
  props: PropsWithChildren<{ loadingView: () => JSX.Element }>
) {
  const { user, isLoading, login } = useAuthentication();
  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user) {
      login();
    }
  }, [isLoading, user, login]);

  return (
    <div>
      {isLoading && props.loadingView()}
      {user !== undefined && props.children}
    </div>
  );
}
