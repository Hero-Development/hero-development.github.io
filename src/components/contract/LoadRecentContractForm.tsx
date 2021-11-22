import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { useLocalStorage } from '@/hooks/useLocalStorage';
import { SelectField } from '@/components/common/SelectField';
import { AppearTransition } from '@/components/common/AppearTransition';

export const LoadRecentContractForm = (props: any) => {
  const schema = z.object({
    recent: z.any(),
  });

  const [persistContract] = useLocalStorage([], 'eth-util-contract');

  const { handleSubmit, control } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { recent: persistContract[0] },
  });

  const onSubmit = async (data: any) => {
    props.onSubmit(data.recent);
  };

  return (
    <AppearTransition>
      <div className=" p-6 ">
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-6">
          {persistContract.length ? (
            <SelectField
              label="Recent Contracts"
              name="recent"
              optionLabelKey="address"
              options={persistContract}
              control={control}
            />
          ) : (
            <p className="mt-16 text-center">No Recent contracts</p>
          )}
          {persistContract.length ? (
            <div className="block">
              <button
                type="submit"
                className="w-full p-3 mt-3 text-sm font-bold tracking-wide text-gray-100 uppercase transition duration-500 transform bg-red-500 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 focus:outline-none focus:shadow-outline"
              >
                Load
              </button>
            </div>
          ) : null}
        </form>
      </div>
    </AppearTransition>
  );
};
