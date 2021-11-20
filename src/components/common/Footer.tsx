export const Footer = () => {
  // const { theme, setTheme } = useTheme();
  return (
    <div className="mt-16 flex flex-col justify-center items-center">
      <a>
        <p className="tracking-tighter text-2xl">
          <span className="text-red-600">Contract </span>Driver
        </p>
      </a>

      <p className="mt-2 mb-1 text-xs lg:text-sm leading-none text-gray-900 dark:text-gray-50">
        Developed by
      </p>

      <a href="https://twitter.com/wolverine_sk" className="text-blue-500 text-xs">
        @wolverine_sk
      </a>
      <a href="https://twitter.com/squeebo_nft" className="text-blue-500 text-xs">
        @squeebo_nft
      </a>
    </div>
  );
};
