export function createSearchAction(props) {
  const {
    API_BASE, axios, commitSearchHistory, handleOfflineLibrarySearch, isMobileSearchOpen, isOfflineMode, isStandalone, searchQuery, setHasCompletedSearch, setIsMobileSearchOpen, setIsSearching, setSearchQuery, setSearchResults
  } = props;
  return async eventOrQuery => {
  if (eventOrQuery?.preventDefault) eventOrQuery.preventDefault();
  const submittedQuery = typeof eventOrQuery === 'string' ? eventOrQuery : searchQuery;
  const normalizedQuery = submittedQuery.trim();
  if (!normalizedQuery) return;
  if (isOfflineMode) {
    handleOfflineLibrarySearch(normalizedQuery);
    return;
  }
  commitSearchHistory('online', normalizedQuery);
  setSearchQuery(normalizedQuery);
  setIsSearching(true);
  setHasCompletedSearch(true);
  try {
    if (isStandalone) {
      const results = await window.aether.search(normalizedQuery);
      setSearchResults(Array.isArray(results) ? results : []);
    } else {
      const resp = await axios.get(`${API_BASE}/api/search?q=${encodeURIComponent(normalizedQuery)}`);
      setSearchResults(Array.isArray(resp.data) ? resp.data : []);
    }
    if (isMobileSearchOpen) setIsMobileSearchOpen(false);
  } catch (err) {
    console.error("[Search] Failed:", err);
    if (isStandalone) {
      alert(`NEURAL SYSTEM ERROR\n- Message: ${err.message}\n- Status: Binary pathing issue or process blocked.\n- Try: Restarting Aether from Applications.`);
    }
  } finally {
    setIsSearching(false);
  }
};
}
