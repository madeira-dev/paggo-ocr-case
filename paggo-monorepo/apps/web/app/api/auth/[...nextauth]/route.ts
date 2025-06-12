import NextAuth, { NextAuthOptions, User as NextAuthUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "jsmith@example.com" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials, req) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Email and password are required");
                }

                const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:3000';

                try {
                    const res = await fetch(`${backendUrl}/auth/validate-credentials`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            email: credentials.email,
                            password: credentials.password,
                        }),
                    });

                    if (!res.ok) {
                        return null; // Indicates failed authentication
                    }

                    const user = await res.json();

                    if (user) {
                        return {
                            id: user.id,
                            email: user.email,
                            name: user.name,
                        } as NextAuthUser; // Cast to NextAuthUser
                    } else {
                        return null; // Indicates failed authentication
                    }
                } catch (error) {
                    console.error("Error in authorize function calling backend:", error);
                    return null; // Network error or other issue
                }
            },
        }),
    ],
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: '/',
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) { // user is only passed on initial sign in
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id as string; // Add id to session user
            }
            return session;
        },
    },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };