import React from 'react';
import { Link } from 'react-router';

export const AuthFooter: React.FC = () => {
  const links = ['Privacy Policy', 'Terms of Service', 'Cookies', 'About', 'Help'];
  return (
    <footer className="w-full text-center py-6 mt-auto">
      <div className="flex justify-center gap-4 text-xs text-neutral-500 mb-2">
        {links.map((item) => (
          <Link key={item} to="#" className="hover:text-neutral-300 transition-colors">
            {item}
          </Link>
        ))}
      </div>
      <p className="text-xs text-neutral-600">Eternal © 2026</p>
    </footer>
  );
};
