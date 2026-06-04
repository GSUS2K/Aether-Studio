/* eslint-disable react-hooks/preserve-manual-memoization */
export function createUpdateDiscordRichPresenceAction(props) {
  const {
    discordSdkRef, queue
  } = props;
  return async (track, playbackMs = 0) => {
  if (!discordSdkRef.current) return;
  try {
    if (!track) {
      await discordSdkRef.current.commands.setActivity({
        activity: {
          name: "Aether",
          type: 0,
          details: "Currently in Aether",
          state: "Music Lobby",
          assets: {
            large_image: "https://i.imgur.com/8Q8W8Xn.png",
            large_text: "Aether Music Lobby"
          }
        }
      });
      return;
    }
    await discordSdkRef.current.commands.setActivity({
      activity: {
        name: "Aether",
        type: 2,
        details: String(track.title || "Untitled track").slice(0, 127),
        state: String(track.author || "Unknown artist").slice(0, 127),
        assets: {
          large_image: track.thumbnail || "https://cdn.discordapp.com/embed/avatars/0.png",
          large_text: String(track.author || track.title || "Aether").slice(0, 127)
        },
        timestamps: {
          start: Date.now() - playbackMs
        }
      }
    });
  } catch (err) {
    console.warn("[Discord SDK] setActivity failed:", err.message);
  }
};
}
