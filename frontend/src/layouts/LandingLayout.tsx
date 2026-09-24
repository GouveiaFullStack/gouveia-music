import type { ReactNode } from "react";

import LandingFooter from "../components/LandingFooter";
import LandingHeader from "../components/LandingHeader";

type LandingLayoutProps = {
  children: ReactNode;
};

function LandingLayout({ children }: LandingLayoutProps) {
  return (
    <>
      <LandingHeader />

      {children}

      <LandingFooter />
    </>
  );
}

export default LandingLayout;
