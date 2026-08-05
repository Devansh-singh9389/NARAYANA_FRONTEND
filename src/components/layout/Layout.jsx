import React from 'react';

const Layout = ({ children }) => {
  return (
    // We remove the hardcoded navbar. 
    // Pages now handle their own headers (like your pf-header).
    <div className="app-root">
      {children}
    </div>
  );
};

export default Layout;