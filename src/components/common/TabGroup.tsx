import { Tab } from '@headlessui/react';

export const TabGroup = (props: any) => {
  function classNames(...classes: any) {
    return classes.filter(Boolean).join(' ');
  }

  return (
    <Tab.Group>
      <Tab.List className="flex bg-red-500 ">
        {Object.keys(props.categories).map((category) => (
          <Tab
            key={category}
            className={({ selected }) =>
              classNames(
                'w-full py-3 text-sm leading-5 font-medium  ',
                'focus:outline-none ',
                selected
                  ? 'text-white'
                  : 'text-black dark:text-gray-400 bg-white dark:bg-gray-800 border-b dark:border-gray-700  hover:bg-white/[0.12] hover:text-white'
              )
            }
          >
            {category}
          </Tab>
        ))}
      </Tab.List>
      <Tab.Panels>
        {Object.values(props.categories).map((component: any, idx) => (
          <Tab.Panel key={idx} className={classNames('', 'focus:outline-none ')}>
            {component}
          </Tab.Panel>
        ))}
      </Tab.Panels>
    </Tab.Group>
  );
};
