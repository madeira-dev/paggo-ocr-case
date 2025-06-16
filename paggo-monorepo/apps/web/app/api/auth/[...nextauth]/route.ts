import NextAuth, { type NextAuthOptions, DefaultSession, DefaultUser, User as NextAuthUserFromPackage } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

declare module 'next-auth' {
    interface Session extends DefaultSession {
        user: {
            id: string;
        } & DefaultSession['user'];
        accessToken?: string;
        error?: string;
    }

    interface User extends DefaultUser {
        id: string;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id?: string;
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
            async authorize(credentials, _req): Promise<NextAuthUserFromPackage | null> {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }
                const backendUrlFromEnv = process.env.NEXT_PUBLIC_BACKEND_API_URL; // development (comment when commiting to github...)

                if (typeof backendUrlFromEnv !== 'string' || backendUrlFromEnv.trim() === '') {
                    throw new Error(
                        "CRITICAL: NEXT_PUBLIC_BACKEND_API_URL environment variable is not set or is empty."
                    );
                }

                const backendUrl = backendUrlFromEnv.replace(/\/$/, "");

                try {
                    const res = await fetch(`${backendUrl}/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: credentials.email,
                            password: credentials.password,
                        }),
                    });

                    if (!res.ok) {
                        return null;
                    }
                    const userFromBackend = await res.json();

                    if (userFromBackend && userFromBackend.id) {
                        return {
                            id: userFromBackend.id,
                            email: userFromBackend.email,
                            name: userFromBackend.name,
                        } as NextAuthUserFromPackage;
                    }
                    return null;
                } catch (error) {
                    console.error("Error in authorize fetching backend:", error);
                    return null;
                }
            },
        }),
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user && token.id) {
                session.user.id = token.id;
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