"use client";
import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import OfferDrawer from "./OfferDrawer";
import Toasts from "./Toasts";
import { UIProvider } from "./ui-context";

export default function Shell({ children }) {
  const [navOpen, setNavOpen] = useState(false);
  return (
    <UIProvider>
      <div className="app">
        <Sidebar open={navOpen} />
        <div className="main">
          <Topbar onMenu={() => setNavOpen((v) => !v)} />
          <div className="content">{children}</div>
        </div>
        <OfferDrawer />
        <Toasts />
      </div>
    </UIProvider>
  );
}
