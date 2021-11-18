// import clsx from 'clsx';
import { FieldError, UseFormRegisterReturn } from 'react-hook-form';
type InputFieldProps = {
  type?: 'text' | 'email' | 'password';
  className?: string;
  registration: Partial<UseFormRegisterReturn>;
  label?: string;
  containerClassName?: string;
  placeholder?: string;
  error?: FieldError | undefined;
};

export const InputField = (props: InputFieldProps) => {
  const { type = 'text', label, placeholder, registration, error } = props;

  return (
    <label className="block">
      <span className="text-gray-700">{label}</span>
      <input
        type={type}
        className="block w-full mt-1 bg-gray-100 border-transparent rounded-md dark:bg-gray-800 focus:border-gray-500 focus:bg-white focus:ring-0"
        placeholder={placeholder}
        {...registration}
      />
      <div
        role="alert"
        aria-label={error?.message}
        className={`text-xs font-semibold text-red-500 duration-300 ease-out transition-height ${
          error?.message ? 'h-5' : 'h-0'
        }`}
      >
        {error?.message}
      </div>
    </label>
  );
};
