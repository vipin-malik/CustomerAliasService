import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, Settings, Users } from 'lucide-react';
import appConfig from '../config/appConfig';

const Header = () => {
  return (
    <header className="bg-gradient-to-r from-primary-800 via-primary-700 to-primary-800 h-14 flex items-center justify-between px-6 shadow-lg shadow-primary-900/40">
      <Link to="/" className="text-white text-lg font-bold tracking-wide">
        {appConfig.appName}
      </Link>
      <div className="flex items-center gap-2">
        <button className="text-primary-200 hover:text-white transition-colors" title="Help">
          <HelpCircle size={20} />
        </button>
        <button className="text-primary-200 hover:text-white transition-colors" title="Settings">
          <Settings size={20} />
        </button>
        <button className="text-primary-200 hover:text-white transition-colors" title="Users">
          <Users size={20} />
        </button>
      </div>
    </header>
  );
};

export default Header;
