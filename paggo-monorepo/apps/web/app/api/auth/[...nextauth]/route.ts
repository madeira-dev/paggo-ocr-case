import NextAuth, { type NextAuthOptions, DefaultSession, DefaultUser, User as NextAuthUserFromPackage } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

// Augment NextAuth types
declare module 'next-auth' {
    interface Session extends DefaultSession {
        user: {
            id: string;
            // Include other properties from DefaultSession['user'] if you need them explicitly typed here
            // name, email, image are usually part of DefaultSession['user']
        } & DefaultSession['user']; // This ensures name, email, image are part of the type
        accessToken?: string; // Example if you were to add other custom properties
        error?: string;
    }

    interface User extends DefaultUser { // This User type is what 'authorize' returns and 'jwt' callback receives
        id: string;
        // Add other properties if your authorize function returns more than DefaultUser
        // e.g., name?: string | null; email?: string | null; image?: string | null;
    }
}

declare module 'next-auth/jwt' {
    /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
    interface JWT {
        id?: string; // Add id to the JWT token type
        // Add other token properties if needed
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
            async authorize(credentials, _req): Promise<NextAuthUserFromPackage | null> { // Explicit return type
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:3000';

                try {
                    const res = await fetch(`${backendUrl}/auth/validate-credentials`, {
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
                    const userFromBackend = await res.json(); // Expects { id, email, name, ... }

                    if (userFromBackend && userFromBackend.id) {
                        return { // Ensure this matches the augmented 'User' type
                            id: userFromBackend.id,
                            email: userFromBackend.email,
                            name: userFromBackend.name,
                            // image: userFromBackend.image, // if available
                        } as NextAuthUserFromPackage; // Cast to the base NextAuthUser type
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
        async jwt({ token, user }) { // 'user' is passed on initial sign-in
            if (user) {
                token.id = user.id; // user.id comes from the 'authorize' callback result
                // You can also add other user properties to the token here if needed
                // token.name = user.name;
                // token.email = user.email;
            }
            return token;
        },
        async session({ session, token }) { // With JWT strategy, 'user' (AdapterUser) is not passed here
            // The 'token' object is what we get from the 'jwt' callback
            if (session.user && token.id) {
                session.user.id = token.id;
            }
            // You can also transfer other properties from token to session.user if needed
            // if (session.user && token.name) {
            //     session.user.name = token.name as string;
            // }
            // if (session.user && token.email) {
            //     session.user.email = token.email as string;
            // }
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
// If the type error about the GET/POST handler signature returns, you might need 'as any' here
// export { handler as GET, handler as POST };
export const GET = handler as any;
export const POST = handler as any;