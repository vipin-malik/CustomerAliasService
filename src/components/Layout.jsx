import React from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import TabNav from './TabNav';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-surface-900 flex flex-col">
      <Header />
      <TabNav />
      <main className="flex-1 bg-gradient-to-br from-content-bg/30 to-content-bg-dark/20 p-6">
        {children}
      </main>
    </div>
  );
};

export default Layout;
