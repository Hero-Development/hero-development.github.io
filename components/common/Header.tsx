import React from "react";
import Head from "next/head";
import { useTheme } from "next-themes";
import { MenuIcon } from "@heroicons/react/solid";

export const Header = () => {
  const [navbarOpen, setNavbarOpen] = React.useState(false);
  const { theme, setTheme } = useTheme();
  return (
    <>
      <Head>
        <title>Contract-Utility</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <nav className="relative flex flex-wrap items-center justify-between px-2 py-3 mb-3 bg-red-500">
        <div className="container flex flex-wrap items-center justify-between px-4 mx-auto">
          <div className="relative flex justify-between w-full lg:w-auto lg:static lg:block lg:justify-start">
            <a
              className="inline-block py-2 mr-4 text-base font-bold leading-relaxed text-white uppercase whitespace-nowrap"
              href="#pablo"
            >
              Contract-Utility
            </a>
            <button
              className="block px-3 py-1 text-xl leading-none text-white bg-transparent border border-transparent border-solid rounded outline-none cursor-pointer lg:hidden focus:outline-none"
              type="button"
              onClick={() => setNavbarOpen(!navbarOpen)}
            >
              <MenuIcon className="w-7 h-7" aria-hidden="true" />
            </button>
          </div>
          <div
            className={
              "lg:flex flex-grow items-center" +
              (navbarOpen ? " flex" : "  hidden")
            }
            id="example-navbar-danger"
          >
            <ul className="flex flex-col list-none lg:flex-row lg:ml-auto">
              <li>
                <a
                  className="flex items-center px-3 py-2 text-xs font-bold leading-snug text-white uppercase hover:opacity-75"
                  href="#pablo"
                >
                  <span className="ml-2">Help</span>
                </a>
              </li>
              <li>
                <a
                  className="flex items-center px-3 py-2 text-xs font-bold leading-snug text-white uppercase cursor-pointer hover:opacity-75"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  <span className="ml-2">
                    {theme === "dark" ? "light" : "dark"}
                  </span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </>
  );
};
