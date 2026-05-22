import { AppBackdropLayer } from './AppBackdropLayer';
import { AppHeaderLayer } from './AppHeaderLayer';
import { AppPreMainOverlays } from './AppPreMainOverlays';
import { AppCoreLayout } from './AppCoreLayout';
import { AppPostMainOverlays } from './AppPostMainOverlays';
export function AppMainFrame(props) {
  const { desktopTopInsetClass, rootModeClass, auraFieldStyle } = props;
  return <div className={`fixed inset-0 bg-transparent selection:bg-brand-accent selection:text-brand-dark flex flex-col h-screen overflow-hidden relative isolate ${desktopTopInsetClass} ${rootModeClass}`} style={auraFieldStyle}>
        <AppBackdropLayer {...props} />

        <AppHeaderLayer {...props} />





        <AppPreMainOverlays {...props} />


        <AppCoreLayout {...props} />

        <AppPostMainOverlays {...props} />

      </div>;
}
