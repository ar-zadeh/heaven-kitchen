// Tabs.js
import React, { useState } from 'react';
import { Tab } from '@headlessui/react';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

const Tabs = ({ tabTitles, children }) => {
  return (
    <Tab.Group>
      <Tab.List className="flex space-x-1 bg-blue-900/20 p-1">
        {tabTitles.map((title, index) => (
          <Tab
            key={index}
            className={({ selected }) =>
              classNames(
                'w-full py-2.5 text-sm leading-5 font-medium text-blue-700 rounded-lg',
                'focus:outline-none focus:ring-2 ring-offset-2 ring-offset-blue-400 ring-white ring-opacity-60',
                selected
                  ? 'bg-white shadow'
                  : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
              )
            }
          >
            {title}
          </Tab>
        ))}
      </Tab.List>
      <Tab.Panels>
        {children}
      </Tab.Panels>
    </Tab.Group>
  );
};

export default Tabs;
