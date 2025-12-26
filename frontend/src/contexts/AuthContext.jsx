import { createContext, useContext, useEffect, useState } from "react";
import api from "../api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("token")); // track token

  useEffect(() => {
    if (!token) {
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    const fetchUser = async () => {
      setLoading(true);
      try {
        const res = await api.get("/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCurrentUser(res.data);
      } catch (err) {
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token]); // 🔹 run whenever token changes

  // Expose function to update token after login/logout
  const setAuthToken = (newToken) => {
    if (newToken) localStorage.setItem("token", newToken);
    else localStorage.removeItem("token");
    setToken(newToken); // triggers fetchUser automatically
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, setAuthToken }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
