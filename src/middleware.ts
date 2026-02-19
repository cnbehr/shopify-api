import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  // Only protect alerts page - everything else is public
  matcher: ['/alerts/:path*'],
};
