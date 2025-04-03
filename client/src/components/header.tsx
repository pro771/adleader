import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { CircleDollarSign } from "lucide-react";

export default function Header() {
  const { user, logoutMutation } = useAuth();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <Link href="/">
          <a className="flex items-center">
            <CircleDollarSign className="h-8 w-8 text-primary" />
            <h1 className="ml-2 text-2xl font-bold text-gray-900">AdRewards</h1>
          </a>
        </Link>
        
        {user ? (
          <div className="flex items-center space-x-4">
            <span className="text-gray-700 hidden md:inline-block">
              {user.email}
            </span>
            {/* Admin link - in a real app, this would be shown only to admin users */}
            <Link href="/admin">
              <a className="text-primary hover:text-primary/80 transition-colors font-medium">
                Admin
              </a>
            </Link>
            <Button 
              variant="ghost" 
              onClick={handleLogout} 
              disabled={logoutMutation.isPending}
            >
              Logout
            </Button>
          </div>
        ) : (
          <div>
            <Link href="/auth">
              <a className="text-primary hover:text-primary/80 transition-colors font-medium">
                Login
              </a>
            </Link>
            <Link href="/auth">
              <a className="ml-4 bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded-md transition-colors inline-block">
                Register
              </a>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
