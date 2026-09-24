import { Route, Routes } from "react-router";

import LoginPage from "../pages/auth/LoginPage";
import LandingLayout from "../layouts/LandingLayout";
import RegisterPage from "../pages/auth/RegisterPage";
import LandingPage from "../pages/landing/LandingPage";

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <LandingLayout>
            <LandingPage />
          </LandingLayout>
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
    </Routes>
  );
}

export default AppRoutes;
