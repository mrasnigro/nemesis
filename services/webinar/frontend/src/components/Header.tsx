import React, { useState } from 'react';

export const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Início', href: '#hero' },
    { label: 'Recursos', href: '#features' },
    { label: 'Preços', href: '#pricing' },
    { label: 'Contato', href: '#contact' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50">
      <div className="container flex items-center justify-between h-[70px] px-4 md:px-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">S1</span>
          </div>
          <span className="hidden sm:inline font-bold text-lg text-text">S1m0ne</span>
        </div>

        {/* Navigation - Desktop */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-text hover:text-primary transition-colors text-sm font-medium"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Buttons */}
        <div className="flex items-center gap-2 md:gap-4">
          <a
            href="/login"
            className="hidden sm:block px-4 py-2 text-primary border-2 border-primary rounded-lg font-semibold hover:bg-blue-50 transition-colors text-sm"
          >
            Entrar
          </a>
          <a
            href="/register"
            className="px-4 py-2 md:px-6 md:py-3 bg-primary text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm md:text-base"
          >
            Cadastre-se
          </a>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 hover:bg-light rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <nav className="md:hidden bg-white border-t border-border">
          <div className="container px-4 py-4 flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-text hover:text-primary transition-colors font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <a
              href="/login"
              className="px-4 py-2 text-primary border-2 border-primary rounded-lg font-semibold hover:bg-blue-50 transition-colors text-center"
            >
              Entrar
            </a>
          </div>
        </nav>
      )}
    </header>
  );
};
