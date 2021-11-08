// import clsx from 'clsx';
import { UseFormRegisterReturn } from "react-hook-form";
import { FieldError } from "react-hook-form";
type TextFieldProps = {
  type?: "text" | "email" | "password";
  className?: string;
  registration: Partial<UseFormRegisterReturn>;
  label?: string;
  placeholder?: string;
  error?: FieldError | undefined;
};

export const TextField = (props: TextFieldProps) => {
  const { type = "text", label, placeholder, registration, error } = props;

  return (
    <label className="block">
      <span className="text-gray-700">{label}</span>
      <textarea
        spellCheck={false}
        className="block w-full mt-1 text-xs bg-gray-100 border-transparent rounded-md dark:bg-gray-800 scrollbar-hide focus:border-gray-500 focus:bg-white focus:ring-0"
        rows={4}
        {...registration}
      ></textarea>
      <div
        role="alert"
        aria-label={error?.message}
        className={`text-xs font-semibold text-red-500 duration-300 ease-out transition-height ${
          error?.message ? "h-5" : "h-0"
        }`}
      >
        {error?.message}
      </div>
    </label>
  );
};
