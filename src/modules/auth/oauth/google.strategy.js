import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { oauthLogin } from "./oauth.service.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (_, __, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        if (!email) {
          return done(new Error("No Google email found"));
        }

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

