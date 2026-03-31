import { DiscordSDK } from "@discord/embedded-app-sdk";

let discordSdk = null;

export async function setupDiscordSdk() {
  if (!discordSdk) {
    discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);
  }
  
  // Add a 20s heartbeat timeout to avoid hanging in non-Discord browsers
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("SDK Ready Timeout")), 20000));
  await Promise.race([discordSdk.ready(), timeout]).catch(err => {
    console.warn("[Discord SDK] Ready failed or timed out:", err.message);
  });

  try {
    // 1. Authorize with the requested scopes
    const { code } = await discordSdk.commands.authorize({
      client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
      response_type: "code",
      state: "",
      scope: ["identify", "rpc.activities.write"],
    });

    // 2. Exchange the code for an access token via our BACKEND
    const response = await fetch(`${window.location.origin}/api/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    
    if (!response.ok) throw new Error("Backend token exchange failed");
    
    const { access_token } = await response.json();

    // 3. Authenticate with the obtained access token
    const auth = await discordSdk.commands.authenticate({ access_token });
    return { sdk: discordSdk, auth };
  } catch (err) {
    const msg = err.message || JSON.stringify(err);
    console.warn("[Discord SDK] Full Auth skipped/failed:", msg);
    // Be very aggressive with the alert
    alert("CRITICAL AUTH ERROR: " + msg);
  }

  return { sdk: discordSdk, auth: null };
}

export default discordSdk;
