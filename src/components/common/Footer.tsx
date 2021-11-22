import GitHubButton from 'react-github-btn';

export const Footer = () => {
  // const { theme, setTheme } = useTheme();
  return (
    <div className="mt-16 flex  justify-between border-t py-4 items-center">
      <div className="text-center">
        <p className="tracking-tighter text-2xl">
          <span className="text-red-600">Contract </span>Driver
        </p>

        <div className="flex justify-between mx-3">
          <GitHubButton
            href="https://github.com/Hero-Development/hero-development.github.io"
            data-icon="octicon-star"
            data-show-count="true"
            aria-label="Star Hero-Development/hero-development.github.io on GitHub"
          >
            Star
          </GitHubButton>

          <GitHubButton
            href="https://github.com/Hero-Development/hero-development.github.io/fork"
            data-icon="octicon-repo-forked"
            data-show-count="true"
            aria-label="Fork Hero-Development/hero-development.github.io on GitHub"
          >
            Fork
          </GitHubButton>
        </div>
      </div>
      <div className="flex flex-col">
        <p className="mt-2 mb-1 text-xs leading-none text-gray-900 dark:text-gray-50">
          Developed by
        </p>

        <a href="https://twitter.com/wolverine_sk" className="text-blue-500 text-xs">
          @wolverine_sk
        </a>
        <a href="https://twitter.com/squeebo_nft" className="text-blue-500 text-xs">
          @squeebo_nft
        </a>
      </div>
    </div>
  );
};
