import React from "react";
import { Tab, Transition } from "@headlessui/react";
export const AppearTransition = (props: any) => {
  return (
    <Transition
      appear={true}
      show={true}
      enter="transition-all ease-in-out duration-300"
      enterFrom="opacity-0 translate-y-10"
      enterTo="opacity-100 -translate-y-0"
      leave="transition-opacity duration-300"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      {props.children}
    </Transition>
  );
};
