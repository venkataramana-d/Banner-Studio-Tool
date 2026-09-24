"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [site, setSite] = useState("invensis");
  const [country, setCountry] = useState("ALL");
  const [theme, setTheme] = useState("light");
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState({ open: false, offer: null });
  const [version, setVersion] = useState(0); // bump to refresh data-driven pages

  useEffect(() => {
    try {
      const t = localStorage.getItem("bs_theme");
      if (t) { setTheme(t); document.documentElement.setAttribute("data-theme", t); }
      const s = localStorage.getItem("bs_site"); if (s) setSite(s);
      const q = sessionStorage.getItem("bs_search"); if (q) setSearch(q);
    } catch {}
  }, []);

  // keep the search query across reloads / hard navigations
  useEffect(() => {
    try { sessionStorage.setItem("bs_search", search); } catch {}
  }, [search]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try { localStorage.setItem("bs_theme", next); } catch {}
      document.documentElement.setAttribute("data-theme", next);
      return next;
    });
  }, []);

  const changeSite = useCallback((s) => {
    setSite(s); try { localStorage.setItem("bs_site", s); } catch {}
  }, []);

  const openDrawer = useCallback((offer = null) => setDrawer({ open: true, offer }), []);
  const closeDrawer = useCallback(() => setDrawer({ open: false, offer: null }), []);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  return (
    <UIContext.Provider value={{ site, changeSite, country, setCountry, search, setSearch, theme, toggleTheme, drawer, openDrawer, closeDrawer, version, refresh }}>
      {children}
    </UIContext.Provider>
  );
}

export const useUI = () => useContext(UIContext);
