import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { oauthLogin } from "./oauth.service.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async (_, __, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const token = await oauthLogin({
          email,
          provider: "google",
          oauthId: profile.id,
        });

        done(null, { token });
      } catch (err) {
        done(err);
      }
    }
  )
);
