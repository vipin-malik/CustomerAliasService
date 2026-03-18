import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import appConfig from '../config/appConfig';

const TabNav = () => {
  const location = useLocation();

  return (
    <nav className="bg-surface-900 border-b border-surface-500/30 px-6">
      <div className="flex items-center gap-1">
        {appConfig.navigation.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`px-5 py-3 text-sm font-medium transition-all duration-200 border-b-2 ${
                isActive
                  ? 'text-primary-300 border-primary-400'
                  : 'text-gray-400 border-transparent hover:text-gray-200 hover:border-gray-500'
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default TabNav;
