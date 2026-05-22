import './App.css';
import { AppView } from './components/app/AppView';
import { useAetherController } from './hooks/useAetherController';

function App() {
  const appViewProps = useAetherController();
  if (appViewProps?.__aetherView) return appViewProps.__aetherView;
  return <AppView {...appViewProps} />;
}

export default App;
