import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt, StrategyOptionsWithoutRequest } from 'passport-jwt';
import { env } from '@config/env.js';
import prisma from '@lib/prisma.js';

const opts: StrategyOptionsWithoutRequest = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: env.JWT_SECRET,
};

passport.use(
  new JwtStrategy(opts, async (payload, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: payload.id },
        include: {
          customerProfile: true,
          staffProfile: {
            include: {
              staffRole: {
                include: { permissions: { include: { permission: true } } },
              },
            },
          },
        },
      });
      if (!user) return done(null, false);
      return done(null, user);
    } catch (err) {
      return done(err, false);
    }
  }),
);

export default passport;
