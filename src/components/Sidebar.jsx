import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Search, Database, X } from 'lucide-react';
import { cls } from '../styles/classes';
import appConfig from '../config/appConfig';

const iconMap = {
  '/': LayoutDashboard,
  '/mappings': Database,
  '/resolve': Search,
};

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <Link to="/" className={`text-xl font-bold ${cls.gradientText}`}>
            {appConfig.shortName}
          </Link>
          <button onClick={onClose} className="lg:hidden text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {appConfig.navigation.map((item) => {
            const Icon = iconMap[item.path] || LayoutDashboard;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 border-r-3 border-primary-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <p className="text-xs text-gray-400 text-center">{appConfig.appName}</p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
