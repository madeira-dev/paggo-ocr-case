import NextAuth, { NextAuthOptions, User as NextAuthUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { NextRequest } from 'next/server';
import { AsyncLocalStorage } from 'async_hooks'; // Import AsyncLocalStorage

// Create an AsyncLocalStorage instance to store the NestJS Set-Cookie string
const als = new AsyncLocalStorage<{ nestSetCookie?: string | null }>();

const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "jsmith@example.com" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials, _req) {
                if (!credentials?.email || !credentials?.password) {
                    console.error('[NextAuth Authorize] Email and password are required');
                    throw new Error("Email and password are required");
                }

                const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
                console.log('[NextAuth Authorize] Calling backend for login:', `${backendUrl}/auth/login`);

                try {
                    const nestJsResponse = await fetch(`${backendUrl}/auth/login`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            email: credentials.email,
                            password: credentials.password,
                        }),
                    });

                    if (!nestJsResponse.ok) {
                        const errorText = await nestJsResponse.text().catch(() => "Unknown error from backend login");
                        console.error('[NextAuth Authorize] Backend login call failed:', nestJsResponse.status, errorText);
                        return null;
                    }

                    // Capture the Set-Cookie header from NestJS
                    const setCookieHeader = nestJsResponse.headers.get('Set-Cookie');
                    if (setCookieHeader) {
                        const store = als.getStore(); // Get the current ALS store
                        if (store) {
                            store.nestSetCookie = setCookieHeader; // Stash the cookie string
                            console.log('[NextAuth Authorize] Stashed NestJS Set-Cookie via ALS:', setCookieHeader);
                        } else {
                            // This should not happen if als.run() is used correctly in the handler
                            console.warn('[NextAuth Authorize] AsyncLocalStorage store not found. Cannot stash Set-Cookie.');
                        }
                    } else {
                        console.warn('[NextAuth Authorize] No Set-Cookie header received from NestJS backend.');
                    }

                    const userFromBackend = await nestJsResponse.json();
                    console.log('[NextAuth Authorize] User from backend /auth/login:', userFromBackend);

                    if (userFromBackend && userFromBackend.id) {
                        return {
                            id: userFromBackend.id,
                            email: userFromBackend.email,
                            name: userFromBackend.name,
                            // Ensure no temporary properties are returned on the final user object for NextAuth
                        } as NextAuthUser;
                    } else {
                        console.error('[NextAuth Authorize] User object from backend is invalid or missing id.');
                        return null;
                    }
                } catch (error) {
                    console.error("[NextAuth Authorize] Error in authorize function calling backend /auth/login:", error);
                    return null;
                }
            },
        }),
    ],
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: '/', // Your login page
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) { // user is the object returned by authorize
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id as string;
            }
            return session;
        },
    },
};

const baseNextAuthHandler = NextAuth(authOptions);

// Custom handler function to wrap NextAuth and manage ALS context
async function customAuthHandler(req: NextRequest, context: { params: { nextauth: string[] } }) {
    // Initialize the ALS store for this request
    const store = { nestSetCookie: null };

    // Run the base NextAuth handler within the ALS context
    return als.run(store, async () => {
        const response: Response = await baseNextAuthHandler(req as any, context as any);

        // After baseNextAuthHandler (and thus authorize) has run, check if a cookie was stashed
        if (store.nestSetCookie && response.ok) {
            console.log('[NextAuth Custom Handler] Retrieved NestJS Set-Cookie from ALS:', store.nestSetCookie);

            // Clone the response to modify its headers
            const newHeaders = new Headers(response.headers);
            // Append the NestJS Set-Cookie header.
            // The browser will handle parsing this string.
            // This ensures NextAuth's own Set-Cookie headers are preserved.
            newHeaders.append('Set-Cookie', store.nestSetCookie);

            console.log('[NextAuth Custom Handler] Appending Set-Cookie to response.');
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: newHeaders,
            });
        }
        return response;
    });
}

// Export the custom handler for GET and POST requests
export { customAuthHandler as GET, customAuthHandler as POST };