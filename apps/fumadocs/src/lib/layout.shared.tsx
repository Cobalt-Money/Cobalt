import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export const gitConfig = {
  branch: "main",
  repo: "cobalt-v2",
  user: "Sriketk",
};

export function baseOptions(): BaseLayoutProps {
  return {
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
    nav: {
      title: "Cobalt Docs",
    },
  };
}
