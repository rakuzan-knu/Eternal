/** Only server-recorded uploads are eligible for cleanup; overlay URLs may be external. */
export function storyMediaAssets(story: { mediaUrl: string; mediaAssets?: unknown }): string[] {
  return [
    ...new Set([
      story.mediaUrl,
      ...(Array.isArray(story.mediaAssets)
        ? story.mediaAssets.filter((url): url is string => typeof url === 'string')
        : []),
    ]),
  ].filter((url) => url && !url.startsWith('color:') && !url.startsWith('data:'));
}
