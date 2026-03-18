import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Bell } from 'lucide-react';
import appConfig from '../config/appConfig';

const Navbar = ({ onMenuClick }) => {
  const location = useLocation();

  const currentPage = appConfig.navigation.find(
    (item) => item.path === location.pathname
  );

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-lg font-semibold text-gray-800">
            {currentPage?.name || 'Investor Alias Manager'}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <button className="relative text-gray-500 hover:text-gray-700 transition-colors">
            <Bell size={20} />
          </button>
          <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-semibold">
            U
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
