import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { useEffect, useState } from "react";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Chat from "./pages/Chat";

const API_URL = import.meta.env.VITE_API_URL;

function App() {
  const [users, setUsers] =
    useState([]);

  const [currentUser, setCurrentUser] =
    useState(() => {
      const savedUser =
        localStorage.getItem(
          "pingzone_current_user"
        );

      return savedUser
        ? JSON.parse(savedUser)
        : null;
    });

  // =========================
  // LOAD USERS FROM MONGODB
  // =========================

  useEffect(() => {
    if (!currentUser) {
      setUsers([]);
      return;
    }

    const fetchUsers =
      async () => {
        try {
          const token =
            localStorage.getItem(
              "pingzone_token"
            );

          if (!token) {
            setUsers([]);
            return;
          }

          const response =
            await fetch(`${API_URL}/api/users`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

          if (response.status === 401) {
            logoutUser();
            return;
          }

          if (!response.ok) {
            throw new Error(
              "Failed to fetch users"
            );
          }

          const data =
            await response.json();

          setUsers(data);
        } catch (error) {
          console.error(
            "Failed to load users:",
            error
          );
        }
      };

    fetchUsers();
  }, [currentUser]);

  // =========================
  // LOGIN
  // =========================

  const loginUser = (user) => {
    setCurrentUser(user);

    localStorage.setItem(
      "pingzone_current_user",
      JSON.stringify(user)
    );
  };

  // =========================
  // LOGOUT
  // =========================

  const logoutUser = () => {
    setCurrentUser(null);

    localStorage.removeItem(
      "pingzone_current_user"
    );

    localStorage.removeItem(
      "pingzone_token"
    );

    setUsers([]);
  };

  return (
    <BrowserRouter>
      <Routes>

        {/* Home */}
        <Route
          path="/"
          element={<Home />}
        />

        {/* Register */}
        <Route
          path="/register"
          element={<Register />}
        />

        {/* Login */}
        <Route
          path="/login"
          element={
            <Login
              onLogin={loginUser}
            />
          }
        />

        {/* Protected Chat */}
        <Route
          path="/chat"
          element={
            currentUser &&
            localStorage.getItem(
              "pingzone_token"
            ) ? (
              <Chat
                currentUser={
                  currentUser
                }
                users={users}
                onLogout={
                  logoutUser
                }
              />
            ) : (
              <Navigate
                to="/login"
                replace
              />
            )
          }
        />

        {/* Unknown routes */}
        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;