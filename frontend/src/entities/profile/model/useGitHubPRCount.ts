import { useQuery } from '@tanstack/react-query';

interface GitHubPullRequest {
  merged_at?: string | null;
  user?: {
    login?: string;
  };
}

export function useGitHubPRCount(githubUsername?: string) {
  return useQuery({
    queryKey: ['github-prs', githubUsername],
    queryFn: async () => {
      try {
        const res = await fetch(
          'https://api.github.com/repos/rakuzan-knu/social-network/pulls?state=closed&per_page=100',
        );
        if (!res.ok) return 0;
        const data = (await res.json()) as GitHubPullRequest[];
        if (!Array.isArray(data)) return 0;

        const mergedPRs = data.filter((pr: GitHubPullRequest) => pr.merged_at !== null);

        if (!githubUsername) {
          return 0;
        }

        return mergedPRs.filter(
          (pr: GitHubPullRequest) => pr.user?.login?.toLowerCase() === githubUsername.toLowerCase(),
        ).length;
      } catch {
        return 0;
      }
    },
    staleTime: 1000 * 60 * 10,
  });
}
