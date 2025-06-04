import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

const useAuth = () => {
  const { user, role, isAuthenticated, status } = useSelector((state) => state.auth);
  const [authLoaded, setAuthLoaded] = useState(false);

  useEffect(() => {
    if (status !== "loading") {
      setAuthLoaded(true);
    }
  }, [status]);

  return { user, role, isAuthenticated, authLoaded };
};

export default useAuth;
