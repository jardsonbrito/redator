
import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-violet-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-redator-primary">404</h1>
        <p className="text-xl text-redator-accent mb-4">Oops! Page not found</p>
        <a href="/" className="text-redator-primary hover:text-redator-accent underline">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
