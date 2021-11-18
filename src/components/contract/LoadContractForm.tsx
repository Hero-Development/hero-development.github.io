import React from 'react';
import { useDropzone } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { InputField } from '@/components/common/InputField';
import { SelectField } from '@/components/common/SelectField';
import { TextField } from '@/components/common/TextField';
import { AppearTransition } from '@/components/common/AppearTransition';
import { COMMON_CHAINS } from '@/lib/constants';

export const LoadContractForm = (props: any) => {
  const onDrop = React.useCallback((acceptedFiles) => {}, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: 'application/json',
  });

  const schema = z.object({
    chain: z.any(),
    address: z.string().nonempty({ message: 'Required' }),
    abi: z.string().nonempty({ message: 'Required' }),
  });

  const { register, handleSubmit, formState, control } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: any) => {
    console.log('LOAD CONTRACT FORM DATA', data);
    const values = { ...data, abi: JSON.parse(data.abi) };
    props.onSubmit(values);
  };

  return (
    <AppearTransition>
      <div className="p-6 ">
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:gap-6">
          <SelectField
            label="Chain"
            name="chain"
            optionLabelKey="name"
            options={COMMON_CHAINS}
            control={control}
          />

          <InputField
            type="text"
            label="Contract Address"
            error={formState.errors['address']}
            registration={register('address')}
          />
          <TextField
            type="text"
            label="ABI/artifact"
            error={formState.errors['abi']}
            registration={register('abi')}
          />
          <div {...getRootProps()}>
            <input {...getInputProps()} />
            {isDragActive ? (
              <p>Drop the files here ...</p>
            ) : (
              <p className="text-xs cursor-pointer dark:text-gray-700 hover:text-red-400">
                Drag &rsquo;n&rsquo; drop, or click to select ABI JSON file
              </p>
            )}
          </div>
          <label className="block">
            <button
              type="submit"
              className="w-full p-3 mt-3 text-sm font-bold tracking-wide text-gray-100 uppercase transition duration-500 transform bg-red-500 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 focus:outline-none focus:shadow-outline"
            >
              Load
            </button>
          </label>
        </form>
      </div>
    </AppearTransition>
  );
};
