// App.tsx
import React, { useEffect } from "react";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: "465512580871-a2kpcq6reb6hcp52qt8irrpfd2bh7rii.apps.googleusercontent.com",
      offlineAccess: true, // allows refreshToken
      forceCodeForRefreshToken: true,
      scopes: ["profile", "email"],
    });
  }, []);

  return <RootNavigator />;
}
