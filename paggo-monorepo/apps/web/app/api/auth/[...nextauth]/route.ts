import NextAuth, { type NextAuthOptions, DefaultSession, DefaultUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
// WARNING: This path to Prisma Client is likely to cause issues on Vercel if apps/web is the deployment root.
import { PrismaClient, User as PrismaUser } from '../../../../../backend/generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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

const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email', placeholder: 'john.doe@example.com' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials, _req) {
                if (!credentials?.email || !credentials?.password) {
                    // console.log('Authorize: Missing email or password');
                    return null;
                }
                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                });
                if (!user || !user.password) {
                    return null;
                }
                const isValidPassword = await bcrypt.compare(credentials.password, user.password);
                if (!isValidPassword) {
                    return null;
                }
                const { password, ...userWithoutPassword } = user;
                return userWithoutPassword as any; // PrismaUser to NextAuth User
            },
        }),
    ],
    session: {
        strategy: 'database', // This is different from the working version
        maxAge: 30 * 24 * 60 * 60,
        updateAge: 24 * 60 * 60,
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token, user: adapterUser }) {
            if (token?.id) {
                session.user.id = token.id as string;
            } else if (adapterUser?.id) {
                session.user.id = adapterUser.id;
            }
            if (adapterUser) {
                if (adapterUser.name) session.user.name = adapterUser.name;
                if (adapterUser.email) session.user.email = adapterUser.email;
                if (adapterUser.image) session.user.image = adapterUser.image;
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

// Apply 'as any' to the handler for export if type issues persist with PrismaAdapter
export const GET = handler as any;
export const POST = handler as any;