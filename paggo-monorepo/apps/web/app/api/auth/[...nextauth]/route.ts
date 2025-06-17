import NextAuth, { type NextAuthOptions, DefaultSession, DefaultUser, User as NextAuthUserFromPackage } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
    interface Session {
        accessToken?: string;
        user: {
            id: string;
        } & DefaultSession['user'];
        error?: string;
    }

    interface User extends DefaultUser {
        id: string;
        accessToken?: string;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id?: string;
        accessToken?: string;
    }
}


const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email', placeholder: 'john.doe@example.com' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials, _req): Promise<(NextAuthUserFromPackage & { accessToken?: string }) | null> {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }
                const backendUrlFromEnv = process.env.NEXT_PUBLIC_BACKEND_URL;

                if (typeof backendUrlFromEnv !== 'string' || backendUrlFromEnv.trim() === '') {
                    throw new Error(
                        "CRITICAL: NEXT_PUBLIC_BACKEND_API_URL environment variable is not set or is empty."
                    );
                }

                const backendUrl = backendUrlFromEnv.replace(/\/$/, "");

                try {
                    console.log(`[NextAuth Authorize] Calling backend: ${backendUrl}/auth/login`);
                    const res = await fetch(`${backendUrl}/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: credentials.email,
                            password: credentials.password,
                        }),
                    });

                    if (!res.ok) {
                        const errorBody = await res.json().catch(() => ({ message: 'Backend login failed' }));
                        console.error(`[NextAuth Authorize] Backend login failed (${res.status}):`, errorBody.message);
                        return null;
                    }
                    const backendResponse = await res.json();

                    if (backendResponse && backendResponse.user && backendResponse.accessToken) {
                        return {
                            id: backendResponse.user.id,
                            email: backendResponse.user.email,
                            name: backendResponse.user.name,
                            accessToken: backendResponse.accessToken,
                        };
                    }
                    console.warn('[NextAuth Authorize] Backend response missing user or accessToken.');
                    return null;
                } catch (error) {
                    console.error("[NextAuth Authorize] Error fetching backend:", error);
                    return null;
                }
            },
        }),
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async jwt({ token, user, account }) {
            if (account && user) {
                const userWithToken = user as (NextAuthUserFromPackage & { accessToken?: string });
                token.accessToken = userWithToken.accessToken;
                token.id = userWithToken.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (token.accessToken) {
                session.accessToken = token.accessToken as string;
            }
            if (token.id) {
                session.user.id = token.id as string;
            }
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: '/',
    },
    debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);
export const GET = handler as any;
export const POST = handler as any;