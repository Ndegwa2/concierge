
import { useState } from 'react';
import { Menu, X, Car, User, Calendar } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { usePermission } from '@/hooks/usePermission';

interface HeaderProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onLoginClick?: () => void;
  isLoggedIn?: boolean;
}

export function Header({ currentView, onNavigate, onLoginClick, isLoggedIn }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { hasPermission, isLoading } = usePermission();

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => onNavigate('home')}
          >
            <div className="bg-slate-900 p-2 rounded-lg">
              <Car className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl">AutoConcierge</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => onNavigate('home')}
              className={`hover:text-slate-900 transition-colors ${
                currentView === 'home' ? 'text-slate-900 font-medium' : 'text-slate-600'
              }`}
