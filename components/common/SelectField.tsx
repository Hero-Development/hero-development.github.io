import { Fragment, useState } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon, SelectorIcon } from "@heroicons/react/solid";
import { Controller } from "react-hook-form";

export const SelectField = (props: any) => {
  const { options, control, label, name, optionLabelKey } = props;
  const [selectedOption, setSelectedOption] = useState(options[0]);
  return (
    <Controller
      control={control}
      name={name}
      defaultValue={options[0]}
      render={({ field, fieldState }) => (
        <Listbox
          value={field.value}
          onChange={(e) => {
            field.onChange(e);
            setSelectedOption(e);
          }}
        >
          <div className="relative mt-1">
            <span className="text-gray-700">{label}</span>
            <Listbox.Button className="relative w-full py-2 pl-3 pr-10 mt-1 text-left bg-gray-100 border-transparent rounded-md h-11 dark:bg-gray-800 focus:border-gray-500 focus:bg-white focus:ring-0 sm:text-sm">
              <span className="block truncate">
                {selectedOption[optionLabelKey]}
              </span>
              <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <SelectorIcon
                  className="w-5 h-5 text-gray-400"
                  aria-hidden="true"
                />
              </span>
            </Listbox.Button>
            <Transition
              as={Fragment}
              enter="transition-all ease-in-out duration-400"
              enterFrom="opacity-0 translate-y-12"
              enterTo="opacity-100 -translate-y-0"
              leave="transition-opacity duration-400"
              leaveFrom="opacity-100  "
              leaveTo="opacity-0 "
            >
              <Listbox.Options className="absolute z-10 w-full py-1 mt-1 overflow-auto text-base border-transparent rounded-md dark:bg-gray-800 focus:border-gray-500 focus:bg-white focus:ring-0 max-h-60 sm:text-sm">
                {options.map((option: any, Idx: any) => (
                  <Listbox.Option
                    key={Idx}
                    className={({ active }) =>
                      `${active ? "text-gray-300 " : "text-gray-500"}
                          cursor-pointer transform transition duration-300 select-none relative py-2 pl-10 pr-4`
                    }
                    value={option}
                  >
                    {({ selected, active }) => (
                      <>
                        <span
                          className={`${
                            selected
                              ? "font-medium text-red-700"
                              : "font-normal"
                          } block truncate`}
                        >
                          {option[optionLabelKey]}
                        </span>
                        {selected ? (
                          <span
                            className={`${
                              active ? "text-amber-600" : "text-amber-600"
                            }
                                absolute inset-y-0 left-0 flex items-center pl-3`}
                          >
                            <CheckIcon className="w-5 h-5" aria-hidden="true" />
                          </span>
                        ) : null}
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
            <div
              role="alert"
              aria-label={fieldState.error?.message}
              className={`text-xs font-semibold text-red-500 duration-300 ease-out transition-height ${
                fieldState.error?.message ? "h-5" : "h-0"
              }`}
            >
              {fieldState.error?.message}
            </div>
          </div>
        </Listbox>
      )}
    />
  );
};
