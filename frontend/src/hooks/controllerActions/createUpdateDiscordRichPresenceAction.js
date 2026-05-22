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
          name: "AH Music",
          type: 0,
          details: "In Music Lobby",
          state: "Searching for Nodes...",
          assets: {
            large_image: "https://i.imgur.com/8Q8W8Xn.png",
            large_text: "Aether // Studio"
          }
        }
      });
      return;
    }
    await discordSdkRef.current.commands.setActivity({
      activity: {
        name: "AH Music",
        type: 2,
        details: track.title.slice(0, 127),
        state: `by ${track.author}`.slice(0, 127),
        assets: {
          large_image: track.thumbnail || "https://cdn.discordapp.com/embed/avatars/0.png",
          large_text: `NOVA // Q: ${queue.length}`.slice(0, 127)
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
