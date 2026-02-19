import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Optional: restrict to specific domains
      // const allowedDomains = ['yourcompany.com'];
      // const email = user.email || '';
      // return allowedDomains.some(domain => email.endsWith(`@${domain}`));
      return true;
    },
    async session({ session, token }) {
      return session;
    },
  },
};
