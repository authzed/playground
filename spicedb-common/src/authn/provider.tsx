import { Auth0Provider } from "@auth0/auth0-react";
import React, { PropsWithChildren, useEffect } from "react";
import { OIDCProvider, useAuthentication } from "./useauthentication";

/**
 * Configuration for Auth0 for login.
 */
export interface Auth0Config {
    /**
     * domain is the Auth0 domain representing the tenant.
     */
    domain: string

    /**
     * clientID is the client ID to use for login.
     */
    clientID: string

    /**
     * logoutRedirectURL is the URL to which Auth0 will redirect after logout.
     */
    logoutRedirectURL: string

    /**
     * useLocalStorageCache indicates whether local storage cache for Auth0
     * tokens should be used. For production, this should be false unless
     * significant thought is given to the security implications.
     */
    useLocalStorageCache: boolean

    /**
     * connection, if specified, indicates the *single* Auth0 connection to use
     * when performing login flow. If a single connection is used, Auth0 can
     * directly redirect to that auth provider, instead of showing a Login screen.
     *
     * @note If set, only this single identity provider can be used to login.
     * @see https://auth0.com/docs/identityproviders
     */
    connection: string | undefined
}

/**
 * OIDCConfig is the configuration for OIDC authentication.
 */
export interface OIDCConfig {
    /**
     * urlPrefix is the prefix for all OIDC urls.
     */
    urlPrefix: string
}

/**
 * AuthnConfig is the generic application configuration for the authentication provider.
 */
export type AuthnConfig = {
    authentication: 'auth0'
    auth0: Auth0Config
} | {
    authentication: 'oidc'
    oidc: OIDCConfig
} | {
    authentication: 'none'
}

export type AllowedAuthenticationTypes = 'auth0' | 'oidc' | 'none'

const AUTHN_ENGINES = ['auth0', 'oidc', 'none'];

/**
 * AuthnProvider is a provider which injects the correct Authentication service provider into
 * the current context.
 */
export function AuthnProvider(props: PropsWithChildren<{ config: AuthnConfig }>) {
    if (!props.config.authentication) {
        throw Error('Missing authentication configuration')
    }

    if (!AUTHN_ENGINES.includes(props.config.authentication)) {
        throw Error(`Invalid authentication engine configured: ${props.config.authentication}`)
    }

    return <AuthnConfigContext.Provider value={props.config}>
        {props.config.authentication === 'auth0' && <Auth0Provider
            domain={props.config.auth0.domain}
            clientId={props.config.auth0.clientID}
            redirectUri={`${window.location.origin}${process.env.PUBLIC_URL}/`}
            connection={props.config.auth0.connection || undefined}
            cacheLocation={props.config.auth0.useLocalStorageCache ? "localstorage" : "memory"}
        >
            {props.children}
        </Auth0Provider>}
        {props.config.authentication === 'oidc' && <OIDCProvider config={props.config.oidc}>
            {props.children}
        </OIDCProvider>}
        {props.config.authentication === 'none' && <>
            {props.children}
        </>}
    </AuthnConfigContext.Provider>
}

export const AuthnConfigContext = React.createContext<AuthnConfig | undefined>(undefined);

/**
 * AuthenticationRequired is a wrapping component which will only render its children if the user
 * is authenticated. Otherwise, the loadingView will be displayed and the user will be redirected
 * to login.
 */
export function AuthenticationRequired(props: PropsWithChildren<{ loadingView: () => JSX.Element }>) {
    const { user, isLoading, login } = useAuthentication();
    useEffect(() => {
        if (isLoading) {
            return;
        }

        if (!user) {
            login();
        }
    }, [isLoading, user, login]);

    return <div>
        {isLoading && props.loadingView()}
        {user !== undefined && props.children}
    </div>;
}
