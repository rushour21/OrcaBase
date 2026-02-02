import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import { oauthLogin } from "./oauth.service.js";

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: "/auth/github/callback",
      scope: ["user:email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let email = profile.emails?.[0]?.value;

        // 🔴 GitHub often hides email → fetch manually
        if (!email) {
          const res = await fetch("https://api.github.com/user/emails", {
            headers: {
              Authorization: `token ${accessToken}`,
              Accept: "application/vnd.github+json",
            },
          });

          const emails = await res.json();

          const primaryEmail = emails.find(
            (e) => e.primary && e.verified
          );

          email = primaryEmail?.email;
        }

        if (!email) {
          return done(new Error("No verified GitHub email found"));
        }

        const token = await oauthLogin({
          email,
          provider: "github",
          oauthId: profile.id,
        });

        done(null, { token });
      } catch (err) {
        done(err);
      }
    }
  )
);
