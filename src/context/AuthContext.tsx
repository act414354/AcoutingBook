import React, { createContext, useContext, useEffect, useState } from 'react';
import { initGoogleClient, signIn, signOut } from '../services/drive';

interface AuthContextType {
    isAuthenticated: boolean;
    user: gapi.auth2.GoogleUser | null;
    loading: boolean;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<gapi.auth2.GoogleUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            try {
                await initGoogleClient();
                const authInstance = gapi.auth2.getAuthInstance();

                // Listen for sign-in state changes.
                authInstance.isSignedIn.listen(updateSigninStatus);

                // Handle the initial sign-in state.
                updateSigninStatus(authInstance.isSignedIn.get());
            } catch (err: any) {
                console.error("Error initializing Google Client", err);
                setError(err.message || "Failed to initialize Google Client");
            } finally {
                setLoading(false);
            }
        };

        init();
    }, []);

    const updateSigninStatus = (isSignedIn: boolean) => {
        setIsAuthenticated(isSignedIn);
        if (isSignedIn) {
            const authInstance = gapi.auth2.getAuthInstance();
            setUser(authInstance.currentUser.get());
        } else {
            setUser(null);
        }
    };

    const login = async () => {
        try {
            await signIn();
        } catch (err: any) {
            console.error("Login failed", err);
            setError("Login failed");
        }
    };

    const logout = async () => {
        try {
            await signOut();
        } catch (err: any) {
            console.error("Logout failed", err);
            setError("Logout failed");
        }
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, loading, login, logout, error }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
