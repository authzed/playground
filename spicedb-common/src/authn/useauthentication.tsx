import { useAuth0 } from "@auth0/auth0-react";
import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Auth0Config, AuthnConfigContext, OIDCConfig } from "./provider";
import { UserProps } from "./user";

/**
 * AuthenticationService defines the interface for any authentication services used in the frontend.
 */
export interface AuthenticationService {
    /**
     * user is the current user or undefined if none.
     */
    user: UserProps | undefined

    /**
     * isLoading indicates whether the current user is loading.
     */
    isLoading: boolean

    /**
     * login performs the login operation, *including the redirect*
     */
    login: () => void

    /**
     * loginWithPopup performs login withn popup, if applicable.
     */
    loginWithPopup: () => void

    /**
     * logout performs the logout operation, *including the redirect*
     */
    logout: () => void

    /**
     * getAuthToken returns the token for the current user (if any) to be sent to API calls.
     */
    getAuthToken: () => Promise<string | undefined>
}

/**
 * useAuthentication returns an AuthenticationService. Note that this hook can *ONLY* be used under
 * an AuthnProvider in context.
 */
export function useAuthentication(): AuthenticationService {
    let authnConfig = undefined;
    try {
        authnConfig = useContext(AuthnConfigContext);
    } catch (e) {
        // NOTE: in testing, useContext will fail.
    }

    if (!authnConfig) {
        return {
            user: undefined,
            isLoading: true,
            login: () => undefined,
            loginWithPopup: () => undefined,
            logout: () => undefined,
            getAuthToken: async () => undefined,
        }
    }

    switch (authnConfig.authentication) {
        case 'auth0':
            return useAuth0Service(authnConfig.auth0);

        case 'oidc':
            return useOIDCService(authnConfig.oidc);

        default:
            return useNoAuthService();
    }
}

/**
 * OIDCStateContext holds the state in context for the OIDC provider.
 */
const OIDCStateContext = createContext<OIDCState | undefined>(undefined);

interface OIDCState {
    called: boolean
    loading: boolean
    error: string | undefined
    currentUser: UserProps | undefined
}

/**
 * OIDCProvider is the authentication provider implementation for OIDC. Should be instantiated
 * by AuthnProvider.
 */
export function OIDCProvider(props: PropsWithChildren<{ config: OIDCConfig }>) {
    const [currentState, setCurrentState] = useState<OIDCState>({
        called: false,
        loading: true,
        error: undefined,
        currentUser: undefined,
    });

    if (props.config.urlPrefix.endsWith('/')) {
        throw Error('OIDC URL prefix must be without an ending slash')
    }

    useEffect(() => {
        if (props.config.urlPrefix && !currentState.called) {
            setCurrentState({
                called: true,
                loading: true,
                error: undefined,
                currentUser: undefined,
            });

            (async () => {
                const result = await fetch(`${props.config.urlPrefix}/userinfo`);
                if (result.status === 403) {
                    setCurrentState({
                        called: true,
                        loading: false,
                        error: undefined,
                        currentUser: undefined,
                    })
                    return
                }

                if (result.status / 100 == 5) {
                    setCurrentState({
                        called: true,
                        loading: false,
                        error: await result.text(),
                        currentUser: undefined,
                    })
                    return
                }

                setCurrentState({
                    called: true,
                    loading: false,
                    error: undefined,
                    currentUser: await result.json(),
                })
            })();
        }
    }, [props.config, currentState]);

    return <OIDCStateContext.Provider value={currentState}>
        {props.children}
    </OIDCStateContext.Provider>;
}

function useOIDCService(oidc: OIDCConfig): AuthenticationService {
    const currentState = useContext(OIDCStateContext);
    const login = useCallback(() => {
        if (!currentState || currentState.error || currentState.loading) {
            return
        }

        window.location.assign(`${oidc.urlPrefix}/login`);
    }, [currentState]);

    const logout = useCallback(() => {
        window.location.assign(`${oidc.urlPrefix}/logout`);
    }, []);

    const service = useMemo(() => {
        return {
            user: currentState?.currentUser,
            isLoading: currentState === undefined || currentState.loading || !currentState.called,
            login: login,
            loginWithPopup: login,
            logout: logout,
            getAuthToken: async () => undefined,
        };
    }, [currentState, login, logout]);

    return service;
}

function useAuth0Service(auth0: Auth0Config): AuthenticationService {
    const { isLoading, user, logout, getIdTokenClaims, getAccessTokenSilently, loginWithPopup, loginWithRedirect } = useAuth0();
    const getIDTokenSilently = async () => {
        const claims = await getIdTokenClaims();
        return claims?.__raw;
    };

    // Call getAccessTokenSilently to force a load of the current user, if available.
    useEffect(() => {
        if (auth0.clientID && !isLoading && !user) {
            (async () => {
                try {
                    await getAccessTokenSilently();
                } catch (e) {
                    // Ignore.
                }
            })();
        }
    }, [isLoading, user, getAccessTokenSilently, auth0]);

    return {
        user: user ? {
            id: user.sub!,
            username: user.name || user.email || user.nickname || '(unknown)',
            fullName: user.name || user.nickname,
            avatarUrl: user.picture,
            emailAddress: user.email_verified ? user.email : null,
        } : undefined,
        isLoading: isLoading,
        loginWithPopup: loginWithPopup,
        login: loginWithRedirect,
        logout: () => {
            logout({ returnTo: auth0.logoutRedirectURL })
        },
        getAuthToken: getIDTokenSilently,
    }
}

function useNoAuthService(): AuthenticationService {
    return {
        user: undefined,
        isLoading: false,
        loginWithPopup: () => {
            throw Error('Login disabled')
        },
        login: () => {
            throw Error('Login disabled')
        },
        logout: () => {
        },
        getAuthToken: async () => undefined,
    }
}