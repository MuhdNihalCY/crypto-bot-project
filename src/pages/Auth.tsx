import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AuthForm } from '../components/AuthForm';
import { Coins } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

export function Auth() {
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Coins className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          {isLogin ? 'Sign in to your account' : 'Create a new account'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <Link
            to={isLogin ? '/register' : '/login'}
            className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
          >
            {isLogin ? 'Register now' : 'Sign in'}
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <AuthForm type={isLogin ? 'login' : 'register'} />
        </div>
      </div>
    </div>
  );
}