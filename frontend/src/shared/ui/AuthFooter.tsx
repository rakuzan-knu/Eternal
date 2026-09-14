import React from 'react';
import { Link } from 'react-router-dom';

export const AuthFooter: React.FC = () => {
  const links = [
    { label: 'Privacy Policy', path: '/privacy' },
    { label: 'Terms of Service', path: '/terms' },
    { label: 'Cookies', path: '/terms/cookie-policy' },
    { label: 'About', path: '/company' },
    { label: 'Help', path: '/safety' },
  ];
  return (
    <footer className="w-full text-center py-6 mt-auto select-none">
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-neutral-500 mb-2 px-4">
        {links.map((item) => (
          <Link key={item.label} to={item.path} className="hover:text-purple-300 transition-colors">
            {item.label}
          </Link>
        ))}
      </div>
      <p className="text-xs text-neutral-600">Eternal © 2026</p>
    </footer>
  );
};
